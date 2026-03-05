/* =============================================================================
   capacityMonthsController.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Returns the list of available YYYYMM months for the Capacity Summary
     dashboard month selector. Merges months from both the allocation and
     capacity collections, deduplicates, and filters to the last 12 months.

   SECURITY MODEL:
     • No user input is used in any DB query — both distinct() calls read
       directly from collections, eliminating injection risk entirely.
     • All values returned from distinct() are coerced to Number() and
       filtered with isNaN() before any further processing — prevents malformed
       or non-numeric DB values from propagating into the response.
     • Results are filtered to the last 12 months server-side — limits data
       exposure to only what the UI requires and protects performance on large
       collections.
     • All YYYYMM values are validated before being passed to formatMonthLabel()
       — malformed values cannot reach the frontend or UI labels.
     • Generic error message on failure — full error is logged server-side only,
       preventing DB structure or collection names from leaking to the client.
     • This is a read-only endpoint — no writes or mutations are performed.

   DEPENDENCIES:
     • ../config/db.js — MongoDB connection singleton
   ============================================================================= */

import { connectDB } from "../config/db.js";

/* -----------------------------------------------------------------------------
   UTILITY: formatMonthLabel
   -----------------------------------------------------------------------------
   Converts a YYYYMM integer into a short human-readable label for display
   in the Capacity Summary month selector (e.g. 202503 → "Mar-25").

   PARAM:  yyyymm {number|string} — Month value in YYYYMM format
   RETURN: {string}               — Formatted label e.g. "Mar-25"

   SECURITY:
   • Pure formatting helper — no user input is passed directly to this function.
   • Only called after YYYYMM values have been validated as numeric integers.
   • Prevents malformed month strings from being surfaced in UI labels.
----------------------------------------------------------------------------- */
function formatMonthLabel(yyyymm) {
  const s = String(yyyymm);
  const year = Number(s.slice(0, 4));
  const month = Number(s.slice(4, 6));

  // Construct a Date from year and month to leverage locale-aware formatting
  const date = new Date(year, month - 1, 1);
  const shortMonth = date.toLocaleString("en-US", { month: "short" });
  const shortYear = String(year).slice(2); // Two-digit year e.g. "25"

  return `${shortMonth}-${shortYear}`; // e.g. "Mar-25"
}

/* -----------------------------------------------------------------------------
   HANDLER: getCapacityMonths
   GET /api/capacity-summary/months
   -----------------------------------------------------------------------------
   Returns all available YYYYMM months for the Capacity Summary dashboard by
   merging distinct dates from both the allocation and capacity collections.
   Results are deduplicated, sorted ascending, and filtered to the last 12
   months before being returned as formatted dropdown options.

   RESPONSE:
     {
       months: [{ label: "Mar-25", value: 202503 }, ...]
     }

   SECURITY:
   • No user input is used in any DB query — injection risk is eliminated.
   • All distinct() values are coerced to Number() and NaN values filtered
     out before processing — malformed DB data cannot break the response.
   • Filtered to last 12 months — prevents excessive historical data exposure
     and protects performance on large collections.
   • All values are validated numeric YYYYMM before formatMonthLabel() is
     called — no malformed values can reach UI labels.
   • Generic error message on failure — DB internals never exposed to client.
----------------------------------------------------------------------------- */
export const getCapacityMonths = async (req, res) => {
  try {
    const db = await connectDB();

    const allocationCol = db.collection("allocation");
    const capacityCol = db.collection("capacity");

    // Retrieve distinct date values from both collections
    // No user input involved — safe from injection by design
    let allocMonths = await allocationCol.distinct("date");
    let capMonths = await capacityCol.distinct("date");

    // Coerce all values to Number and strip any NaN entries
    // Protects against malformed or non-numeric values in the DB
    allocMonths = allocMonths.map((m) => Number(m)).filter((m) => !isNaN(m));
    capMonths = capMonths.map((m) => Number(m)).filter((m) => !isNaN(m));

    // Merge and deduplicate months from both collections using a Set
    let allMonths = Array.from(new Set([...allocMonths, ...capMonths]));

    // Sort ascending so the dropdown displays months in chronological order
    allMonths.sort((a, b) => a - b);

    // Filter to last 12 months — limits data exposure to what the UI needs
    // and prevents performance issues on collections with long history
    const today = new Date();
    const currentYYYYMM = today.getFullYear() * 100 + (today.getMonth() + 1);
    const oneYearAgo = currentYYYYMM - 100; // Subtract 100 to go back 1 year in YYYYMM format

    allMonths = allMonths.filter(
      (m) => m >= oneYearAgo && m <= currentYYYYMM
    );

    // Format each validated YYYYMM value into a dropdown-ready { label, value } object
    const formatted = allMonths.map((m) => ({
      label: formatMonthLabel(m), // Human-readable label e.g. "Mar-25"
      value: m                    // Raw YYYYMM integer for use in subsequent API calls
    }));

    return res.json({ months: formatted });

  } catch (err) {
    // Log full error server-side — generic message returned to client to
    // prevent DB structure or collection names from leaking in error responses
    console.error("Error in /capacity-summary/months:", err);
    return res.status(500).json({
      error: "Failed to load months"
    });
  }
};