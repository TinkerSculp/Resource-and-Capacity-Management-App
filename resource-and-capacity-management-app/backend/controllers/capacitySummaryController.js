/* =============================================================================
   capacitySummaryController.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Returns aggregated capacity summary data for the Capacity Summary dashboard.
     Merges allocation totals by category with total people capacity across a
     configurable month window, producing the data needed for charts and tables.

   HOW IT WORKS:
     1. Parse optional ?start= and ?months= query parameters
     2. If no start month is provided, detect the most recent month with data
     3. Build a target month window using computeMonthWindow()
     4. Aggregate allocations by category + month from the allocation collection
     5. Aggregate total people capacity by month from the capacity collection
     6. Merge both datasets and return a structured response

   YYYYMM FORMAT:
     Dates are stored as integers in YYYYMM format (e.g. 202503 = March 2025).
     Arithmetic on this format is straightforward: adding 1 moves to the next
     month (with year rollover at month 13), and subtracting 100 moves back
     exactly one year. computeMonthWindow() handles month rollover explicitly.

   SECURITY MODEL:
     • Query parameters are parsed with parseInt() — non-numeric values produce
       NaN which falls back to safe defaults, never reaching the DB.
     • Aggregation pipelines use strict { $in: targetMonths } numeric matching —
       no user input is interpolated into $where or dynamic operators.
     • The start month fallback uses only values read from the DB — no user
       input is used if the query param is absent.
     • Category normalisation is performed server-side — raw DB category strings
       are mapped to known labels before being returned, preventing unexpected
       values from reaching the frontend.
     • Defensive defaults (0 via ?? operator) ensure no undefined values appear
       in numeric calculations or the response.
     • Only aggregated, display-safe values are returned — no raw DB documents,
       employee-level data, or internal fields are exposed.
     • Generic error message on failure — full error is logged server-side only.
     • This is a read-only endpoint — no writes or mutations are performed.

   DEPENDENCIES:
     • ../config/db.js — MongoDB connection singleton
   ============================================================================= */

import { connectDB } from "../config/db.js";

/* =============================================================================
   UTILITY: formatMonthLabel
   -----------------------------------------------------------------------------
   Converts a YYYYMM integer into a short human-readable label for display
   in the Capacity Summary dashboard (e.g. 202503 → "Mar-25").

   Exported so reportsController.js and other modules can use the same
   formatting logic without duplicating it.

   PARAM:  yyyymm {number|string} — Month value in YYYYMM format
   RETURNS: {string}              — Formatted label e.g. "Mar-25"
   ============================================================================= */
export function formatMonthLabel(yyyymm) {
  const s          = String(yyyymm);
  const year       = Number(s.slice(0, 4));
  const month      = Number(s.slice(4, 6));
  const date       = new Date(year, month - 1, 1); // month - 1: JS months are 0-indexed
  const shortMonth = date.toLocaleString("en-US", { month: "short" });
  const shortYear  = String(year).slice(2);         // Two-digit year e.g. "25"
  return `${shortMonth}-${shortYear}`;
}

/* =============================================================================
   UTILITY: computeMonthWindow
   -----------------------------------------------------------------------------
   Generates an ordered array of YYYYMM integers starting from a given month
   and spanning a given count. Handles month and year rollovers correctly so
   that invalid YYYYMM values like 202513 are never produced.

   Example: computeMonthWindow(202511, 3) → [202511, 202512, 202601]

   PARAM:  startYYYYMM {number} — Starting month in YYYYMM format e.g. 202501
   PARAM:  count       {number} — Number of months to include in the window
   RETURNS: {number[]}          — Array of YYYYMM integers
   ============================================================================= */
