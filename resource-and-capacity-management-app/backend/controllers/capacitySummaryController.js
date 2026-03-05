// /* =============================================================================
//    capacitySummaryController.js
//    -----------------------------------------------------------------------------
//    PURPOSE:
//      Returns aggregated capacity summary data for the Capacity Summary dashboard.
//      Merges allocation totals by category with total people capacity across a
//      configurable month window, producing the data needed for charts and tables.

//    HOW IT WORKS:
//      1. Reads optional ?start= and ?months= query parameters
//      2. If no start month is provided, detects the most recent month with data
//      3. Builds a target month window using computeMonthWindow()
//      4. Aggregates allocations by category and month from the allocation collection
//      5. Aggregates total people capacity by month from the capacity collection
//      6. Merges both datasets and returns a structured response

//    SECURITY MODEL:
//      • Query parameters are parsed with parseInt() before any use — non-numeric
//        values produce NaN which falls back to safe defaults, never reaching the DB.
//      • Aggregation pipelines use strict { $in: targetMonths } numeric matching —
//        no user input is interpolated into $where or dynamic operators.
//      • The start month fallback uses only values read from the DB — no user input
//        is used if the query param is absent.
//      • Category normalisation is performed server-side — raw DB category strings
//        are mapped to known labels before being returned, preventing unexpected
//        values from reaching the frontend.
//      • Defensive defaults (0 via ?? operator) ensure no undefined values appear
//        in numeric calculations or the response.
//      • Only aggregated, display-safe values are returned — no raw DB documents,
//        employee-level data, or internal fields are exposed.
//      • Generic error message on failure — full error is logged server-side only.
//      • This is a read-only endpoint — no writes or mutations are performed.

//    DEPENDENCIES:
//      • ../config/db.js — MongoDB connection singleton
//    ============================================================================= */

// import { connectDB } from "../config/db.js";

// /* -----------------------------------------------------------------------------
//    UTILITY: formatMonthLabel
//    -----------------------------------------------------------------------------
//    Converts a YYYYMM integer into a short human-readable label for display
//    in the Capacity Summary dashboard (e.g. 202503 → "Mar-25").

//    PARAM:  yyyymm {number|string} — Month value in YYYYMM format
//    RETURN: {string}               — Formatted label e.g. "Mar-25"

//    SECURITY:
//    • Pure formatting helper — no user input is passed directly to this function.
//    • Only called after YYYYMM values have been validated as numeric integers.
//    • Prevents malformed month strings from being surfaced in UI labels.
// ----------------------------------------------------------------------------- */
// function formatMonthLabel(yyyymm) {
//   const s = String(yyyymm);
//   const year = Number(s.slice(0, 4));
//   const month = Number(s.slice(4, 6));

//   // Construct a Date from year and month to leverage locale-aware formatting
//   const date = new Date(year, month - 1, 1);
//   const shortMonth = date.toLocaleString("en-US", { month: "short" });
//   const shortYear = String(year).slice(2); // Two-digit year e.g. "25"

//   return `${shortMonth}-${shortYear}`; // e.g. "Mar-25"
// }

// /* -----------------------------------------------------------------------------
//    UTILITY: computeMonthWindow
//    -----------------------------------------------------------------------------
//    Generates an ordered array of YYYYMM integers starting from a given month
//    and spanning a given count. Handles month and year rollovers correctly.

//    PARAM:  startYYYYMM {number} — Starting month in YYYYMM format e.g. 202501
//    PARAM:  count       {number} — Number of months to include
//    RETURN: {number[]}           — Array of YYYYMM integers e.g. [202501, 202502, ...]

//    SECURITY:
//    • Generates a fully predictable sequence from a validated numeric start value.
//    • Month rollover (month > 12 → reset to 1, increment year) is handled
//      explicitly, preventing invalid YYYYMM values like 202513 from being produced.
//    • No external input is used beyond the already-validated startYYYYMM integer.
// ----------------------------------------------------------------------------- */
// function computeMonthWindow(startYYYYMM, count) {
//   const months = [];
//   let year = Math.floor(startYYYYMM / 100);
//   let month = startYYYYMM % 100;

