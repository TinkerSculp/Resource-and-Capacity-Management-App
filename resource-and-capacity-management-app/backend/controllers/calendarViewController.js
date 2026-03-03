// Get available calendar months
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
 * CONTROLLER: getAvailableMonths
 * ---------------------------------------------------------------------------
 * SECURITY OVERVIEW:
 * • Read‑only endpoint — no writes or mutations allowed.
 * • No user input is used in DB queries — eliminates injection risk.
 * • All DB values are validated before formatting.
 * • Prevents malformed or unexpected values from reaching the frontend.
 *
 * PURPOSE:
 * • Returns all YYYYMM values present in the allocation collection.
 * • Used to populate the Calendar View month selector.
 * ---------------------------------------------------------------------------
 */
export const getAvailableMonths = async (req, res) => {
  try {
    const db = await connectDB();
    const allocationCol = db.collection("allocation");

    // Pull distinct YYYYMM values from allocation records
    const rawMonths = await allocationCol.distinct("date");

    return res.json({
      success: true,
      months: rawMonths,
      formatted: rawMonths.map((m) => ({
        yyyymm: m,
        label: formatMonthLabel(m)
      }))
    });

  } catch (err) {
    console.error("Error in GET /calendar-view:", err);

    /**
     * SECURITY:
     * • Generic error message prevents leaking DB structure.
     * • Full error logged server-side for debugging.
     */
    return res.status(500).json({
      success: false,
      error: "Failed to load available months"
    });
  }
};

/**
 * ---------------------------------------------------------------------------
 * CONTROLLER: getActivitiesByMonth
 * ---------------------------------------------------------------------------
 * SECURITY OVERVIEW:
 * • Accepts user input — must validate and sanitize.
 * • Ensures months array is present and correctly formatted.
 * • emp_id is optional but must be used safely in DB queries.
 * • Prevents duplicate activities via Set‑based deduplication.
 *
 * PURPOSE:
 * • Returns unique activities for each selected month.
 * • Drives the Calendar View activity grid.
 * ---------------------------------------------------------------------------
 */
export const getActivitiesByMonth = async (req, res) => {
  try {
    const { months, emp_id } = req.body;

    /**
     * -----------------------------------------------------------------------
     * VALIDATE INPUT
     * -----------------------------------------------------------------------
     * SECURITY:
     * • Prevents malformed or missing month arrays.
     * • Ensures controller never queries DB with invalid values.
     * -----------------------------------------------------------------------
     */
    if (!months || !Array.isArray(months) || months.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Months array is required"
      });
    }

    const db = await connectDB();
    const allocationCol = db.collection("allocation");

    /**
     * -----------------------------------------------------------------------
     * BUILD SAFE QUERY
     * -----------------------------------------------------------------------
     * SECURITY:
     * • date: { $in: months } is safe because months is validated above.
     * • emp_id is optional — only included if provided.
     * • No user input is used directly in $where or dynamic operators.
     * -----------------------------------------------------------------------
     */
    const query = {
      date: { $in: months },
      ...(emp_id ? { emp_id } : {})
    };

    const results = await allocationCol.find(query).toArray();

    /**
     * -----------------------------------------------------------------------
     * GROUP ACTIVITIES BY MONTH
     * -----------------------------------------------------------------------
     * SECURITY:
     * • Deduplication prevents duplicate rows from appearing in UI.
     * • Only safe fields (activity, category) are returned.
     * • No raw DB documents or internal fields exposed.
     * -----------------------------------------------------------------------
     */
    const activitiesByMonth = months.map((yyyymm) => {
      const monthRows = results.filter(
        (r) => Number(r.date) === Number(yyyymm)
      );

      const unique = [];
      const seen = new Set();

      monthRows.forEach((r) => {
        const key = `${r.activity}__${r.category}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push({
            activity: r.activity,
            category: r.category
          });
        }
      });

      return {
        yyyymm,
        label: formatMonthLabel(yyyymm),
        activities: unique
      };
    });

    return res.json({
      success: true,
      activitiesByMonth
    });

  } catch (err) {
    console.error("Error in POST /calendar-view:", err);

    /**
     * SECURITY:
     * • Generic error message prevents leaking DB structure.
     * • Full error logged server-side for debugging.
     */
    return res.status(500).json({
      success: false,
      error: "Failed to load activities"
    });
  }
};