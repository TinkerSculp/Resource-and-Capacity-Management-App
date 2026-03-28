/* =============================================================================
   capacityMonthsController.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Returns the list of available YYYYMM months for the Capacity Summary
     dashboard month selector. Merges months from both the allocation and
     capacity collections, deduplicates, and filters to the last 12 months.

   WHY TWO COLLECTIONS:
     Allocation records and capacity records are stored separately and may not
     always cover the same months — a month can have capacity data without
     allocations (e.g. a new hire with no projects yet) or allocations without
     capacity records. Merging both ensures the selector shows every month
     that has any relevant data.

   SECURITY MODEL:
     • No user input is used in any DB query — both distinct() calls read
       directly from collections, eliminating injection risk entirely.
     • All values returned from distinct() are coerced to Number() and filtered
       with isNaN() before any further processing — prevents malformed or
       non-numeric DB values from propagating into the response.
     • Results are filtered to the last 12 months server-side — limits data
       exposure to what the UI requires and protects performance on large collections.
     • formatMonthLabel() is only called after values are validated as numeric —
       malformed values cannot reach the frontend or UI labels.
     • Generic error message on failure — full error is logged server-side only,
       preventing DB structure or collection names from leaking to the client.
     • This is a read-only endpoint — no writes or mutations are performed.

   DEPENDENCIES:
     • ../config/db.js — MongoDB connection singleton
   ============================================================================= */

import { connectDB } from "../config/db.js";

/* =============================================================================
   UTILITY: formatMonthLabel
   -----------------------------------------------------------------------------
   Converts a YYYYMM integer into a short human-readable label for display
   in the Capacity Summary month selector (e.g. 202503 → "Mar-25").

   Uses the JavaScript Date constructor with month - 1 for correct month
   indexing (JS months are 0-indexed). toLocaleString with en-US ensures
   consistent short month names regardless of the server's system locale.

   Only called after YYYYMM values have been validated as numeric integers,
   so malformed values cannot reach the UI label.

   PARAM:  yyyymm {number|string} — Month value in YYYYMM format
   RETURNS: {string}              — Formatted label e.g. "Mar-25"
   ============================================================================= */
function formatMonthLabel(yyyymm) {
  const s          = String(yyyymm);
  const year       = Number(s.slice(0, 4));
  const month      = Number(s.slice(4, 6));
  const date       = new Date(year, month - 1, 1); // month - 1: JS months are 0-indexed
  const shortMonth = date.toLocaleString("en-US", { month: "short" });
  const shortYear  = String(year).slice(2);         // Two-digit year e.g. "25"
  return `${shortMonth}-${shortYear}`;
}

/* =============================================================================
   HANDLER: getCapacityMonths
   GET /api/capacity-summary/months
   -----------------------------------------------------------------------------
   Returns all available YYYYMM months for the Capacity Summary dashboard by
   merging distinct dates from both the allocation and capacity collections.
   Results are deduplicated, sorted ascending, and filtered to the last 12
   months before being returned as formatted dropdown options.

   RESPONSE:
     { months: [{ label: "Mar-25", value: 202503 }, ...] }

   WHY FILTER TO 12 MONTHS:
     The Capacity Summary dashboard is designed for current planning — showing
     more than 12 months of history adds noise without value. It also protects
     performance on large collections where distinct() could return many values.

   YYYYMM ARITHMETIC:
     Subtracting 100 from a YYYYMM integer moves back exactly one year
     (e.g. 202503 - 100 = 202403). This works because years are in the hundreds
     column of the YYYYMM format.
   ============================================================================= */
export const getCapacityMonths = async (req, res) => {
  try {
    const db = await connectDB();

    // Retrieve distinct date values from both collections in parallel
    // No user input is involved in either query — safe from injection by design
    let [allocMonths, capMonths] = await Promise.all([
      db.collection("allocation").distinct("date"),
      db.collection("capacity").distinct("date"),
    ]);

    // Coerce all values to Number and strip any NaN entries — protects against
    // malformed or non-numeric values stored in the DB
    allocMonths = allocMonths.map(m => Number(m)).filter(m => !isNaN(m));
    capMonths   = capMonths.map(m => Number(m)).filter(m => !isNaN(m));

    // Merge and deduplicate using a Set — preserves one entry per unique month
    let allMonths = Array.from(new Set([...allocMonths, ...capMonths]));

    // Sort ascending so the dropdown displays months in chronological order
    allMonths.sort((a, b) => a - b);

    /* -------------------------------------------------------------------------
       FILTER TO LAST 12 MONTHS
       YYYYMM arithmetic: subtracting 100 moves back exactly one year
       e.g. 202503 - 100 = 202403 (March 2024)
    --------------------------------------------------------------------------- */
    const today         = new Date();
    const currentYYYYMM = today.getFullYear() * 100 + (today.getMonth() + 1);
    const oneYearAgo    = currentYYYYMM - 100; // One year back in YYYYMM format

    allMonths = allMonths.filter(m => m >= oneYearAgo && m <= currentYYYYMM);

    // Format each validated YYYYMM value into a dropdown-ready { label, value } object
    const formatted = allMonths.map(m => ({
      label: formatMonthLabel(m), // Human-readable e.g. "Mar-25"
      value: m                    // Raw YYYYMM integer for subsequent API calls
    }));

    return res.json({ months: formatted });

  } catch (err) {
    // Log full error server-side only — generic message prevents DB internals leaking
    console.error("Error in /capacity-summary/months:", err);
    return res.status(500).json({ error: "Failed to load months" });
  }
};