//   for (let i = 0; i < count; i++) {
//     months.push(year * 100 + month);
//     month++;

//     // Handle year rollover — prevents invalid month values like 202513
//     if (month > 12) {
//       month = 1;
//       year++;
//     }
//   }

//   return months;
// }

// /* -----------------------------------------------------------------------------
//    HANDLER: getCapacitySummary
//    GET /api/capacity-summary
//    -----------------------------------------------------------------------------
//    Returns aggregated capacity and allocation data for a configurable month
//    window. Used by the Capacity Summary dashboard to render charts and tables
//    showing allocation totals by category vs total people capacity.

//    QUERY PARAMETERS:
//      ?start=<YYYYMM>   — Optional: start month for the window (defaults to most
//                           recent month with data)
//      ?months=<number>  — Optional: number of months in the window (defaults to 6)

//    RESPONSE:
//      {
//        months:            ["Jan-25", "Feb-25", ...],  — Formatted month labels
//        categories: [
//          { label: "Vacation",    values: [n, n, ...] },
//          { label: "Baseline",    values: [n, n, ...] },
//          { label: "Strategic",   values: [n, n, ...] },
//          { label: "Discretionary Project / Enhancement", values: [n, n, ...] }
//        ],
//        totals:            [n, n, ...],  — Total allocated per month
//        peopleCapacity:    [n, n, ...],  — Total people capacity per month
//        remainingCapacity: [n, n, ...]   — peopleCapacity - totalAllocated
//      }

//    SECURITY:
//    • Query params are parsed with parseInt() — NaN values fall back to safe
//      defaults and never reach DB queries.
//    • Aggregation pipelines use strict numeric $in matching — no injection risk.
//    • Category labels are normalised server-side — raw DB strings are mapped to
//      known labels before being returned to the frontend.
//    • Only aggregated totals are returned — no employee-level data is exposed.
//    • Generic error message on failure — DB internals never exposed to client.
// ----------------------------------------------------------------------------- */
// export const getCapacitySummary = async (req, res) => {
//   try {
//     const db = await connectDB();

//     // -------------------------------------------------------------------------
//     // PARSE QUERY PARAMETERS
//     // -------------------------------------------------------------------------
//     // parseInt() ensures only numeric values are used — non-numeric input
//     // produces NaN which is caught by the conditional fallback logic below.
//     const startParam = req.query.start;
//     const monthsParam = req.query.months;

//     const startMonth = startParam ? parseInt(startParam, 10) : null;
//     const monthsWindow = monthsParam ? parseInt(monthsParam, 10) : 6; // Default: 6-month window

//     const allocationCol = db.collection("allocation");
//     const capacityCol = db.collection("capacity");

//     // -------------------------------------------------------------------------
//     // DETECT START MONTH (FALLBACK)
//     // -------------------------------------------------------------------------
//     // If no valid start month was provided, find the most recent month that
//     // has data in either collection. Only past or current months are considered —
//     // future months are excluded to avoid exposing forward planning data.
//     let start = startMonth;

//     if (!start) {
//       // Retrieve distinct months from both collections and merge them
//       const allMonths = await capacityCol.distinct("date");
//       const allocMonths = await allocationCol.distinct("date");

//       const combined = Array.from(new Set([...allMonths, ...allocMonths]));
//       combined.sort((a, b) => a - b); // Sort ascending for predictable selection

//       // Filter out any future months — only use past and current data
//       const today = new Date();
//       const currentYYYYMM = today.getFullYear() * 100 + (today.getMonth() + 1);

//       const valid = combined.filter((m) => m <= currentYYYYMM);

//       // Use the most recent valid month, or fall back to current month if no data
//       start = valid.length > 0 ? valid[valid.length - 1] : currentYYYYMM;
//     }

//     // Build the target month array — handles year rollovers correctly
//     const targetMonths = computeMonthWindow(start, monthsWindow);