export function computeMonthWindow(startYYYYMM, count) {
  const months = [];
  let year  = Math.floor(startYYYYMM / 100); // Extract the 4-digit year
  let month = startYYYYMM % 100;             // Extract the 2-digit month

  for (let i = 0; i < count; i++) {
    months.push(year * 100 + month);
    month++;

    // Handle year rollover — month 13 is invalid, reset to January next year
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return months;
}

/* =============================================================================
   HANDLER: getCapacitySummary
   GET /api/capacity-summary
   -----------------------------------------------------------------------------
   Returns aggregated capacity and allocation data for a configurable month
   window. Used by the Capacity Summary dashboard to render charts and tables
   showing allocation totals by category vs total people capacity.

   QUERY PARAMETERS:
     ?start=<YYYYMM>   — Optional: start month for the window. Defaults to the
                          most recent month with data in either collection.
     ?months=<number>  — Optional: number of months in the window. Defaults to 6.

   RESPONSE:
     {
       months:            ["Jan-25", "Feb-25", ...],
       categories: [
         { label: "Vacation",    values: [n, n, ...] },
         { label: "Baseline",    values: [n, n, ...] },
         { label: "Strategic",   values: [n, n, ...] },
         { label: "Discretionary Project / Enhancement", values: [n, n, ...] }
       ],
       totals:            [n, n, ...],  — Total allocated per month
       peopleCapacity:    [n, n, ...],  — Total capacity across all employees
       remainingCapacity: [n, n, ...]   — peopleCapacity - totals
     }
   ============================================================================= */
export const getCapacitySummary = async (req, res) => {
  try {
    const db = await connectDB();

    /* -------------------------------------------------------------------------
       PARSE QUERY PARAMETERS
       parseInt() ensures only numeric values reach the DB — non-numeric input
       produces NaN, caught by the conditional fallback logic below.
    --------------------------------------------------------------------------- */
    const startMonth   = req.query.start  ? parseInt(req.query.start,  10) : null;
    const monthsWindow = req.query.months ? parseInt(req.query.months, 10) : 6; // Default: 6 months

    const allocationCol = db.collection("allocation");
    const capacityCol   = db.collection("capacity");

    /* -------------------------------------------------------------------------
       DETECT START MONTH (FALLBACK)
       If no valid start month was provided, find the most recent month with
       data in either collection. Future months are excluded — we only want
       to default to past or current data.
    --------------------------------------------------------------------------- */
    let start = startMonth;

    if (!start) {
      // Merge distinct months from both collections to find the most recent
      const [allMonths, allocMonths] = await Promise.all([
        capacityCol.distinct("date"),
        allocationCol.distinct("date"),
      ]);

      const combined = Array.from(new Set([...allMonths, ...allocMonths]));
      combined.sort((a, b) => a - b); // Sort ascending for predictable selection

      // Exclude future months — only default to past or current data
      const today         = new Date();
      const currentYYYYMM = today.getFullYear() * 100 + (today.getMonth() + 1);
      const valid         = combined.filter(m => m <= currentYYYYMM);

      // Use the most recent valid month, or fall back to current month if no data exists
      start = valid.length > 0 ? valid[valid.length - 1] : currentYYYYMM;
    }

    // Build the target month array — computeMonthWindow handles year rollovers
    const targetMonths = computeMonthWindow(start, monthsWindow);

    /* -------------------------------------------------------------------------
       AGGREGATE ALLOCATIONS BY CATEGORY + MONTH
       Two-stage grouping: first group by category+month to get per-category
       totals, then re-group by month alone to get all categories together.
       This avoids multiple pipeline passes and is more efficient on large datasets.
       $in uses the pre-validated targetMonths array — no injection risk.
    --------------------------------------------------------------------------- */
    const allocationAgg = await allocationCol.aggregate([
      { $match: { date: { $in: targetMonths } } }, // Scope to target window only
      {
        $group: {
          _id:   { category: "$category", date: "$date" },
          total: { $sum: "$amount" } // Sum all FTE amounts per category per month
        }
      },
      {
        $group: {
          _id:        "$_id.date",
          categories: {
            $push: { category: "$_id.category", total: "$total" }
          }
        }
      }
    ]).toArray();

    /* -------------------------------------------------------------------------
       AGGREGATE TOTAL PEOPLE CAPACITY BY MONTH
       Returns a single total per month across all employees — individual
       employee capacity values are not included to avoid exposing personal data.
    --------------------------------------------------------------------------- */
    const capacityAgg = await capacityCol.aggregate([
      { $match: { date: { $in: targetMonths } } }, // Scope to target window only
      {
        $group: {
          _id:                "$date",
          totalPeopleCapacity: { $sum: "$amount" } // Sum across all employees for this month
        }
      }
    ]).toArray();

    // Build a Map for O(1) capacity lookup during the merge step below
    const capacityMap = new Map();
    capacityAgg.forEach(row => capacityMap.set(row._id, row.totalPeopleCapacity));

    /* -------------------------------------------------------------------------
       MERGE ALLOCATION + CAPACITY RESULTS
       For each month in the target window, combine allocation category totals
       with the total people capacity. Category labels from the DB are normalised
       to known display values — raw strings are never passed to the frontend.

       CATEGORY NORMALISATION:
         Partial string matching (includes) handles slight variations in category
         names that may exist in older DB records (e.g. "Discretionary" vs the
         full label). Unknown categories are discarded rather than surfaced.
    --------------------------------------------------------------------------- */
    const merged = [];

    for (const month of targetMonths) {
      const allocRow = allocationAgg.find(r => r._id === month);

      // Pre-initialise all known category totals to 0 — defensive default
      // ensures no undefined values appear in numeric calculations
      const catTotals = {
        "Vacation":    0,
        "Baseline":    0,
        "Strategic":   0,
        "Discretionary Project / Enhancement": 0
      };

      if (allocRow) {
        for (const c of allocRow.categories) {
          // Normalise raw DB category string to the canonical display label
          let label = c.category;
          if (label.includes("Vacation"))      label = "Vacation";
          if (label.includes("Baseline"))      label = "Baseline";
          if (label.includes("Strategic"))     label = "Strategic";
          if (label.includes("Discretionary")) label = "Discretionary Project / Enhancement";

          // Only accumulate known categories — unknown values are silently discarded
          if (catTotals[label] !== undefined) {
            catTotals[label] += c.total;
          }
        }
      }

      // Sum all category totals for the overall monthly allocation figure
      const totalAllocated =
        catTotals["Vacation"] +
        catTotals["Baseline"] +
        catTotals["Strategic"] +
        catTotals["Discretionary Project / Enhancement"];

      // ?? 0 provides a safe numeric default if this month has no capacity records
      const totalPeopleCapacity = capacityMap.get(month) ?? 0;

      merged.push({
        date:                month,
        categories:          catTotals,
        totalAllocated,
        totalPeopleCapacity,
        remainingCapacity:   totalPeopleCapacity - totalAllocated
      });
    }

    /* -------------------------------------------------------------------------
       FORMAT AND RETURN RESPONSE
       Only aggregated totals are returned — no raw DB documents, individual
       employee data, or internal fields are included.
    --------------------------------------------------------------------------- */
    return res.json({
      months:            merged.map(m => formatMonthLabel(m.date)),
      categories: [
        { label: "Vacation",    values: merged.map(m => m.categories["Vacation"]) },
        { label: "Baseline",    values: merged.map(m => m.categories["Baseline"]) },
        { label: "Strategic",   values: merged.map(m => m.categories["Strategic"]) },
        {
          label:  "Discretionary Project / Enhancement",
          values: merged.map(m => m.categories["Discretionary Project / Enhancement"])
        }
      ],
      totals:            merged.map(m => m.totalAllocated),
      peopleCapacity:    merged.map(m => m.totalPeopleCapacity),
      remainingCapacity: merged.map(m => m.remainingCapacity)
    });

  } catch (err) {
    console.error("Error in capacity-summary:", err);
    return res.status(500).json({ error: "Failed to load capacity summary" });
  }
};
