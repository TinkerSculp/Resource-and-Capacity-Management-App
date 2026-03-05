/* =============================================================================
   reportsController.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Handles three report endpoints used by the Capacity Report page:
       • getActivitySummary    — Allocation totals grouped by activity name,
                                 filterable by category, leader, dept,
                                 requestor, and requestor_vp
       • getActivityFilters    — Dropdown option lists for the activity filters
       • getEmployeeCapacity   — Per-employee allocation totals across a
                                 configurable month window

   HOW THE MONTH WINDOW WORKS:
     All three handlers accept ?start=YYYYMM&months=N query params.
     computeMonthWindow(start, N) generates an array of N YYYYMM integers
     starting from start, handling month/year rollover correctly.
     formatMonthLabel(YYYYMM) converts each integer to a "MMM-YY" label
     (e.g. 202503 → "Mar-25") for use as table/chart column headers.

   SECURITY MODEL:
     • parseInt() with radix 10 is used on all numeric query params —
       prevents octal parsing and coerces non-numeric values to NaN.
     • NaN fallbacks are applied to all parseInt() results — prevents
       undefined or NaN from reaching MongoDB queries.
     • Category, leader, dept, requestor, and requestor_vp filter values
       are matched using exact string equality inside $match — they are
       never interpolated into queries in a way that enables injection.
     • Filters are only appended to the pipeline when they are present
       and !== "all" — avoids unnecessary $match stages on unset filters.
     • The assignment $lookup uses localField/foreignField (server-controlled)
       not $expr with user-supplied values.
     • All distinct() and aggregate() calls operate on server-controlled
       collection names and field paths — no user input reaches field names.
     • Generic error messages are returned to the client — internal error
       details are only logged server-side.

   DEPENDENCIES:
     • ../config/db.js                  — MongoDB connection singleton
     • ./capacitySummaryController.js  — formatMonthLabel, computeMonthWindow
   ============================================================================= */

import { connectDB } from "../config/db.js";
import { formatMonthLabel, computeMonthWindow } from "./capacitySummaryController.js";