//     // -------------------------------------------------------------------------
//     // AGGREGATE ALLOCATIONS BY CATEGORY + MONTH
//     // -------------------------------------------------------------------------
//     // Pipeline groups allocation amounts by category and month, producing
//     // a per-month breakdown of how much was allocated to each category.
//     // $in uses the validated targetMonths array — no injection risk.
//     const allocationAgg = await allocationCol
//       .aggregate([
//         { $match: { date: { $in: targetMonths } } }, // Scope to target window
//         {
//           $group: {
//             _id: { category: "$category", date: "$date" },
//             total: { $sum: "$amount" } // Sum all allocation amounts per category/month
//           }
//         },
//         {
//           $group: {
//             _id: "$_id.date",
//             categories: {
//               $push: {
//                 category: "$_id.category",
//                 total: "$total"
//               }
//             }
//           }
//         }
//       ])
//       .toArray();

//     // -------------------------------------------------------------------------
//     // AGGREGATE TOTAL PEOPLE CAPACITY BY MONTH
//     // -------------------------------------------------------------------------
//     // Sums all capacity records per month — returns a single total per month,
//     // not individual employee capacity values, to avoid exposing personal data.
//     const capacityAgg = await capacityCol
//       .aggregate([
//         { $match: { date: { $in: targetMonths } } }, // Scope to target window
//         {
//           $group: {
//             _id: "$date",
//             totalPeopleCapacity: { $sum: "$amount" } // Total capacity across all employees
//           }
//         }
//       ])
//       .toArray();

//     // Build a Map for O(1) capacity lookup by month during the merge step
//     const capacityMap = new Map();
//     for (const row of capacityAgg) {
//       capacityMap.set(row._id, row.totalPeopleCapacity);
//     }

//     // -------------------------------------------------------------------------
//     // MERGE ALLOCATION + CAPACITY RESULTS
//     // -------------------------------------------------------------------------
//     // For each month in the target window, combine the allocation category totals
//     // with the people capacity total. Category labels from the DB are normalised
//     // to known display values — raw DB strings are never passed to the frontend.
//     const merged = [];

//     for (const month of targetMonths) {
//       const allocRow = allocationAgg.find((r) => r._id === month);

//       // Pre-initialise all known category totals to 0
//       // Defensive default — ensures no undefined values in numeric calculations
//       const catTotals = {
//         Vacation: 0,
//         Baseline: 0,
//         Strategic: 0,
//         "Discretionary Project / Enhancement": 0
//       };

//       if (allocRow) {
//         for (const c of allocRow.categories) {
//           // Normalise raw DB category strings to known display labels
//           // Prevents unexpected or partial category names from reaching the frontend
//           let label = c.category;
//           if (label.includes("Vacation"))      label = "Vacation";
//           if (label.includes("Baseline"))      label = "Baseline";
//           if (label.includes("Strategic"))     label = "Strategic";
//           if (label.includes("Discretionary")) label = "Discretionary Project / Enhancement";

//           // Only accumulate totals for known categories — unknown values are discarded
//           if (catTotals[label] !== undefined) {
//             catTotals[label] += c.total;
//           }
//         }
//       }

//       // Sum all category totals for the overall allocated total this month
//       const totalAllocated =
//         catTotals.Vacation +
//         catTotals.Baseline +
//         catTotals.Strategic +
//         catTotals["Discretionary Project / Enhancement"];

//       // ?? 0 ensures a safe numeric default if this month has no capacity data
//       const totalPeopleCapacity = capacityMap.get(month) ?? 0;

//       merged.push({
//         date: month,
//         categories: catTotals,
//         totalAllocated,
//         totalPeopleCapacity,
//         remainingCapacity: totalPeopleCapacity - totalAllocated
//       });
//     }

