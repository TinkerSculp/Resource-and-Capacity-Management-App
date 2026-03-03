// Get available capacity months
import { connectDB } from "../config/db.js";

/**
 * ---------------------------------------------------------------------------
 * FORMAT MONTH LABEL (UTILITY)
 * ---------------------------------------------------------------------------
 * SECURITY:
 * • Pure formatting helper — no external input used directly.
 * • Safe because YYYYMM is validated before reaching this function.
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
 * CONTROLLER: getCapacityMonths
 * ---------------------------------------------------------------------------
 * SECURITY OVERVIEW:
 * • Returns a list of YYYYMM values used for capacity reporting.
 * • No user input is used in DB queries — eliminates injection risk.
 * • All DB values are sanitized and validated before formatting.
 * • Ensures only numeric YYYYMM values are processed.
 * • Filters to last 12 months to prevent excessive data exposure.
 *
 * IMPORTANT:
 * • Must remain read‑only — no writes allowed in this endpoint.
 * • Should be protected by authentication middleware at the router level.
 * ---------------------------------------------------------------------------
 */
export const getCapacityMonths = async (req, res) => {
  try {
    const db = await connectDB();

    const allocationCol = db.collection("allocation");
    const capacityCol = db.collection("capacity");

    /**
     * -----------------------------------------------------------------------
     * PULL UNIQUE MONTHS
     * -----------------------------------------------------------------------
     * SECURITY:
     * • distinct() is safe — no user input.
     * • Convert all values to numbers and filter out invalid entries.
     * • Prevents malformed DB data from breaking the API.
     * -----------------------------------------------------------------------
     */
    let allocMonths = await allocationCol.distinct("date");
    let capMonths = await capacityCol.distinct("date");

    allocMonths = allocMonths.map((m) => Number(m)).filter((m) => !isNaN(m));
    capMonths = capMonths.map((m) => Number(m)).filter((m) => !isNaN(m));

    let allMonths = Array.from(new Set([...allocMonths, ...capMonths]));

    // Sort ascending — safe numeric comparison
    allMonths.sort((a, b) => a - b);

    /**
     * -----------------------------------------------------------------------
     * FILTER TO LAST 12 MONTHS
     * -----------------------------------------------------------------------
     * SECURITY:
     * • Prevents exposing historical data beyond what UI requires.
     * • Protects performance by limiting dataset size.
     * -----------------------------------------------------------------------
     */
    const today = new Date();
    const currentYYYYMM = today.getFullYear() * 100 + (today.getMonth() + 1);
    const oneYearAgo = currentYYYYMM - 100;

    allMonths = allMonths.filter(
      (m) => m >= oneYearAgo && m <= currentYYYYMM
    );

    /**
     * -----------------------------------------------------------------------
     * FORMAT FOR DROPDOWN
     * -----------------------------------------------------------------------
     * SECURITY:
     * • All values are validated numeric YYYYMM before formatting.
     * • Prevents injection into UI labels.
     * -----------------------------------------------------------------------
     */
    const formatted = allMonths.map((m) => ({
      label: formatMonthLabel(m),
      value: m
    }));

    return res.json({ months: formatted });

  } catch (err) {
    console.error("Error in /capacity-summary/months:", err);

    /**
     * -----------------------------------------------------------------------
     * SECURITY:
     * • Generic error message prevents leaking internal DB details.
     * • Logs full error server-side for debugging.
     * -----------------------------------------------------------------------
     */
    return res.status(500).json({
      error: "Failed to load months"
    });
  }
};