/* -----------------------------------------------------------------------------
   HANDLER: getActivitySummary
   GET /api/reports
   -----------------------------------------------------------------------------
   Returns allocation totals grouped by activity name across a 6-month window.
   Supports optional filters for category, leader, requesting dept, requestor,
   and requestor VP. Results are joined from the allocation → assignment
   collections to resolve project-level metadata for filtering.

   QUERY PARAMS:
     start        {number}  YYYYMM — Start of the month window (required)
     months       {number}  Number of months to include (default: 6)
     category     {string}  Filter by allocation category (default: "all")
     leader       {string}  Filter by assignment leader (default: "all")
     dept         {string}  Filter by requesting_dept (default: "all")
     requestor    {string}  Filter by requestor name (default: "all")
     requestor_vp {string}  Filter by requestor VP name (default: "all")

   RESPONSE:
     { months: string[], data: [{ activity, months: { [label]: number } }] }

   SECURITY:
     • parseInt() with radix 10 on all numeric params — NaN → safe defaults.
     • Filter strings are matched with exact equality inside $match —
       never used as regex patterns or interpolated into field names.
     • $lookup uses server-controlled localField/foreignField paths.
     • preserveNullAndEmptyArrays: true on $unwind — prevents allocations
       without a matching assignment from being silently dropped.
----------------------------------------------------------------------------- */
export const getActivitySummary = async (req, res) => {
  try {
    const db = await connectDB();
    const allocationCol = db.collection("allocation");

    // Parse and destructure query params — all filter values are strings
    let { start, months, category, leader, dept, requestor, requestor_vp } = req.query;

    // parseInt with radix 10 — prevents octal parsing, NaN falls back to 6
    const monthsWindow = months ? parseInt(months, 10) : 6;
    const safeMonthsWindow = isNaN(monthsWindow) ? 6 : monthsWindow;

    // If start is missing, fall back to the most recent month in the allocation
    // collection that is <= the current month — prevents future-dated windows
    if (!start) {
      const allocMonths = await allocationCol.distinct("date");
      allocMonths.sort((a, b) => a - b);

      const today = new Date();
      const currentYYYYMM = today.getFullYear() * 100 + (today.getMonth() + 1);

      const valid = allocMonths.filter((m) => m <= currentYYYYMM);
      start = valid.length > 0 ? valid[valid.length - 1] : currentYYYYMM;
    }

    // parseInt the resolved start — safe even if it came from distinct()
    const startYYYYMM = parseInt(start, 10);
    const targetMonths = computeMonthWindow(startYYYYMM, safeMonthsWindow);

    // Build aggregation pipeline dynamically based on active filters
    const pipeline = [];

    // Stage 1: Match allocations within the target month window
    // category filter applied here — reduces documents before the join
    const initialMatch = { date: { $in: targetMonths } };
    if (category && category !== "all") {
      // Exact string equality — not a regex, no injection risk
      initialMatch.category = category;
    }
    pipeline.push({ $match: initialMatch });

    // Stage 2: Join allocation → assignment on activity/project_name
    // to resolve leader, dept, requestor, requestor_vp for filtering
    pipeline.push(
      {
        $lookup: {
          from: "assignment",
          localField: "activity",        // Server-controlled field path
          foreignField: "project_name",  // Server-controlled field path
          as: "projectDetails",
        },
      },
      {
        $unwind: {
          path: "$projectDetails",
          preserveNullAndEmptyArrays: true, // Keeps allocations with no matching assignment
        },
      }
    );

    // Stage 3: Apply assignment-level filters if any are active
    // Each filter uses exact equality — no regex or user-controlled field names
    const assignmentFilters = {};
    if (leader       && leader       !== "all") assignmentFilters["projectDetails.leader"]          = leader;
    if (dept         && dept         !== "all") assignmentFilters["projectDetails.requesting_dept"] = dept;
    if (requestor    && requestor    !== "all") assignmentFilters["projectDetails.requestor"]       = requestor;
    if (requestor_vp && requestor_vp !== "all") assignmentFilters["projectDetails.requestor_vp"]   = requestor_vp;

    if (Object.keys(assignmentFilters).length > 0) {
      pipeline.push({ $match: assignmentFilters });
    }

    // Stage 4: Group by activity + date to get monthly totals per activity
    // Stage 5: Re-group by activity to collect all month totals into an array
    // Stage 6: Project to clean output shape (remove _id, rename fields)
    // Stage 7: Sort alphabetically by activity name
    pipeline.push(
      {
        $group: {
          _id: { activity: "$activity", date: "$date" },
          totalAmount: { $sum: "$amount" },
        },
      },
      {
        $group: {
          _id: "$_id.activity",
          monthlyTotals: {
            $push: { date: "$_id.date", amount: "$totalAmount" },
          },
        },
      },
      {
        $project: {
          _id: 0,
          activity: "$_id",
          monthlyTotals: 1,
        },
      },
      { $sort: { activity: 1 } }
    );

    const rawData = await allocationCol.aggregate(pipeline).toArray();

    // Transform raw pipeline output into { activity, months: { label: amount } }
    // All target months are initialised to 0 — prevents undefined in frontend cells
    const result = rawData.map((row) => {
      const monthMap = {};

      // Initialise all months to 0 — ensures every column has a value
      targetMonths.forEach((m) => {
        monthMap[formatMonthLabel(m)] = 0;
      });

      // Fill actual aggregated values — overwrites the 0 defaults
      row.monthlyTotals.forEach((m) => {
        monthMap[formatMonthLabel(m.date)] = m.amount;
      });

      return { activity: row.activity, months: monthMap };
    });

    const formattedMonths = targetMonths.map((m) => formatMonthLabel(m));

    return res.status(200).json({ months: formattedMonths, data: result });

  } catch (err) {
    // Log full error server-side — generic message returned to client
    console.error("Error in getActivitySummary:", err);
    return res.status(500).json({ error: "Failed to load activity allocation summary" });
  }
};