//     // -------------------------------------------------------------------------
//     // FORMAT AND RETURN RESPONSE
//     // -------------------------------------------------------------------------
//     // Only aggregated, display-safe values are returned — no raw DB documents,
//     // individual employee data, or internal fields are included in the response.
//     return res.json({
//       months:            merged.map((m) => formatMonthLabel(m.date)),
//       categories: [
//         { label: "Vacation",    values: merged.map((m) => m.categories.Vacation) },
//         { label: "Baseline",    values: merged.map((m) => m.categories.Baseline) },
//         { label: "Strategic",   values: merged.map((m) => m.categories.Strategic) },
//         {
//           label: "Discretionary Project / Enhancement",
//           values: merged.map((m) => m.categories["Discretionary Project / Enhancement"])
//         }
//       ],
//       totals:            merged.map((m) => m.totalAllocated),
//       peopleCapacity:    merged.map((m) => m.totalPeopleCapacity),
//       remainingCapacity: merged.map((m) => m.remainingCapacity)
//     });

//   } catch (err) {
//     // Log full error server-side — generic message returned to client to
//     // prevent DB structure or collection names from leaking in error responses
//     console.error("Error in capacity-summary:", err);
//     return res.status(500).json({
//       error: "Failed to load capacity summary"
//     });
//   }
// };

