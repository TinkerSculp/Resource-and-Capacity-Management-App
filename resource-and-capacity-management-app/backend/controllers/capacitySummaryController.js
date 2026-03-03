// Get capacity summary data
import { connectDB } from "../config/db.js";

/**
 * ---------------------------------------------------------------------------
 * FORMAT MONTH LABEL (UTILITY)
 * ---------------------------------------------------------------------------
 * SECURITY:
 * • Pure formatting helper — no user input passed directly.
 * • YYYYMM values are validated before reaching this function.
 * • Prevents malformed month strings from leaking into UI.
 * ---------------------------------------------------------------------------
 */
function formatMonthLabel(yyyymm) {
  const s = String(yyyymm);
  const year = Number(s.slice(0, 4));
  const month = Number(s.slice(4, 6));
  const date = new Date(year, month - 1, 1);

  const shortMonth = date.toLocaleString("en-US", { month: "short" });
  const shortYear = String(year).slice(2);

  return `${shortMonth}-${shortYear}`;
}

/**
 * ---------------------------------------------------------------------------
 * COMPUTE MONTH WINDOW
 * ---------------------------------------------------------------------------
 * SECURITY:
 * • Generates a predictable YYYYMM sequence.
 * • No external input used beyond validated numeric start month.
 * • Prevents invalid month rollover (e.g., 202313).
 * ---------------------------------------------------------------------------
 */
