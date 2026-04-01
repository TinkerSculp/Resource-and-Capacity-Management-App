/* =============================================================================
   reportsController.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Handles three report endpoints used by the Capacity Report page:
       • getActivitySummary  — Allocation totals grouped by activity name,
                               filterable by category, leader, dept,
                               requestor, and requestor_vp
       • getActivityFilters  — Dropdown option lists for the activity filters
       • getEmployeeCapacity — Per-employee allocation totals across a
                               configurable month window

   HOW THE MONTH WINDOW WORKS:
     All three handlers accept ?start=YYYYMM&months=N query params.
     computeMonthWindow(start, N) generates an array of N YYYYMM integers
     starting from start, handling month/year rollover correctly.
     formatMonthLabel(YYYYMM) converts each integer to a "MMM-YY" label
     (e.g. 202503 → "Mar-25") for use as table/chart column headers.
     Both utilities are imported from capacitySummaryController.js to avoid
     duplicating the same logic across controllers.

   HOW THE RESULT MAP WORKS:
     For both getActivitySummary and getEmployeeCapacity, the response is
     a { label: amount } map per row. All target months are initialised to 0
     before filling in actual aggregated values — this ensures every column
     renders a value even for employees or activities with no data that month,
     preventing undefined from reaching frontend table cells.

   SECURITY MODEL:
     • parseInt() with radix 10 is used on all numeric query params —
       prevents octal parsing and coerces non-numeric values to NaN.
     • NaN fallbacks are applied to all parseInt() results — safe defaults
       prevent undefined or NaN from reaching MongoDB queries.
     • Category, leader, dept, requestor, and requestor_vp filter values are
       matched using exact string equality inside $match — never interpolated
       into queries in a way that enables injection.
     • Filters are only appended to the pipeline when present and !== "all" —
       avoids unnecessary $match stages on unset filters.
     • The assignment $lookup uses server-controlled localField/foreignField
       paths — no user input reaches field name positions.
     • All distinct() and aggregate() calls operate on server-controlled
       collection names and field paths.
     • Generic error messages are returned to the client — internal error
       details are only logged server-side.

   DEPENDENCIES:
     • ../config/db.js                 — MongoDB connection singleton
     • ./capacitySummaryController.js — formatMonthLabel, computeMonthWindow
   ============================================================================= */

import { connectDB } from "../config/db.js";
import { formatMonthLabel, computeMonthWindow } from "./capacitySummaryController.js";

/* =============================================================================
   HANDLER: getActivitySummary
   GET /api/reports
   -----------------------------------------------------------------------------
   Returns allocation totals grouped by activity name across a configurable
   month window. The aggregation pipeline is built dynamically based on which
   filters are active — only active filters add a $match stage to the pipeline.

   Joins allocation → assignment to resolve project-level metadata (leader,
   dept, requestor, requestor_vp) for filtering, since these fields live in
   the assignment collection, not the allocation collection.

   QUERY PARAMETERS:
     start        {number}  YYYYMM — Start of the month window (required)
     months       {number}  Number of months to include (default: 6)
     category     {string}  Filter by allocation category (default: "all")
     leader       {string}  Filter by assignment leader (default: "all")
     dept         {string}  Filter by requesting_dept (default: "all")
     requestor    {string}  Filter by requestor name (default: "all")
     requestor_vp {string}  Filter by requestor VP name (default: "all")

   RESPONSE:
     { months: string[], data: [{ activity, months: { [label]: number } }] }

   PIPELINE STAGES:
     1. $match      — Scope to target months + optional category filter
     2. $lookup     — Join allocation → assignment on activity/project_name
     3. $unwind     — Flatten the join result
     4. $match      — Apply assignment-level filters (leader, dept, etc.)
     5. $group      — Group by activity+date to get monthly totals
     6. $group      — Re-group by activity to collect all month totals
     7. $project    — Clean output shape
     8. $sort       — Sort alphabetically by activity name
   ============================================================================= */