/* =============================================================================
   capacitySummaryController.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Returns aggregated capacity summary data for the Capacity Summary dashboard.
     Merges allocation totals by category with total people capacity across a
     configurable month window, producing the data needed for charts and tables.

   HOW IT WORKS:
     1. Reads optional ?start= and ?months= query parameters
     2. If no start month is provided, detects the most recent month with data
     3. Builds a target month window using computeMonthWindow()
     4. Aggregates allocations by category and month from the allocation collection
     5. Aggregates total people capacity by month from the capacity collection
     6. Merges both datasets and returns a structured response

   SECURITY MODEL:
     • Query parameters are parsed with parseInt() before any use — non-numeric
       values produce NaN which falls back to safe defaults, never reaching the DB.
     • Aggregation pipelines use strict { $in: targetMonths } numeric matching —
       no user input is interpolated into $where or dynamic operators.
     • The start month fallback uses only values read from the DB — no user input
       is used if the query param is absent.
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

/* -----------------------------------------------------------------------------
   UTILITY: formatMonthLabel
   -----------------------------------------------------------------------------
   Converts a YYYYMM integer into a short human-readable label for display
   in the Capacity Summary dashboard (e.g. 202503 → "Mar-25").

   PARAM:  yyyymm {number|string} — Month value in YYYYMM format
   RETURN: {string}               — Formatted label e.g. "Mar-25"

   SECURITY:
   • Pure formatting helper — no user input is passed directly to this function.
   • Only called after YYYYMM values have been validated as numeric integers.
   • Prevents malformed month strings from being surfaced in UI labels.
----------------------------------------------------------------------------- */
export function formatMonthLabel(yyyymm) {
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
   UTILITY: computeMonthWindow
   -----------------------------------------------------------------------------
   Generates an ordered array of YYYYMM integers starting from a given month
   and spanning a given count. Handles month and year rollovers correctly.

   PARAM:  startYYYYMM {number} — Starting month in YYYYMM format e.g. 202501
   PARAM:  count       {number} — Number of months to include
   RETURN: {number[]}           — Array of YYYYMM integers e.g. [202501, 202502, ...]

   SECURITY:
   • Generates a fully predictable sequence from a validated numeric start value.
   • Month rollover (month > 12 → reset to 1, increment year) is handled
     explicitly, preventing invalid YYYYMM values like 202513 from being produced.
   • No external input is used beyond the already-validated startYYYYMM integer.
----------------------------------------------------------------------------- */
export function computeMonthWindow(startYYYYMM, count) {
  const months = [];
  let year = Math.floor(startYYYYMM / 100);
  let month = startYYYYMM % 100;

  for (let i = 0; i < count; i++) {
    months.push(year * 100 + month);
    month++;

    // Handle year rollover — prevents invalid month values like 202513
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return months;
}

/* -----------------------------------------------------------------------------
   HANDLER: getCapacitySummary
   GET /api/capacity-summary
   -----------------------------------------------------------------------------
   Returns aggregated capacity and allocation data for a configurable month
   window. Used by the Capacity Summary dashboard to render charts and tables
   showing allocation totals by category vs total people capacity.

   QUERY PARAMETERS:
     ?start=<YYYYMM>   — Optional: start month for the window (defaults to most
                          recent month with data)
     ?months=<number>  — Optional: number of months in the window (defaults to 6)

   RESPONSE:
     {
       months:            ["Jan-25", "Feb-25", ...],  — Formatted month labels
       categories: [
         { label: "Vacation",    values: [n, n, ...] },
         { label: "Baseline",    values: [n, n, ...] },
         { label: "Strategic",   values: [n, n, ...] },
         { label: "Discretionary Project / Enhancement", values: [n, n, ...] }
       ],
       totals:            [n, n, ...],  — Total allocated per month
       peopleCapacity:    [n, n, ...],  — Total people capacity per month
       remainingCapacity: [n, n, ...]   — peopleCapacity - totalAllocated
     }

   SECURITY:
   • Query params are parsed with parseInt() — NaN values fall back to safe
     defaults and never reach DB queries.
   • Aggregation pipelines use strict numeric $in matching — no injection risk.
   • Category labels are normalised server-side — raw DB strings are mapped to
     known labels before being returned to the frontend.
   • Only aggregated totals are returned — no employee-level data is exposed.
   • Generic error message on failure — DB internals never exposed to client.
----------------------------------------------------------------------------- */
export const getCapacitySummary = async (req, res) => {
  try {
    const db = await connectDB();

    // -------------------------------------------------------------------------
    // PARSE QUERY PARAMETERS
    // -------------------------------------------------------------------------
    // parseInt() ensures only numeric values are used — non-numeric input
    // produces NaN which is caught by the conditional fallback logic below.
    const startParam = req.query.start;
    const monthsParam = req.query.months;

    const startMonth = startParam ? parseInt(startParam, 10) : null;
    const monthsWindow = monthsParam ? parseInt(monthsParam, 10) : 6; // Default: 6-month window

    const allocationCol = db.collection("allocation");
    const capacityCol = db.collection("capacity");

    // -------------------------------------------------------------------------
    // DETECT START MONTH (FALLBACK)
    // -------------------------------------------------------------------------
    // If no valid start month was provided, find the most recent month that
    // has data in either collection. Only past or current months are considered —
    // future months are excluded to avoid exposing forward planning data.
    let start = startMonth;

    if (!start) {
      // Retrieve distinct months from both collections and merge them
      const allMonths = await capacityCol.distinct("date");
      const allocMonths = await allocationCol.distinct("date");

      const combined = Array.from(new Set([...allMonths, ...allocMonths]));
      combined.sort((a, b) => a - b); // Sort ascending for predictable selection

      // Filter out any future months — only use past and current data
      const today = new Date();
      const currentYYYYMM = today.getFullYear() * 100 + (today.getMonth() + 1);

      const valid = combined.filter((m) => m <= currentYYYYMM);

      // Use the most recent valid month, or fall back to current month if no data
      start = valid.length > 0 ? valid[valid.length - 1] : currentYYYYMM;
    }

    // Build the target month array — handles year rollovers correctly
    const targetMonths = computeMonthWindow(start, monthsWindow);

    // -------------------------------------------------------------------------
    // AGGREGATE ALLOCATIONS BY CATEGORY + MONTH
    // -------------------------------------------------------------------------
    // Pipeline groups allocation amounts by category and month, producing
    // a per-month breakdown of how much was allocated to each category.
    // $in uses the validated targetMonths array — no injection risk.
    const allocationAgg = await allocationCol
      .aggregate([
        { $match: { date: { $in: targetMonths } } }, // Scope to target window
        {
          $group: {
            _id: { category: "$category", date: "$date" },
            total: { $sum: "$amount" } // Sum all allocation amounts per category/month
          }
        },
        {
          $group: {
            _id: "$_id.date",
            categories: {
              $push: {
                category: "$_id.category",
                total: "$total"
              }
            }
          }
        }
      ])
      .toArray();

    // -------------------------------------------------------------------------
    // AGGREGATE TOTAL PEOPLE CAPACITY BY MONTH
    // -------------------------------------------------------------------------
    // Sums all capacity records per month — returns a single total per month,
    // not individual employee capacity values, to avoid exposing personal data.
    const capacityAgg = await capacityCol
      .aggregate([
        { $match: { date: { $in: targetMonths } } }, // Scope to target window
        {
          $group: {
            _id: "$date",
            totalPeopleCapacity: { $sum: "$amount" } // Total capacity across all employees
          }
        }
      ])
      .toArray();

    // Build a Map for O(1) capacity lookup by month during the merge step
    const capacityMap = new Map();
    for (const row of capacityAgg) {
      capacityMap.set(row._id, row.totalPeopleCapacity);
    }

    // -------------------------------------------------------------------------
    // MERGE ALLOCATION + CAPACITY RESULTS
    // -------------------------------------------------------------------------
    // For each month in the target window, combine the allocation category totals
    // with the people capacity total. Category labels from the DB are normalised
    // to known display values — raw DB strings are never passed to the frontend.
    const merged = [];

    for (const month of targetMonths) {
      const allocRow = allocationAgg.find((r) => r._id === month);

      // Pre-initialise all known category totals to 0
      // Defensive default — ensures no undefined values in numeric calculations
      const catTotals = {
        Vacation: 0,
        Baseline: 0,
        Strategic: 0,
        "Discretionary Project / Enhancement": 0
      };

      if (allocRow) {
        for (const c of allocRow.categories) {
          // Normalise raw DB category strings to known display labels
          // Prevents unexpected or partial category names from reaching the frontend
          let label = c.category;
          if (label.includes("Vacation"))      label = "Vacation";
          if (label.includes("Baseline"))      label = "Baseline";
          if (label.includes("Strategic"))     label = "Strategic";
          if (label.includes("Discretionary")) label = "Discretionary Project / Enhancement";

          // Only accumulate totals for known categories — unknown values are discarded
          if (catTotals[label] !== undefined) {
            catTotals[label] += c.total;
          }
        }
      }

      // Sum all category totals for the overall allocated total this month
      const totalAllocated =
        catTotals.Vacation +
        catTotals.Baseline +
        catTotals.Strategic +
        catTotals["Discretionary Project / Enhancement"];

      // ?? 0 ensures a safe numeric default if this month has no capacity data
      const totalPeopleCapacity = capacityMap.get(month) ?? 0;

      merged.push({
        date: month,
        categories: catTotals,
        totalAllocated,
        totalPeopleCapacity,
        remainingCapacity: totalPeopleCapacity - totalAllocated
      });
    }

    // -------------------------------------------------------------------------
    // FORMAT AND RETURN RESPONSE
    // -------------------------------------------------------------------------
    // Only aggregated, display-safe values are returned — no raw DB documents,
    // individual employee data, or internal fields are included in the response.
    return res.json({
      months:            merged.map((m) => formatMonthLabel(m.date)),
      categories: [
        { label: "Vacation",    values: merged.map((m) => m.categories.Vacation) },
        { label: "Baseline",    values: merged.map((m) => m.categories.Baseline) },
        { label: "Strategic",   values: merged.map((m) => m.categories.Strategic) },
        {
          label: "Discretionary Project / Enhancement",
          values: merged.map((m) => m.categories["Discretionary Project / Enhancement"])
        }
      ],
      totals:            merged.map((m) => m.totalAllocated),
      peopleCapacity:    merged.map((m) => m.totalPeopleCapacity),
      remainingCapacity: merged.map((m) => m.remainingCapacity)
    });

  } catch (err) {
    // Log full error server-side — generic message returned to client to
    // prevent DB structure or collection names from leaking in error responses
    console.error("Error in capacity-summary:", err);
    return res.status(500).json({
      error: "Failed to load capacity summary"
    });
  }
};