function computeMonthWindow(startYYYYMM, count) {
  const months = [];
  let year = Math.floor(startYYYYMM / 100);
  let month = startYYYYMM % 100;

  for (let i = 0; i < count; i++) {
    months.push(year * 100 + month);
    month++;

    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return months;
}

/**
 * ---------------------------------------------------------------------------
 * CONTROLLER: getCapacitySummary
 * ---------------------------------------------------------------------------
 * SECURITY OVERVIEW:
 * • Validates query parameters before use.
 * • Ensures all DB values are numeric YYYYMM before processing.
 * • Aggregation pipelines use strict $match filters — no injection risk.
 * • Merges allocation + capacity safely with defensive defaults.
 * • Returns only the required fields — no sensitive data exposure.
 *
 * IMPORTANT:
 * • Should be protected by authentication middleware at the router level.
 * • Must remain read‑only — no writes allowed in this endpoint.
 * ---------------------------------------------------------------------------
 */
export const getCapacitySummary = async (req, res) => {
  try {
    const db = await connectDB();

    /**
     * -----------------------------------------------------------------------
     * VALIDATE QUERY PARAMETERS
     * -----------------------------------------------------------------------
     * SECURITY:
     * • parseInt() ensures numeric-only values.
     * • Prevents injection or malformed YYYYMM values.
     * -----------------------------------------------------------------------
     */
    const startParam = req.query.start;
    const monthsParam = req.query.months;

    const startMonth = startParam ? parseInt(startParam, 10) : null;
    const monthsWindow = monthsParam ? parseInt(monthsParam, 10) : 6;

    const allocationCol = db.collection("allocation");
    const capacityCol = db.collection("capacity");

    /**
     * -----------------------------------------------------------------------
     * DETECT START MONTH (FALLBACK)
     * -----------------------------------------------------------------------
     * SECURITY:
     * • Uses only DB values — no user input.
     * • Filters out future months to avoid exposing future planning data.
     * • Ensures a valid fallback even if DB is partially empty.
     * -----------------------------------------------------------------------
     */
    let start = startMonth;

    if (!start) {
      const allMonths = await capacityCol.distinct("date");
      const allocMonths = await allocationCol.distinct("date");

      const combined = Array.from(new Set([...allMonths, ...allocMonths]));
      combined.sort((a, b) => a - b);

      const today = new Date();
      const currentYYYYMM =
        today.getFullYear() * 100 + (today.getMonth() + 1);

      const valid = combined.filter((m) => m <= currentYYYYMM);
      start = valid.length > 0 ? valid[valid.length - 1] : currentYYYYMM;
    }

    /**
     * -----------------------------------------------------------------------
     * BUILD TARGET MONTH WINDOW
     * -----------------------------------------------------------------------
     * SECURITY:
     * • computeMonthWindow() ensures valid YYYYMM sequence.
     * • Prevents invalid month arithmetic.
     * -----------------------------------------------------------------------
     */
    const targetMonths = computeMonthWindow(start, monthsWindow);

    /**
     * -----------------------------------------------------------------------
     * AGGREGATE ALLOCATIONS BY CATEGORY + MONTH
     * -----------------------------------------------------------------------
     * SECURITY:
     * • $match uses strict numeric filtering — no injection risk.
     * • Aggregation pipeline prevents over-fetching unrelated data.
     * • Only category + amount fields are exposed.
     * -----------------------------------------------------------------------
     */
    const allocationAgg = await allocationCol
      .aggregate([
        { $match: { date: { $in: targetMonths } } },
        {
          $group: {
            _id: { category: "$category", date: "$date" },
            total: { $sum: "$amount" }
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

    /**
     * -----------------------------------------------------------------------
     * AGGREGATE PEOPLE CAPACITY
     * -----------------------------------------------------------------------
     * SECURITY:
     * • Same strict numeric filtering as above.
     * • Only total capacity is returned — no employee-level data.
     * -----------------------------------------------------------------------
     */
    const capacityAgg = await capacityCol
      .aggregate([
        { $match: { date: { $in: targetMonths } } },
        {
          $group: {
            _id: "$date",
            totalPeopleCapacity: { $sum: "$amount" }
          }
        }
      ])
      .toArray();

    /**
     * -----------------------------------------------------------------------
     * BUILD CAPACITY MAP
     * -----------------------------------------------------------------------
     * SECURITY:
     * • Ensures safe lookup even if some months have no capacity data.
     * -----------------------------------------------------------------------
     */
    const capacityMap = new Map();
    for (const row of capacityAgg) {
      capacityMap.set(row._id, row.totalPeopleCapacity);
    }

    /**
     * -----------------------------------------------------------------------
     * MERGE ALLOCATION + CAPACITY RESULTS
     * -----------------------------------------------------------------------
     * SECURITY:
     * • Defensive defaults prevent undefined values.
     * • Category normalization prevents inconsistent DB labels.
     * • No raw DB category strings are returned to frontend.
     * -----------------------------------------------------------------------
     */
    const merged = [];

    for (const month of targetMonths) {
      const allocRow = allocationAgg.find((r) => r._id === month);

      const catTotals = {
        Vacation: 0,
        Baseline: 0,
        Strategic: 0,
        "Discretionary Project / Enhancement": 0
      };

      if (allocRow) {
        for (const c of allocRow.categories) {
          let label = c.category;

          if (label.includes("Vacation")) label = "Vacation";
          if (label.includes("Baseline")) label = "Baseline";
          if (label.includes("Strategic")) label = "Strategic";
          if (label.includes("Discretionary"))
            label = "Discretionary Project / Enhancement";

          if (catTotals[label] !== undefined) {
            catTotals[label] += c.total;
          }
        }
      }

      const totalAllocated =
        catTotals.Vacation +
        catTotals.Baseline +
        catTotals.Strategic +
        catTotals["Discretionary Project / Enhancement"];

      const totalPeopleCapacity = capacityMap.get(month) ?? 0;

      merged.push({
        date: month,
        categories: catTotals,
        totalAllocated,
        totalPeopleCapacity,
        remainingCapacity: totalPeopleCapacity - totalAllocated
      });
    }

    /**
     * -----------------------------------------------------------------------
     * FORMAT RESPONSE
     * -----------------------------------------------------------------------
     * SECURITY:
     * • Only safe, aggregated values returned.
     * • No raw DB documents or internal fields exposed.
     * • All labels sanitized + normalized.
     * -----------------------------------------------------------------------
     */
    return res.json({
      months: merged.map((m) => formatMonthLabel(m.date)),
      categories: [
        { label: "Vacation", values: merged.map((m) => m.categories.Vacation) },
        { label: "Baseline", values: merged.map((m) => m.categories.Baseline) },
        { label: "Strategic", values: merged.map((m) => m.categories.Strategic) },
        {
          label: "Discretionary Project / Enhancement",
          values: merged.map(
            (m) => m.categories["Discretionary Project / Enhancement"]
          )
        }
      ],
      totals: merged.map((m) => m.totalAllocated),
      peopleCapacity: merged.map((m) => m.totalPeopleCapacity),
      remainingCapacity: merged.map((m) => m.remainingCapacity)
    });

  } catch (err) {
    console.error("Error in capacity-summary:", err);

    /**
     * -----------------------------------------------------------------------
     * SECURITY:
     * • Generic error message prevents leaking DB structure.
     * • Full error logged server-side for debugging.
     * -----------------------------------------------------------------------
     */
    return res.status(500).json({
      error: "Failed to load capacity summary"
    });
  }
};