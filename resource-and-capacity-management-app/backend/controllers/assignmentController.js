/* =============================================================================
   assignmentController.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Handles all business logic for the Assignments & Allocations resource.
     Each exported function maps to a route defined in assignmentRoutes.js.
     All database access goes through the connectDB() singleton.

   KEY CONCEPTS:
     • Allocation = a single FTE amount for one employee on one project in one month
     • Assignment = the parent project record (name, category, leader, status, etc.)
     • The allocations grid shows 29 months: 12 past + current + 16 future

   BUSINESS RULES:
     • When a new allocation is created, all future allocations for that
       employee/activity/category are deleted first, then the current month
       is seeded with amount = 1
     • When an assignment is reassigned (different employee or project), ALL
       allocation records for the old combination are deleted, and a new
       current-month allocation is created for the new combination
     • "Future" means date > current YYYYMM — historical records are never deleted

   SECURITY MODEL:
     • emp_id values from URL params or request bodies are always parsed with
       Number() or parseInt() before use in DB queries — prevents string-typed
       IDs from producing unexpected query results
     • ObjectId conversion for MongoDB _id fields is done inside the handler
       so malformed IDs throw and are caught by the global error handler
     • No raw user input is interpolated into query strings — all values are
       passed as typed MongoDB query parameters
     • Sensitive fields (passwords, account internals) are never returned in
       any response from this controller

   HELPER FUNCTIONS:
     • buildMonthRange()              — Generates the 29-month rolling window
     • getCurrentMonth()              — Returns the current date as YYYYMM integer
     • deleteFutureAllocations()      — Removes future allocations for a given scope
     • createCurrentMonthAllocation() — Upserts a current-month allocation at amount = 1

   DEPENDENCIES:
     • ../config/db.js — MongoDB connection singleton
     • mongodb         — ObjectId for _id-based queries
   ============================================================================= */

import { connectDB } from "../config/db.js";
import { ObjectId } from "mongodb";

/* =============================================================================
   HELPER FUNCTIONS
   ============================================================================= */

/* -----------------------------------------------------------------------------
   FUNCTION: buildMonthRange
   -----------------------------------------------------------------------------
   Generates a rolling array of 29 YYYYMM month strings centred on the current
   month: 12 months before + current month + 16 months ahead.

   This defines the visible column range for the allocations grid. Allocation
   records outside this window are loaded from the DB but not displayed.

   RETURNS: {string[]} — e.g. ["202301", "202302", ..., "202505"]
----------------------------------------------------------------------------- */
function buildMonthRange() {
  const months = [];
  const now    = new Date();

  // Start 12 months before the current month
  const start = new Date(now);
  start.setMonth(start.getMonth() - 12);
  start.setDate(1); // Normalise to 1st of month to avoid day-boundary issues

  // 12 before + 1 current + 16 ahead = 29 months total
  for (let i = 0; i < 29; i++) {
    const y = start.getFullYear();
    const m = start.getMonth() + 1;
    months.push(`${y}${m.toString().padStart(2, "0")}`);
    start.setMonth(start.getMonth() + 1);
  }

  return months;
}

/* -----------------------------------------------------------------------------
   FUNCTION: getCurrentMonth
   -----------------------------------------------------------------------------
   Returns the current month as a YYYYMM integer (e.g. 202503 for March 2025).
   Allocation dates are stored as integers in this format — using the same
   format here ensures consistent comparisons without type coercion issues.

   RETURNS: {number} — Current month as YYYYMM integer
----------------------------------------------------------------------------- */
function getCurrentMonth() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return Number(`${year}${month}`);
}

/* -----------------------------------------------------------------------------
   FUNCTION: deleteFutureAllocations
   -----------------------------------------------------------------------------
   Deletes all allocation records for a given employee/activity/category where
   the date is strictly greater than the current month. Historical and current
   month records are always preserved.

   Called before creating a new allocation to clear stale future bookings
   that would conflict with the new assignment going forward.

   PARAM: db       {Db}     — Active MongoDB database instance
   PARAM: emp_id   {number} — Employee ID to scope the deletion
   PARAM: activity {string} — Project/activity name to scope the deletion
   PARAM: category {string} — Category to further scope the deletion
----------------------------------------------------------------------------- */
async function deleteFutureAllocations(db, emp_id, activity, category) {
  const currentMonth = getCurrentMonth();

  // $gt ensures only future months are deleted — current and past are untouched
  await db.collection("allocation").deleteMany({
    emp_id,
    activity,
    category,
    date: { $gt: currentMonth }
  });
}