/* -----------------------------------------------------------------------------
   HANDLER: getActivityFilters
   GET /api/reports/filters
   -----------------------------------------------------------------------------
   Returns the dropdown option lists for the activity report filters:
     leaders, requestors, requestor_vp, requesting_dept

   Leaders are sourced from the account collection scoped to acc_type_id === 1
   (Resource Manager role) and resolved to emp_name via an employee join.
   All other lists use distinct() on the assignment collection.

   RESPONSE:
     {
       leaders: string[],
       requestors: string[],
       requestor_vp: string[],
       requesting_dept: string[]
     }

   SECURITY:
     • No user input is used in any query — all filter lists are derived
       entirely from server-side collection queries.
     • distinct() field paths are server-controlled string literals —
       no user input reaches the field name argument.
     • Leaders are scoped to acc_type_id === 1 (numeric equality) —
       prevents other account types from appearing in the leader dropdown.
     • $exists + $ne "" filters on distinct() calls — prevents empty
       strings from populating dropdown options.
     • Errors in individual parallel queries are caught at the Promise.all
       level — a failure in one list does not crash the entire endpoint.
----------------------------------------------------------------------------- */
export const getActivityFilters = async (req, res) => {
  try {
    const db = await connectDB();

    // Run all four filter queries in parallel — reduces total response time
    // Each query uses only server-controlled field paths and values
    const [leadersResult, requestors, requestor_vp, departments] = await Promise.all([

      // Leaders: accounts with acc_type_id === 1, resolved to emp_name via employee join
      // acc_type_id === 1 is a numeric equality match — scoped to Resource Managers only
      db.collection("account").aggregate([
        { $match: { "account.acc_type_id": 1 } },
        {
          $lookup: {
            from: "employee",
            localField: "emp_id",
            foreignField: "emp_id",
            as: "emp_details"
          }
        },
        { $unwind: "$emp_details" },
        { $group: { _id: "$emp_details.emp_name" } },
        { $sort: { _id: 1 } }
      ]).toArray(),

      // Requestors: distinct requestor values from assignment collection
      // $exists + $ne "" prevents empty strings in the dropdown
      db.collection("assignment").distinct("requestor", {
        requestor: { $exists: true, $ne: "" },
      }),

      // Requestor VPs: distinct requestor_vp values from assignment collection
      db.collection("assignment").distinct("requestor_vp", {
        requestor_vp: { $exists: true, $ne: "" },
      }),

      // Departments: distinct dept_name values from department collection
      db.collection("department").distinct("dept_name", {
        dept_name: { $exists: true, $ne: "" }
      })
    ]);

    return res.json({
      leaders:         leadersResult.map((l) => l._id), // Extract name string from aggregation result
      requestors,
      requestor_vp,
      requesting_dept: departments.sort(), // Sort alphabetically — distinct() order is not guaranteed
    });

  } catch (error) {
    // Log full error server-side — generic message returned to client
    console.error("getActivityFilters error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/* -----------------------------------------------------------------------------
   HANDLER: getEmployeeCapacity
   GET /api/reports/capacity
   -----------------------------------------------------------------------------
   Returns per-employee allocation totals across a configurable month window.
   Each employee row contains a months map { [label]: totalAmount } for
   rendering in the Allocation per Person table.

   QUERY PARAMS:
     start  {number}  YYYYMM — Start of the month window (default: 202501)
     months {number}  Number of months to include (default: 6)

   RESPONSE:
     {
       months: string[],
       data: [{ emp_name: string, months: { [label]: number } }]
     }

   SECURITY:
     • parseInt() with radix 10 on both params — NaN falls back to safe defaults
       (202501 for start, 6 for months) rather than producing an invalid query.
     • targetMonths array is computed server-side from validated integers —
       no user input reaches the $in array directly.
     • The $lookup uses $expr with server-controlled field references ($emp_id)
       and the validated targetMonths array — user-supplied values never appear
       in field name positions.
     • _id is excluded from the $project — prevents internal MongoDB IDs
       from being returned to the client.
     • All target months are initialised to 0 in the result map — ensures every
       column renders a value even for employees with no allocations that month.
     • Generic error message returned to client — full error logged server-side.
----------------------------------------------------------------------------- */
export const getEmployeeCapacity = async (req, res) => {
  try {
    const db = await connectDB();

    const startParam  = req.query.start;
    const monthsParam = req.query.months;

    // parseInt with radix 10 + NaN fallbacks — safe defaults prevent invalid queries
    const startMonth  = startParam  ? parseInt(startParam,  10) : 202501;
    const monthsWindow = monthsParam ? parseInt(monthsParam, 10) : 6;
    const safeStart   = isNaN(startMonth)   ? 202501 : startMonth;
    const safeMonths  = isNaN(monthsWindow) ? 6      : monthsWindow;

    const targetMonths = computeMonthWindow(safeStart, safeMonths);

    // Aggregate employee → allocation join to get per-month totals per employee
    const pipeline = [
      {
        // Join each employee to their allocations within the target month window
        // $expr uses server-controlled field references — no user input in field paths
        $lookup: {
          from: "allocation",
          let: { empId: "$emp_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq:  ["$emp_id", "$$empId"] },
                    { $in: ["$date", targetMonths] } // targetMonths is server-computed
                  ],
                },
              },
            },
            {
              // Group by date to get total allocation per month per employee
              $group: {
                _id: "$date",
                totalAmount: { $sum: "$amount" },
              },
            },
          ],
          as: "monthlyData",
        },
      },
      {
        // Project only the fields needed — _id excluded to prevent internal ID leakage
        $project: {
          _id: 0,
          emp_name: 1,
          emp_id: 1,
          capacities: {
            $map: {
              input: "$monthlyData",
              as: "cap",
              in: { date: "$$cap._id", amount: "$$cap.totalAmount" },
            },
          },
        },
      },
      { $sort: { emp_name: 1 } }, // Sort alphabetically by name
    ];

    const employeesRaw = await db.collection("employee").aggregate(pipeline).toArray();

    // Transform raw pipeline output into { emp_name, months: { label: amount } }
    // All target months are initialised to 0 — ensures every column has a value
    const result = employeesRaw.map((emp) => {
      const monthMap = {};

      // Initialise all target months to 0 — prevents undefined in frontend table cells
      targetMonths.forEach((m) => {
        monthMap[formatMonthLabel(m)] = 0;
      });

      // Fill actual allocation values — overwrites the 0 defaults
      emp.capacities.forEach((c) => {
        monthMap[formatMonthLabel(c.date)] = c.amount;
      });

      return { emp_name: emp.emp_name, months: monthMap };
    });

    return res.status(200).json({
      months: targetMonths.map((m) => formatMonthLabel(m)),
      data: result,
    });

  } catch (err) {
    // Log full error server-side — generic message returned to client
    console.error("getEmployeeCapacity error:", err);
    return res.status(500).json({ error: "Failed to load capacity data" });
  }
};