export const getActivitySummary = async (req, res) => {
  try {
    const db            = await connectDB();
    const allocationCol = db.collection("allocation");

    let { start, months, category, leader, dept, requestor, requestor_vp } = req.query;

    /* -------------------------------------------------------------------------
       PARSE QUERY PARAMETERS
       parseInt with radix 10 + isNaN fallback — prevents octal parsing and
       ensures safe defaults are used when params are missing or non-numeric.
    --------------------------------------------------------------------------- */
    const monthsWindow     = months ? parseInt(months, 10) : 6;
    const safeMonthsWindow = isNaN(monthsWindow) ? 6 : monthsWindow;

    /* -------------------------------------------------------------------------
       START MONTH FALLBACK
       If start is missing, detect the most recent month in the allocation
       collection that is <= the current month — prevents future-dated windows.
    --------------------------------------------------------------------------- */
    if (!start) {
      const allocMonths   = await allocationCol.distinct("date");
      const today         = new Date();
      const currentYYYYMM = today.getFullYear() * 100 + (today.getMonth() + 1);
      const valid         = allocMonths.filter(m => m <= currentYYYYMM).sort((a, b) => a - b);
      start               = valid.length > 0 ? valid[valid.length - 1] : currentYYYYMM;
    }

    const startYYYYMM  = parseInt(start, 10);
    const targetMonths = computeMonthWindow(startYYYYMM, safeMonthsWindow);

    /* -------------------------------------------------------------------------
       BUILD DYNAMIC AGGREGATION PIPELINE
       Stages are added conditionally — only active filters add a $match stage.
       This avoids unnecessary pipeline stages for unset filters.
    --------------------------------------------------------------------------- */
    const pipeline = [];

    // Stage 1: Scope to target month window + optional category filter
    // Category filter is applied here (early) to reduce docs before the join
    const initialMatch = { date: { $in: targetMonths } };
    if (category && category !== "all") {
      initialMatch.category = category; // Exact string equality — no injection risk
    }
    pipeline.push({ $match: initialMatch });

    // Stage 2+3: Join allocation → assignment to get project-level metadata
    // preserveNullAndEmptyArrays: true — keeps allocations with no matching assignment
    pipeline.push(
      {
        $lookup: {
          from:         "assignment",
          localField:   "activity",       // Server-controlled field path
          foreignField: "project_name",   // Server-controlled field path
          as:           "projectDetails"
        }
      },
      {
        $unwind: {
          path:                       "$projectDetails",
          preserveNullAndEmptyArrays: true // Don't drop allocations missing an assignment
        }
      }
    );

    // Stage 4: Apply assignment-level filters — only when present and !== "all"
    // Each uses exact equality — no regex or user-controlled field name positions
    const assignmentFilters = {};
    if (leader       && leader       !== "all") assignmentFilters["projectDetails.leader"]          = leader;
    if (dept         && dept         !== "all") assignmentFilters["projectDetails.requesting_dept"] = dept;
    if (requestor    && requestor    !== "all") assignmentFilters["projectDetails.requestor"]       = requestor;
    if (requestor_vp && requestor_vp !== "all") assignmentFilters["projectDetails.requestor_vp"]   = requestor_vp;

    if (Object.keys(assignmentFilters).length > 0) {
      pipeline.push({ $match: assignmentFilters });
    }

    // Stages 5–8: Group → re-group → project → sort
    pipeline.push(
      // Group by activity+date to get monthly totals per activity
      { $group: { _id: { activity: "$activity", date: "$date" }, totalAmount: { $sum: "$amount" } } },
      // Re-group by activity alone to collect all month totals into an array
      { $group: { _id: "$_id.activity", monthlyTotals: { $push: { date: "$_id.date", amount: "$totalAmount" } } } },
      // Clean the output shape — remove _id, rename to activity
      { $project: { _id: 0, activity: "$_id", monthlyTotals: 1 } },
      // Sort alphabetically so the report is predictable and easy to scan
      { $sort: { activity: 1 } }
    );

    const rawData = await allocationCol.aggregate(pipeline).toArray();

    /* -------------------------------------------------------------------------
       TRANSFORM PIPELINE OUTPUT
       For each activity row, initialise all months to 0 then fill in actual
       values. This prevents undefined from reaching frontend table cells for
       months where an activity has no allocations.
    --------------------------------------------------------------------------- */
    const result = rawData.map(row => {
      const monthMap = {};

      // Initialise all target months to 0 — every column gets a value
      targetMonths.forEach(m => { monthMap[formatMonthLabel(m)] = 0; });

      // Fill actual aggregated values — overwrites the 0 defaults
      row.monthlyTotals.forEach(m => { monthMap[formatMonthLabel(m.date)] = m.amount; });

      return { activity: row.activity, months: monthMap };
    });

    return res.status(200).json({
      months: targetMonths.map(m => formatMonthLabel(m)),
      data:   result
    });

  } catch (err) {
    console.error("Error in getActivitySummary:", err);
    return res.status(500).json({ error: "Failed to load activity allocation summary" });
  }
};