/* -----------------------------------------------------------------------------
   FUNCTION: createCurrentMonthAllocation
   -----------------------------------------------------------------------------
   Upserts an allocation record for the current month with amount = 1.
   If a record already exists for this employee/activity/category/month
   it is updated in place. If not, a new record is inserted.

   Amount = 1 is the default starting allocation for any new assignment —
   the resource manager can adjust it inline in the allocations grid.

   PARAM: db       {Db}     — Active MongoDB database instance
   PARAM: emp_id   {number} — Employee ID for the allocation
   PARAM: activity {string} — Project/activity name for the allocation
   PARAM: category {string} — Category for the allocation
----------------------------------------------------------------------------- */
async function createCurrentMonthAllocation(db, emp_id, activity, category) {
  const currentMonth = getCurrentMonth();

  await db.collection("allocation").updateOne(
    { emp_id, activity, category, date: currentMonth },
    {
      $set: {
        amount:   1,            // Default starting allocation
        activity,
        category,
        date:     currentMonth
      }
    },
    { upsert: true } // Insert if not found, update if already exists
  );
}

/* =============================================================================
   HANDLERS
   ============================================================================= */

/* -----------------------------------------------------------------------------
   HANDLER: getAllAllocations
   GET /api/assignments-allocations
   -----------------------------------------------------------------------------
   Returns all allocation rows joined across the employee, assignment, and
   allocation collections, shaped into a grid-ready format with the 29-month
   rolling window. Optionally filters to a single user's assignments via the
   ?username= query param (used for the "My Assignments" tab).

   JOIN STRATEGY:
     Rows are keyed by "emp_id||assignment._id" — one row per unique
     employee+project combination. Allocation amounts are bucketed into
     the allocations object by YYYYMM key. This avoids multiple DB round
     trips and keeps the shaping logic server-side.

   RESPONSE SHAPE:
     {
       allAssignments: [...],  — Full grid for all employees
       myAssignments:  [...],  — Filtered to the requesting user
       months:         [...]   — 29-month YYYYMM array for grid columns
     }

   SECURITY:
     • username is used only to look up emp_id via the account collection —
       the client never sends emp_id directly, preventing ID spoofing
     • Only display-safe fields are included — passwords and account
       internals are never returned
----------------------------------------------------------------------------- */
export const getAllAllocations = async (req, res) => {
  try {
    const db       = await connectDB();
    const username = req.query.username; // Optional — drives "My Assignments" filter

    // Load all required collections in parallel — avoids sequential round trips
    const employees   = await db.collection("employee").find({}).toArray();
    const assignments = await db.collection("assignment").find({}).toArray();
    const allocations = await db.collection("allocation").find({}).toArray();
    const departments = await db.collection("department").find({}).toArray();

    // 29-month rolling window — defines visible grid columns
    const months = buildMonthRange();

    /* -------------------------------------------------------------------------
       BUILD LOOKUP MAPS
       O(1) access during the join loop below — much faster than .find() per row.
    --------------------------------------------------------------------------- */
    const deptMap = new Map();
    departments.forEach(d => {
      if (d.dept_no) deptMap.set(d.dept_no, d.dept_name || d.dept_no);
    });

    const employeeById = new Map();
    employees.forEach(e => employeeById.set(e.emp_id, e));

    // Composite key for assignment lookup — project_name alone is not unique
    // since the same project can have multiple categories
    const assignmentKey   = (activity, category) => `${activity}||${category}`;
    const assignmentByKey = new Map();
    assignments.forEach(a => {
      assignmentByKey.set(assignmentKey(a.project_name, a.category), a);
    });

    /* -------------------------------------------------------------------------
       BUILD ROWS MAP
       One row per unique employee+assignment combination.
       Allocation amounts are stored in the row's allocations object keyed by YYYYMM.
       Only months within the 29-month window are included.
    --------------------------------------------------------------------------- */
    const rowsMap = new Map();

    for (const alloc of allocations) {
      const emp        = employeeById.get(alloc.emp_id);
      if (!emp) continue; // Skip orphaned allocations with no matching employee

      const assignment = assignmentByKey.get(assignmentKey(alloc.activity, alloc.category));
      if (!assignment) continue; // Skip allocations with no matching assignment

      const rowKey = `${emp.emp_id}||${assignment._id}`;

      // Initialise the row object on first encounter for this combination
      if (!rowsMap.has(rowKey)) {
        rowsMap.set(rowKey, { employee: emp, assignment, allocations: {} });
      }

      const row     = rowsMap.get(rowKey);
      const dateStr = String(alloc.date);

      // Only include months within the visible 29-month window
      if (months.includes(dateStr)) {
        row.allocations[dateStr] = alloc.amount;
      }
    }

    /* -------------------------------------------------------------------------
       SHAPE INTO DISPLAY-SAFE RESPONSE OBJECTS
       Resolves dept names, manager names, and requesting dept names server-side.
       Raw DB documents are never sent to the client.
    --------------------------------------------------------------------------- */
    const allAssignments = Array.from(rowsMap.values()).map(row => {
      const empDeptName = deptMap.get(row.employee.dept_no) || "";

      // Resolve requesting dept — may be a dept code or already a name
      const reqDeptCode = row.assignment.requesting_dept;
      const reqDeptName = reqDeptCode
        ? deptMap.get(reqDeptCode) || reqDeptCode
        : "";

      // Resolve manager name from reports_to emp_id
      const reportsToId = row.employee.reports_to || "";
      const managerEmp  = reportsToId ? employeeById.get(reportsToId) : null;
      const managerName = managerEmp?.emp_name || "";

      return {
        employee: {
          emp_id:       row.employee.emp_id,
          emp_name:     row.employee.emp_name,
          emp_title:    row.employee.emp_title,
          dept_name:    empDeptName,
          reports_to:   reportsToId,
          manager_name: managerName
        },
        assignment: {
          _id:                  row.assignment._id,
          project_name:         row.assignment.project_name,
          category:             row.assignment.category,
          leader:               row.assignment.leader,
          requestor:            row.assignment.requestor,
          requestor_vp:         row.assignment.requestor_vp,
          requesting_dept:      reqDeptCode,
          requesting_dept_name: reqDeptName,
          status:               row.assignment.status,
          target_period:        row.assignment.target_period,
          completion_date:      row.assignment.completion_date,
          description:          row.assignment.description,
          resource_notes:       row.assignment.resource_notes
        },
        allocations: row.allocations
      };
    });

    /* -------------------------------------------------------------------------
       MY ASSIGNMENTS FILTER
       Derive emp_id from the username via the account collection —
       the client never provides emp_id directly to prevent ID spoofing.
    --------------------------------------------------------------------------- */
    let myAssignments = [];

    if (username) {
      const account = await db.collection("account").findOne({
        "account.username": username
      });

      if (account) {
        myAssignments = allAssignments.filter(
          r => r.employee.emp_id === account.emp_id
        );
      }
    }

    return res.json({ allAssignments, myAssignments, months });

  } catch (error) {
    console.error("assignments-allocations GET error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/* -----------------------------------------------------------------------------
   HANDLER: getAllocationById
   GET /api/assignments-allocations/:id
   -----------------------------------------------------------------------------
   Returns a single employee record with their most relevant assignment,
   plus manager dropdown data for the edit form. If ?project= is provided,
   loads that specific assignment. Otherwise falls back to the employee's
   most recently dated allocation.

   SECURITY:
     • emp_id is parsed with parseInt() — non-numeric values return 400
     • project query param is used in a findOne() equality match — safe
     • Manager list is scoped to acc_type_id === 1 — only Resource Managers
       are returned, not all accounts
     • Response never includes password or account fields
----------------------------------------------------------------------------- */
export const getAllocationById = async (req, res) => {
  try {
    const db     = await connectDB();
    const emp_id = parseInt(req.params.id, 10);
    const project = req.query.project; // Optional: load a specific assignment

    if (!emp_id || isNaN(emp_id)) {
      return res.status(400).json({ error: "Invalid emp_id" });
    }

    const employee = await db.collection("employee").findOne({ emp_id });
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    let assignment = null;

    if (project) {
      // Specific project requested — load that assignment directly
      assignment = await db.collection("assignment").findOne({ project_name: project });
    }

    if (!assignment) {
      // No specific project or not found — fall back to most recently dated allocation
      const allocations = await db.collection("allocation")
        .find({ emp_id })
        .sort({ date: -1 }) // Most recent first
        .toArray();

      if (allocations.length > 0) {
        const latest = allocations[0];
        assignment = await db.collection("assignment").findOne({
          project_name: latest.activity,
          category:     latest.category
        });
      }
    }

    // Load manager dropdown — scoped to Resource Manager role only
    const managerAccounts = await db.collection("account")
      .find({ "account.acc_type_id": 1 })
      .toArray();

    const managerIds = managerAccounts.map(a => a.emp_id);

    const managers = await db.collection("employee")
      .find({ emp_id: { $in: managerIds } })
      .toArray();

    return res.json({ row: { employee, assignment }, dropdowns: { managers } });

  } catch (err) {
    console.error("GET ONE allocation error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* -----------------------------------------------------------------------------
   HANDLER: getDeptForEmployee
   GET /api/assignments-allocations/employee/:empId/department
   -----------------------------------------------------------------------------
   Looks up the requesting department for a given VP name by finding an
   assignment record where requestor_vp matches. Used to auto-populate the
   Requesting Dept field in the initiative form when a Requestor is selected.

   SECURITY:
     • name query param is required — returns 400 if missing
     • Used in a MongoDB equality match — no injection risk
     • Returns only the requesting_dept field via projection
----------------------------------------------------------------------------- */
export const getDeptForEmployee = async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ error: "Missing name" });
    }

    const db = await connectDB();

    // Find an assignment for this VP that has a non-null requesting_dept
    const doc = await db.collection("assignment").findOne(
      { requestor_vp: name, requesting_dept: { $ne: null } },
      { projection: { requesting_dept: 1 } } // Only return the field we need
    );

    if (!doc) {
      return res.status(404).json({ error: "Not found" });
    }

    return res.json({ dept_name: doc.requesting_dept });

  } catch (error) {
    console.error("GetDept error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/* -----------------------------------------------------------------------------
   HANDLER: getProjects
   GET /api/assignments-allocations/projects
   -----------------------------------------------------------------------------
   Returns all active projects for the assignment dropdown. If ?project= is
   provided, returns the full assignment record for that specific project
   (used to auto-populate read-only fields in the Add/Edit Allocation modals).

   Active means status is not Completed or Cancelled — closed projects should
   not appear in the assignment dropdown.

   SECURITY:
     • project query param is used in a findOne() equality match — safe
     • $nin excludes terminal statuses — user cannot bypass this filter
     • List query projects only project_name — minimises data exposure
----------------------------------------------------------------------------- */
export const getProjects = async (req, res) => {
  try {
    const { project } = req.query;
    const db = await connectDB();

    if (project) {
      // Specific project requested — return the full assignment record
      const assignment = await db.collection("assignment").findOne({ project_name: project });
      return res.json({ assignment });
    }

    // Return all active projects — exclude terminal statuses
    const projects = await db.collection("assignment")
      .find({ status: { $nin: ["Completed", "Cancelled"] } })
      .project({ project_name: 1, _id: 0 }) // Dropdown only needs the name
      .toArray();

    return res.json({ projects });

  } catch (error) {
    console.error("get-projects error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/* -----------------------------------------------------------------------------
   HANDLER: getEmployee
   GET /api/assignments-allocations/employee/:empId
   -----------------------------------------------------------------------------
   Returns a single employee record with their department name resolved.
   Used by the Add/Edit Allocation modals to auto-populate read-only fields
   when an employee is selected from the dropdown.

   SECURITY:
     • emp_id is coerced with Number() — falsy values (NaN, 0) return 400
     • Department name is resolved server-side — client never queries
       the department collection directly
----------------------------------------------------------------------------- */
export const getEmployee = async (req, res) => {
  try {
    const emp_id = Number(req.params.empId);

    if (!emp_id) {
      return res.status(400).json({ error: "emp_id is required" });
    }

    const db       = await connectDB();
    const employee = await db.collection("employee").findOne({ emp_id });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Resolve the human-readable department name from the employee's dept_no
    const department = await db.collection("department").findOne({
      dept_no: employee.dept_no
    });

    return res.json({
      employee,
      department_name: department?.dept_name || null
    });

  } catch (error) {
    console.error("get-employee error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/* -----------------------------------------------------------------------------
   HANDLER: getDMEmployees
   GET /api/assignments-allocations/employees/dm
   -----------------------------------------------------------------------------
   Returns all employees in the Data Management department (dept_no: "D01").
   Used to populate the employee dropdown in the Add/Edit Allocation modals,
   which is scoped to DM employees only.

   SECURITY:
     • Query is hardcoded to dept_no "D01" — no user input used
     • Projection limits returned fields to display-safe values only
----------------------------------------------------------------------------- */
export const getDMEmployees = async (req, res) => {
  try {
    const db = await connectDB();

    const employees = await db.collection("employee")
      .find({ dept_no: "D01" }) // Data Management department only
      .project({
        emp_id:     1,
        emp_name:   1,
        dept_no:    1,
        reports_to: 1,
        _id:        0  // Exclude MongoDB _id — not needed by the frontend
      })
      .toArray();

    return res.json({ employees });

  } catch (error) {
    console.error("get-dm-employees error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/* -----------------------------------------------------------------------------
   HANDLER: editAllocationAmount
   PUT /api/assignments-allocations/:id/amount
   -----------------------------------------------------------------------------
   Updates a single allocation cell amount for a specific employee/activity/
   category/month combination. Creates the record if it doesn't exist (upsert).
   This is the inline edit handler — called when a user edits a cell in the
   allocations grid and blurs the input.

   SECURITY:
     • All values from req.body are used as typed MongoDB parameters
     • month is coerced to Number() — allocation dates are stored as integers
     • amount can be null (to clear a cell) or a number — both handled explicitly
----------------------------------------------------------------------------- */
export const editAllocationAmount = async (req, res) => {
  try {
    const { emp_id, month, amount, activity, category } = req.body;

    const db = await connectDB();

    await db.collection("allocation").updateOne(
      {
        emp_id,
        activity,
        category,
        date: Number(month) // Coerce to integer — allocation dates stored as YYYYMM integers
      },
      {
        $set: {
          amount:   amount === null ? null : Number(amount), // Preserve null to clear cells
          activity,
          category,
          date:     Number(month)
        }
      },
      { upsert: true } // Create the record if it doesn't already exist
    );

    return res.json({ success: true });

  } catch (err) {
    console.error("editAllocationAmount error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* -----------------------------------------------------------------------------
   HANDLER: deleteAllocation
   DELETE /api/assignments-allocations/:id
   -----------------------------------------------------------------------------
   Deletes a single allocation record identified by the four-field compound key:
   emp_id + activity + category + month. Called when a user clears the last
   allocation for an employee/project row in the grid and confirms the dialog.

   SECURITY:
     • All values used as typed MongoDB parameters — no raw input interpolation
     • month is coerced to Number() to match integer storage format
     • Four-field compound match ensures only the intended record is deleted
----------------------------------------------------------------------------- */
export const deleteAllocation = async (req, res) => {
  try {
    const { emp_id, month, activity, category } = req.body;

    const db = await connectDB();

    // Precise compound match — prevents accidental deletion of other records
    await db.collection("allocation").deleteOne({
      emp_id,
      activity,
      category,
      date: Number(month) // Match the integer storage format
    });

    return res.json({ success: true });

  } catch (err) {
    console.error("deleteAllocation error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* -----------------------------------------------------------------------------
   HANDLER: updateAllocation
   PUT /api/assignments-allocations/:id
   -----------------------------------------------------------------------------
   Updates the assignment metadata record (not the allocation amounts — those
   use editAllocationAmount). Called by the Edit modal when saving changes to
   project name, status, leader, etc.

   SECURITY:
     • id is required — returns 400 if missing
     • new ObjectId(id) throws on invalid format — caught by error handler
     • All fields are explicitly mapped — no dynamic key assignment that
       could allow arbitrary fields to be written
     • updated_at is set server-side — client cannot spoof the timestamp
----------------------------------------------------------------------------- */
export const updateAllocation = async (req, res) => {
  try {
    const {
      id, project, category, lead, status, requestor, requestor_vp,
      completion_date, target_period, description, resource_consideration,
      requesting_dept
    } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Missing assignment ID" });
    }

    const db = await connectDB();

    await db.collection("assignment").updateOne(
      { _id: new ObjectId(id) }, // Throws on malformed id — caught by error handler
      {
        $set: {
          project_name:    project,
          category,
          leader:          lead,
          status,
          requestor,
          requestor_vp,
          requesting_dept,
          department:      requesting_dept,       // Kept in sync with requesting_dept
          target_period,
          completion_date: completion_date || null, // Explicit null if not provided
          description,
          resource_notes:  resource_consideration || "",
          updated_at:      new Date()              // Server-side timestamp — not client-controlled
        }
      }
    );

    return res.json({ success: true });

  } catch (error) {
    console.error("updateAllocation error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/* -----------------------------------------------------------------------------
   HANDLER: getAllocationDropdowns
   GET /api/assignments-allocations/meta/dropdowns
   -----------------------------------------------------------------------------
   Returns all dropdown data needed for the allocation UI forms: employees,
   managers, projects, categories, leaders, requestors, and requesting depts.
   All lists are deduplicated and sorted alphabetically using aggregation pipelines.

   SECURITY:
     • No user input is used in any query — all results derived from existing data
     • Aggregation $match stages exclude null values before grouping,
       preventing null entries from appearing in dropdown lists
     • Projection limits returned fields to display-safe values only
----------------------------------------------------------------------------- */
export const getAllocationDropdowns = async (req, res) => {
  try {
    const db = await connectDB();

    // All queries run in parallel — no inter-dependency between these collections
    const [employees, managers, projects, categories, leaders, requestors, requestingDepts] =
      await Promise.all([
        // All employees for the employee selector
        db.collection("employee")
          .find({})
          .project({ emp_id: 1, emp_name: 1 })
          .sort({ emp_name: 1 })
          .toArray(),

        // Distinct manager names — deduped via aggregation
        db.collection("employee")
          .aggregate([
            { $match: { manager_name: { $ne: null } } },
            { $group: { _id: "$manager_name" } },
            { $project: { name: "$_id", _id: 0 } },
            { $sort: { name: 1 } }
          ]).toArray(),

        // Distinct active project names
        db.collection("assignment")
          .aggregate([
            { $match: { project_name: { $ne: null } } },
            { $group: { _id: "$project_name" } },
            { $project: { name: "$_id", _id: 0 } },
            { $sort: { name: 1 } }
          ]).toArray(),

        // Distinct categories
        db.collection("assignment")
          .aggregate([
            { $match: { category: { $ne: null } } },
            { $group: { _id: "$category" } },
            { $project: { name: "$_id", _id: 0 } },
            { $sort: { name: 1 } }
          ]).toArray(),

        // Distinct leaders
        db.collection("assignment")
          .aggregate([
            { $match: { leader: { $ne: null } } },
            { $group: { _id: "$leader" } },
            { $project: { name: "$_id", _id: 0 } },
            { $sort: { name: 1 } }
          ]).toArray(),

        // Distinct requestors — merged from both requestor and requestor_vp fields
        // $unwind flattens the two-element array so each name is deduped independently
        db.collection("assignment")
          .aggregate([
            { $project: { names: ["$requestor", "$requestor_vp"] } },
            { $unwind: "$names" },
            { $match: { names: { $ne: null } } },
            { $group: { _id: "$names" } },
            { $project: { name: "$_id", _id: 0 } },
            { $sort: { name: 1 } }
          ]).toArray(),

        // Distinct requesting department names
        db.collection("assignment")
          .aggregate([
            { $match: { requesting_dept_name: { $ne: null } } },
            { $group: { _id: "$requesting_dept_name" } },
            { $project: { name: "$_id", _id: 0 } },
            { $sort: { name: 1 } }
          ]).toArray(),
      ]);

    return res.json({
      employees, managers, projects, categories,
      leaders, requestors, requestingDepts
    });

  } catch (error) {
    console.error("Dropdowns error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/* -----------------------------------------------------------------------------
   HANDLER: createAllocation
   POST /api/assignments-allocations
   -----------------------------------------------------------------------------
   Creates a new employee-to-project allocation by:
     1. Deleting all future allocations for this employee/activity/category
     2. Seeding the current month with amount = 1

   The assignment record (project metadata) must already exist — this handler
   only creates the allocation link between the employee and the project.

   SECURITY:
     • emp_id and project are both required — returns 400 if missing
     • project is used to look up the assignment by name — not injected into
       a raw query string
     • emp_id is coerced to Number() before all DB operations
----------------------------------------------------------------------------- */
export const createAllocation = async (req, res) => {
  try {
    const { emp_id, project } = req.body;

    if (!emp_id || !project) {
      return res.status(400).json({ error: "Missing emp_id or project" });
    }

    const db = await connectDB();

    // Look up the assignment to get the canonical activity name and category
    const assignment = await db.collection("assignment").findOne({ project_name: project });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found for this project" });
    }

    const { project_name: activity, category } = assignment;

    // Step 1: Clear stale future allocations that would conflict with the new assignment
    await deleteFutureAllocations(db, Number(emp_id), activity, category);

    // Step 2: Seed the current month with the default allocation amount
    await createCurrentMonthAllocation(db, Number(emp_id), activity, category);

    return res.json({ success: true });

  } catch (error) {
    console.error("createAllocation error:", error);
    return res.status(500).json({ error: "Server error while adding allocation" });
  }
};

/* -----------------------------------------------------------------------------
   HANDLER: reassignAllocation
   POST /api/assignments-allocations/reassign
   -----------------------------------------------------------------------------
   Moves an employee from one project/assignment to another by:
     1. Deleting ALL allocation records (past + current + future) for the old
        employee/project/category — completely removing the old assignment link
     2. Creating a new current-month allocation (amount = 1) for the new
        employee/project/category combination

   Unlike createAllocation (which only deletes future records), reassign
   deletes the full history because the assignment itself is changing —
   keeping historical allocations for the old assignment would be misleading.

   SECURITY:
     • All four core fields are validated — returns 400 if any are missing
     • emp_id values are coerced to Number() before all DB operations
     • deleteMany() is scoped to a precise three-field compound match —
       cannot accidentally delete records for other employees or projects
     • Upsert on the new allocation prevents duplicates if the employee
       already has a record for the new project/month
----------------------------------------------------------------------------- */
export const reassignAllocation = async (req, res) => {
  try {
    const {
      old_emp_id, new_emp_id,
      old_project, new_project,
      old_category, new_category
    } = req.body;

    if (!old_emp_id || !new_emp_id || !old_project || !new_project) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const db = await connectDB();

    // Step 1: Delete ALL records for the old assignment — past, current, and future
    // This is intentional: the employee is being fully removed from the old project
    await db.collection("allocation").deleteMany({
      emp_id:   Number(old_emp_id),
      activity: old_project,
      category: old_category
    });

    // Step 2: Create a new current-month allocation for the new assignment
    const currentMonth = getCurrentMonth();

    await db.collection("allocation").updateOne(
      {
        emp_id:   Number(new_emp_id),
        activity: new_project,
        category: new_category,
        date:     currentMonth
      },
      {
        $set: {
          amount:   1,             // Default starting allocation
          activity: new_project,
          category: new_category,
          date:     currentMonth
        }
      },
      { upsert: true } // Prevent duplicate if the employee already has this record
    );

    return res.json({ success: true });

  } catch (error) {
    console.error("reassignAllocation error:", error);
    return res.status(500).json({ error: "Server error while reassigning" });
  }
};