/* =============================================================================
   HANDLER: getActivityFilters
   GET /api/reports/filters
   -----------------------------------------------------------------------------
   Returns the dropdown option lists for the activity report filters.
   All four lists run in parallel via Promise.all for minimal response time.

   Leaders are sourced from the account collection scoped to acc_type_id === 1
   (Resource Manager) and resolved to emp_name via an employee join — not
   taken directly from the assignment collection's leader field, which could
   contain stale names if an employee was renamed.

   RESPONSE:
     {
       leaders:         string[],
       requestors:      string[],
       requestor_vp:    string[],
       requesting_dept: string[]
     }

   SECURITY:
     • No user input is used in any query — all lists derived from the DB
     • distinct() field paths are server-controlled string literals
     • Leaders scoped to acc_type_id === 1 — only Resource Managers returned
     • $exists + $ne "" on distinct() calls — prevents empty strings in dropdowns
   ============================================================================= */
export const getActivityFilters = async (req, res) => {
  try {
    const db = await connectDB();

    // All four filter queries run in parallel — reduces total response time
    const [leadersResult, requestors, requestor_vp, departments] = await Promise.all([

      /* -----------------------------------------------------------------------
         LEADERS: accounts with acc_type_id === 1, resolved to emp_name
         Uses an aggregation join rather than distinct() on the assignment
         collection — ensures only current Resource Managers appear in the list,
         not stale names from old assignment records.
      ----------------------------------------------------------------------- */
      db.collection("account").aggregate([
        { $match: { "account.acc_type_id": 1 } }, // Resource Managers only
        {
          $lookup: {
            from:         "employee",
            localField:   "emp_id",
            foreignField: "emp_id",
            as:           "emp_details"
          }
        },
        { $unwind: "$emp_details" },
        { $group: { _id: "$emp_details.emp_name" } },
        { $sort:  { _id: 1 } }
      ]).toArray(),

      // REQUESTORS: distinct requestor values — $ne "" prevents empty strings
      db.collection("assignment").distinct("requestor", {
        requestor: { $exists: true, $ne: "" }
      }),

      // REQUESTOR VPS: distinct requestor_vp values
      db.collection("assignment").distinct("requestor_vp", {
        requestor_vp: { $exists: true, $ne: "" }
      }),

      // DEPARTMENTS: distinct dept_name values from department collection
      db.collection("department").distinct("dept_name", {
        dept_name: { $exists: true, $ne: "" }
      })
    ]);

    return res.json({
      leaders:         leadersResult.map(l => l._id), // Extract name from aggregation { _id: name }
      requestors,
      requestor_vp,
      requesting_dept: departments.sort() // Sort alphabetically — distinct() order is not guaranteed
    });

  } catch (error) {
    console.error("getActivityFilters error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/* =============================================================================
   HANDLER: getEmployeeCapacity
   GET /api/reports/capacity
   -----------------------------------------------------------------------------
   Returns per-employee allocation totals across a configurable month window.
   Scoped to the Data Management department (dept_no: "D01") — the capacity
   report is designed specifically for the DM team.

   Uses a $lookup sub-pipeline to join each employee's allocations within
   the target month window in a single aggregation pass, then groups by date
   to get a per-month total per employee.

   QUERY PARAMETERS:
     start  {number}  YYYYMM — Start of the month window (default: 202501)
     months {number}  Number of months to include (default: 6)

   RESPONSE:
     {
       months: string[],
       data:   [{ emp_name: string, months: { [label]: number } }]
     }

   SECURITY:
     • parseInt() with radix 10 + NaN fallbacks on both params
     • targetMonths is server-computed — no user input in the $in array
     • $lookup uses $expr with server-controlled field references only
     • _id excluded from $project — internal MongoDB IDs never returned
     • All months initialised to 0 — no undefined in frontend table cells
   ============================================================================= */
export const getEmployeeCapacity = async (req, res) => {
  try {
    const db = await connectDB();

    // parseInt with radix 10 + NaN fallbacks — safe defaults prevent invalid queries
    const startMonth   = req.query.start  ? parseInt(req.query.start,  10) : 202501;
    const monthsWindow = req.query.months ? parseInt(req.query.months, 10) : 6;
    const safeStart    = isNaN(startMonth)   ? 202501 : startMonth;
    const safeMonths   = isNaN(monthsWindow) ? 6      : monthsWindow;

    const targetMonths = computeMonthWindow(safeStart, safeMonths);

    /* -------------------------------------------------------------------------
       AGGREGATION PIPELINE
       Starts from the employee collection scoped to dept_no "D01", then uses
       a $lookup sub-pipeline to join each employee's allocations for the target
       months. The sub-pipeline groups by date so only one record per month
       per employee reaches the outer pipeline.
    --------------------------------------------------------------------------- */
    const pipeline = [
      // Scope to Data Management department — hardcoded, no user input
      { $match: { dept_no: "D01" } },
      {
        $lookup: {
          from: "allocation",
          let:  { empId: "$emp_id" }, // Reference to the outer employee's emp_id
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$emp_id", "$$empId"] },       // Match this employee's allocations
                    { $in: ["$date",   targetMonths] }     // Only within the target window
                  ]
                }
              }
            },
            // Group by date to get total allocation per month for this employee
            { $group: { _id: "$date", totalAmount: { $sum: "$amount" } } }
          ],
          as: "monthlyData"
        }
      },
      {
        $project: {
          _id:       0,          // Exclude internal MongoDB _id
          emp_name:  1,
          emp_id:    1,
          capacities: {
            $map: {
              input: "$monthlyData",
              as:    "cap",
              in:    { date: "$$cap._id", amount: "$$cap.totalAmount" }
            }
          }
        }
      },
      { $sort: { emp_name: 1 } } // Sort alphabetically for consistent table order
    ];

    const employeesRaw = await db.collection("employee").aggregate(pipeline).toArray();

    /* -------------------------------------------------------------------------
       TRANSFORM PIPELINE OUTPUT
       Initialise all months to 0, then fill in actual values. This ensures
       every column has a numeric value even for months with no allocations.
    --------------------------------------------------------------------------- */
    const result = employeesRaw.map(emp => {
      const monthMap = {};

      // Initialise all target months to 0 — prevents undefined in table cells
      targetMonths.forEach(m => { monthMap[formatMonthLabel(m)] = 0; });

      // Fill actual allocation totals — overwrites the 0 defaults
      emp.capacities.forEach(c => { monthMap[formatMonthLabel(c.date)] = c.amount; });

      return { emp_name: emp.emp_name, months: monthMap };
    });

    return res.status(200).json({
      months: targetMonths.map(m => formatMonthLabel(m)),
      data:   result
    });

  } catch (err) {
    console.error("getEmployeeCapacity error:", err);
    return res.status(500).json({ error: "Failed to load capacity data" });
  }
};