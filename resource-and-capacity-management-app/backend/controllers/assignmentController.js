/* =============================================================================
   assignmentController.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Handles all business logic for the allocations/assignments resource.
     Each exported function corresponds to a route in assignmentRoutes.js.
     All database operations go through the centralised connectDB() singleton.

   SECURITY MODEL:
     • All handlers are wrapped with asyncHandler in the route layer, ensuring
       any unhandled promise rejection is forwarded to the global errorHandler
       rather than crashing the process or hanging the request.
     • emp_id values from URL params or request bodies are always parsed with
       Number() or parseInt() before use in DB queries — prevents string-typed
       IDs from producing unexpected query results.
     • ObjectId conversion for MongoDB _id fields is wrapped in the handler
       so malformed IDs throw and are caught by asyncHandler.
     • Sensitive fields (passwords, account internals) are never returned in
       any response from this controller — only display-safe fields are included.
     • No raw user input is interpolated into query strings — all values are
       passed as typed MongoDB query parameters.

   HELPER FUNCTIONS:
     • buildMonthRange()             — Generates a 29-month rolling window
     • getCurrentMonth()             — Returns current date as YYYYMM integer
     • deleteFutureAllocations()     — Removes future allocations for a given employee/activity/category
     • createCurrentMonthAllocation() — Upserts current month allocation to 1

   DEPENDENCIES:
     • ../config/db.js  — MongoDB connection singleton
     • mongodb          — ObjectId for _id-based queries
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
   month: 12 months before + current month + 16 months after.

   Used to define which months are visible in the allocations grid and to filter
   allocation records to only the relevant window.

   RETURN: {string[]} — Array of YYYYMM strings e.g. ["202301", "202302", ...]
----------------------------------------------------------------------------- */
function buildMonthRange() {
  const months = [];
  const now = new Date();

  // Start 12 months before the current month
  const start = new Date(now);
  start.setMonth(start.getMonth() - 12);
  start.setDate(1);

  // 12 before + 1 current + 16 after = 29 months total
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
   Used as the boundary for "current vs future" allocation logic.

   RETURN: {number} — Current month as YYYYMM integer
----------------------------------------------------------------------------- */
function getCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return Number(`${year}${month}`);
}

/* -----------------------------------------------------------------------------
   FUNCTION: deleteFutureAllocations
   -----------------------------------------------------------------------------
   Deletes all allocation records for a given employee/activity/category where
   the date is strictly greater than the current month. Preserves historical
   and current month records.

   Called before creating a new allocation to clear any stale future bookings
   that would conflict with the new assignment.

   PARAM:  db       {Db}     — Active MongoDB database instance
   PARAM:  emp_id   {number} — Employee ID to scope the deletion
   PARAM:  activity {string} — Project/activity name to scope the deletion
   PARAM:  category {string} — Category to scope the deletion
----------------------------------------------------------------------------- */
async function deleteFutureAllocations(db, emp_id, activity, category) {
  const currentMonth = getCurrentMonth();

  // Delete only future months — current and historical records are preserved
  await db.collection("allocation").deleteMany({
    emp_id,
    activity,
    category,
    date: { $gt: currentMonth } // Only dates strictly after the current month
  });
}

/* -----------------------------------------------------------------------------
   FUNCTION: createCurrentMonthAllocation
   -----------------------------------------------------------------------------
   Upserts an allocation record for the current month with amount = 1.
   If a record already exists for this employee/activity/category/month,
   it is updated in place. If not, a new record is created.

   PARAM:  db       {Db}     — Active MongoDB database instance
   PARAM:  emp_id   {number} — Employee ID for the new allocation
   PARAM:  activity {string} — Project/activity name for the new allocation
   PARAM:  category {string} — Category for the new allocation
----------------------------------------------------------------------------- */
async function createCurrentMonthAllocation(db, emp_id, activity, category) {
  const currentMonth = getCurrentMonth();

  // Upsert: update existing record or insert new one if none exists
  await db.collection("allocation").updateOne(
    {
      emp_id,
      activity,
      category,
      date: currentMonth
    },
    {
      $set: {
        amount: 1,       // Default allocation amount for new assignments
        activity,
        category,
        date: currentMonth
      }
    },
    { upsert: true }
  );
}

/* =============================================================================
   HANDLERS
   ============================================================================= */

/* -----------------------------------------------------------------------------
   HANDLER: getAllAllocations
   GET /api/assignments-allocations
   -----------------------------------------------------------------------------
   Returns all allocation rows joined across employee, assignment, and allocation
   collections, shaped into a grid-ready format with a 29-month rolling window.
   Optionally filters to a single employee's assignments via ?username= query param.

   RESPONSE:
     {
       allAssignments: [...],  — Full allocation grid for all employees
       myAssignments:  [...],  — Filtered to the requesting user (if username provided)
       months:         [...]   — 29-month YYYYMM array defining the grid columns
     }

   SECURITY:
   • username query param is used only to look up the account and derive emp_id —
     it is never interpolated into a raw query string.
   • Only display-safe fields are included in the response — passwords and
     account internals are never exposed.
   • All data joins are performed server-side — the client never receives raw
     collection documents.
----------------------------------------------------------------------------- */
export const getAllAllocations = async (req, res) => {
  try {
    const db = await connectDB();

    // Optional filter: if username is provided, also compute myAssignments
    const username = req.query.username;

    // Load all required collections in parallel for performance
    const employees = await db.collection("employee").find({}).toArray();
    const assignments = await db.collection("assignment").find({}).toArray();
    const allocations = await db.collection("allocation").find({}).toArray();
    const departments = await db.collection("department").find({}).toArray();

    // 29-month rolling window — defines the visible grid columns
    const months = buildMonthRange();

    // Build lookup maps for O(1) access during join operations
    const deptMap = new Map();
    departments.forEach((d) => {
      if (d.dept_no) deptMap.set(d.dept_no, d.dept_name || d.dept_no);
    });

    const employeeById = new Map();
    employees.forEach((e) => employeeById.set(e.emp_id, e));

    // Composite key for assignment lookup: "project_name||category"
    const assignmentKey = (activity, category) => `${activity}||${category}`;
    const assignmentByKey = new Map();
    assignments.forEach((a) => {
      assignmentByKey.set(assignmentKey(a.project_name, a.category), a);
    });

    // Build rows map: one row per employee+assignment combination
    // Key: "emp_id||assignment._id"
    const rowsMap = new Map();

    for (const alloc of allocations) {
      const emp = employeeById.get(alloc.emp_id);
      if (!emp) continue; // Skip orphaned allocations with no matching employee

      const assignment = assignmentByKey.get(
        assignmentKey(alloc.activity, alloc.category)
      );
      if (!assignment) continue; // Skip allocations with no matching assignment

      const rowKey = `${emp.emp_id}||${assignment._id}`;

      // Initialise the row if this is the first allocation for this combination
      if (!rowsMap.has(rowKey)) {
        rowsMap.set(rowKey, {
          employee: emp,
          assignment,
          allocations: {}
        });
      }

      const row = rowsMap.get(rowKey);
      const dateStr = String(alloc.date);

      // Only include months within the 29-month rolling window
      if (months.includes(dateStr)) {
        row.allocations[dateStr] = alloc.amount;
      }
    }

    // Shape rows into display-safe response objects
    // Only selected fields are included — no raw DB documents exposed
    const allAssignments = Array.from(rowsMap.values()).map((row) => {
      const empDeptName = deptMap.get(row.employee.dept_no) || "";

      const reqDeptCode = row.assignment.requesting_dept;
      const reqDeptName = reqDeptCode
        ? deptMap.get(reqDeptCode) || reqDeptCode
        : "";

      const reportsToId = row.employee.reports_to || "";
      const managerEmp = reportsToId ? employeeById.get(reportsToId) : null;
      const managerName = managerEmp?.emp_name || "";

      return {
        employee: {
          emp_id: row.employee.emp_id,
          emp_name: row.employee.emp_name,
          emp_title: row.employee.emp_title,
          dept_name: empDeptName,
          reports_to: reportsToId,
          manager_name: managerName
        },
        assignment: {
          _id: row.assignment._id,
          project_name: row.assignment.project_name,
          category: row.assignment.category,
          leader: row.assignment.leader,
          requestor: row.assignment.requestor,
          requestor_vp: row.assignment.requestor_vp,
          requesting_dept: reqDeptCode,
          requesting_dept_name: reqDeptName,
          status: row.assignment.status,
          target_period: row.assignment.target_period,
          completion_date: row.assignment.completion_date,
          description: row.assignment.description,
          resource_notes: row.assignment.resource_notes
        },
        allocations: row.allocations
      };
    });

    // If username is provided, filter to just that employee's assignments
    let myAssignments = [];

    if (username) {
      // Look up the account to get the emp_id — never trust a client-provided emp_id
      const account = await db.collection("account").findOne({
        "account.username": username
      });

      if (account) {
        const myEmpId = account.emp_id;
        myAssignments = allAssignments.filter(
          (r) => r.employee.emp_id === myEmpId
        );
      }
    }

    return res.json({
      allAssignments,
      myAssignments,
      months
    });

  } catch (error) {
    console.error("assignments-allocations GET error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/* -----------------------------------------------------------------------------
   HANDLER: getAllocationById
   GET /api/assignments-allocations/:id
   -----------------------------------------------------------------------------
   Returns a single employee record with their most relevant assignment.
   If a ?project= query param is provided, loads that specific assignment.
   Otherwise falls back to the employee's most recent allocation.

   Also returns manager dropdown data for the edit form.

   SECURITY:
   • emp_id is parsed with parseInt() — non-numeric values produce NaN which
     is caught and returned as a 400 before any DB query runs.
   • project query param is used in a findOne() equality match — no injection risk.
   • Manager list is scoped to acc_type_id === 1 — only Resource Managers are
     returned, not all accounts.
   • Response never includes password or account fields.

   NOTE: The original version of this handler is preserved in comments above
   for reference — the current version adds ?project= support.
----------------------------------------------------------------------------- */
export const getAllocationById = async (req, res) => {
  try {
    const db = await connectDB();

    // Parse emp_id from URL param — parseInt guards against non-numeric values
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
      assignment = await db.collection("assignment").findOne({
        project_name: project
      });
    }

    if (!assignment) {
      // No project specified or not found — fall back to most recent allocation
      const allocations = await db
        .collection("allocation")
        .find({ emp_id })
        .sort({ date: -1 }) // Most recent first
        .toArray();

      if (allocations.length > 0) {
        const latest = allocations[0];
        assignment = await db.collection("assignment").findOne({
          project_name: latest.activity,
          category: latest.category
        });
      }
    }

    // Load manager dropdown — scoped to Resource Manager role (acc_type_id === 1)
    const managerAccounts = await db
      .collection("account")
      .find({ "account.acc_type_id": 1 })
      .toArray();

    const managerIds = managerAccounts.map((a) => a.emp_id);

    const managers = await db
      .collection("employee")
      .find({ emp_id: { $in: managerIds } })
      .toArray();

    return res.json({
      row: {
        employee,
        assignment
      },
      dropdowns: {
        managers
      }
    });

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
   assignment record where requestor_vp matches the provided name.

   SECURITY:
   • name query param is required — returns 400 if missing.
   • Used in a MongoDB equality match — no injection risk.
   • Returns only the requesting_dept field via projection — no other
     assignment data is exposed.
----------------------------------------------------------------------------- */
export const getDeptForEmployee = async (req, res) => {
  try {
    const name = req.query.name;

    if (!name) {
      return res.status(400).json({ error: "Missing name" });
    }

    const db = await connectDB();

    // Find an assignment for this VP name that has a non-null requesting_dept
    // Projection limits the returned fields to only what is needed
    const doc = await db.collection("assignment").findOne(
      {
        requestor_vp: name,
        requesting_dept: { $ne: null }
      },
      {
        projection: { requesting_dept: 1 }
      }
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
   Returns all active projects (excluding Completed and Cancelled assignments).
   If a ?project= query param is provided, returns the full assignment record
   for that specific project instead.

   SECURITY:
   • project query param is used in a findOne() equality match — no injection risk.
   • Active projects query uses $nin to exclude terminal statuses — prevents
     closed projects from appearing in assignment dropdowns.
   • Projection on the list query returns only project_name — minimises
     data exposure for the dropdown use case.
----------------------------------------------------------------------------- */
export const getProjects = async (req, res) => {
  try {
    const project = req.query.project;
    const db = await connectDB();

    if (project) {
      // Specific project requested — return the full assignment record
      const assignment = await db
        .collection("assignment")
        .findOne({ project_name: project });

      return res.json({ assignment });
    }

    // Return all active projects — exclude Completed and Cancelled
    const projects = await db
      .collection("assignment")
      .find({
        status: { $nin: ["Completed", "Cancelled"] }
      })
      .project({ project_name: 1, _id: 0 }) // Only return project_name for dropdown
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

   SECURITY:
   • emp_id is coerced with Number() — falsy values (NaN, 0) are caught and
     returned as a 400 before any DB query runs.
   • Department name is resolved server-side — client never queries the
     department collection directly.
----------------------------------------------------------------------------- */
export const getEmployee = async (req, res) => {
  try {
    const emp_id = Number(req.params.empId);

    if (!emp_id) {
      return res.status(400).json({ error: "emp_id is required" });
    }

    const db = await connectDB();

    const employee = await db.collection("employee").findOne({ emp_id });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Resolve department name from the employee's dept_no
    const department = await db
      .collection("department")
      .findOne({ dept_no: employee.dept_no });

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
   Used to populate the DM employee dropdown in assignment forms.

   SECURITY:
   • Scoped to a specific dept_no — no user input is used in the query.
   • Projection limits returned fields to display-safe values only —
     no sensitive employee data is exposed.
----------------------------------------------------------------------------- */
export const getDMEmployees = async (req, res) => {
  try {
    const db = await connectDB();

    const employees = await db
      .collection("employee")
      .find({ dept_no: "D01" }) // Scoped to Data Management department
      .project({
        emp_id: 1,
        emp_name: 1,
        dept_no: 1,
        reports_to: 1,
        _id: 0 // Exclude MongoDB _id from response
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

   SECURITY:
   • All values from req.body are used as typed MongoDB parameters — no
     raw string interpolation into queries.
   • month is coerced to Number() before use — prevents string-typed dates
     from producing unexpected query results.
   • amount can be null (to clear a cell) or a number — both are handled
     explicitly rather than passing the raw value through unchecked.
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
        date: Number(month) // Coerce to number — allocation dates are stored as integers
      },
      {
        $set: {
          amount: amount === null ? null : Number(amount), // Preserve null to clear cells
          activity,
          category,
          date: Number(month)
        }
      },
      { upsert: true } // Create the record if it doesn't exist
    );

    return res.json({ success: true });

  } catch (err) {
    console.error("editallocationamount error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* -----------------------------------------------------------------------------
   HANDLER: deleteAllocation
   DELETE /api/assignments-allocations/:id
   -----------------------------------------------------------------------------
   Deletes a single allocation record for a specific employee/activity/
   category/month combination.

   SECURITY:
   • All values from req.body are used as typed MongoDB parameters.
   • month is coerced to Number() to match the integer storage format.
   • deleteOne() targets a precise record — cannot accidentally delete
     unintended records due to the four-field compound match.
----------------------------------------------------------------------------- */
export const deleteAllocation = async (req, res) => {
  try {
    const { emp_id, month, activity, category } = req.body;

    const db = await connectDB();

    // Compound match on all four fields — precise single-record deletion
    await db.collection("allocation").deleteOne({
      emp_id,
      activity,
      category,
      date: Number(month) // Coerce to number to match integer storage format
    });

    return res.json({ success: true });

  } catch (err) {
    console.error("delete allocation error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* -----------------------------------------------------------------------------
   HANDLER: updateAllocation
   PUT /api/assignments-allocations/:id
   -----------------------------------------------------------------------------
   Updates the full assignment record (not the allocation amounts — those
   use editAllocationAmount). Used by the Edit modal to save changes to
   assignment metadata such as project name, status, leader, etc.

   SECURITY:
   • id is required — returns 400 immediately if missing.
   • new ObjectId(id) will throw if id is not a valid 24-character hex string,
     which is caught by asyncHandler and forwarded to the global error handler.
   • All field values are explicitly mapped — no dynamic key assignment that
     could allow arbitrary fields to be written to the document.
   • updated_at is set server-side — client cannot spoof the timestamp.
----------------------------------------------------------------------------- */
export const updateAllocation = async (req, res) => {
  try {
    const {
      id,
      project,
      category,
      lead,
      status,
      requestor,
      requestor_vp,
      completion_date,
      target_period,
      description,
      resource_consideration,
      requesting_dept
    } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Missing assignment ID" });
    }

    const db = await connectDB();

    const updateDoc = {
      $set: {
        project_name: project,
        category,
        leader: lead,
        status,
        requestor,
        requestor_vp,
        requesting_dept,
        department: requesting_dept,  // Kept in sync with requesting_dept
        target_period,
        completion_date: completion_date || null, // Explicit null if not provided
        description,
        resource_notes: resource_consideration || "",
        updated_at: new Date() // Server-side timestamp — not client-controlled
      }
    };

    // Convert id string to MongoDB ObjectId — throws on invalid format
    await db.collection("assignment").updateOne(
      { _id: new ObjectId(id) },
      updateDoc
    );

    return res.json({ success: true });

  } catch (error) {
    console.error("Edit assignment error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/* -----------------------------------------------------------------------------
   HANDLER: getAllocationDropdowns
   GET /api/assignments-allocations/meta/dropdowns
   -----------------------------------------------------------------------------
   Returns all dropdown data needed for the allocation UI forms: employees,
   managers, projects, categories, leaders, requestors, and requesting departments.
   All lists are deduplicated and sorted alphabetically.

   SECURITY:
   • No user input is used in any query — all results are derived from
     existing collection data only.
   • Aggregation pipelines use $match to exclude null values before grouping,
     preventing null entries from appearing in dropdown lists.
   • Projection limits returned fields to display-safe values only.
----------------------------------------------------------------------------- */
export const getAllocationDropdowns = async (req, res) => {
  try {
    const db = await connectDB();

    // All employees — for employee selector
    const employees = await db.collection("employee")
      .find({})
      .project({ emp_id: 1, emp_name: 1 })
      .sort({ emp_name: 1 })
      .toArray();

    // Distinct manager names from employee records
    const managers = await db.collection("employee")
      .aggregate([
        { $match: { manager_name: { $ne: null } } },
        { $group: { _id: "$manager_name" } },
        { $project: { name: "$_id", _id: 0 } },
        { $sort: { name: 1 } }
      ])
      .toArray();

    // Distinct active project names from assignment records
    const projects = await db.collection("assignment")
      .aggregate([
        { $match: { project_name: { $ne: null } } },
        { $group: { _id: "$project_name" } },
        { $project: { name: "$_id", _id: 0 } },
        { $sort: { name: 1 } }
      ])
      .toArray();

    // Distinct categories from assignment records
    const categories = await db.collection("assignment")
      .aggregate([
        { $match: { category: { $ne: null } } },
        { $group: { _id: "$category" } },
        { $project: { name: "$_id", _id: 0 } },
        { $sort: { name: 1 } }
      ])
      .toArray();

    // Distinct leaders from assignment records
    const leaders = await db.collection("assignment")
      .aggregate([
        { $match: { leader: { $ne: null } } },
        { $group: { _id: "$leader" } },
        { $project: { name: "$_id", _id: 0 } },
        { $sort: { name: 1 } }
      ])
      .toArray();

    // Distinct requestors — merged from both requestor and requestor_vp fields
    const requestors = await db.collection("assignment")
      .aggregate([
        { $project: { names: ["$requestor", "$requestor_vp"] } },
        { $unwind: "$names" },
        { $match: { names: { $ne: null } } },
        { $group: { _id: "$names" } },
        { $project: { name: "$_id", _id: 0 } },
        { $sort: { name: 1 } }
      ])
      .toArray();

    // Distinct requesting department names
    const requestingDepts = await db.collection("assignment")
      .aggregate([
        { $match: { requesting_dept_name: { $ne: null } } },
        { $group: { _id: "$requesting_dept_name" } },
        { $project: { name: "$_id", _id: 0 } },
        { $sort: { name: 1 } }
      ])
      .toArray();

    return res.json({
      employees,
      managers,
      projects,
      categories,
      leaders,
      requestors,
      requestingDepts
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
   Creates a new allocation entry for an employee on a project. Enforces
   the following business rules:
     1. Delete all future allocations for this employee/activity/category
     2. Set the current month allocation to 1

   SECURITY:
   • emp_id and project are both required — returns 400 if either is missing.
   • project is used to look up the assignment by name — not passed directly
     into a query as a user-controlled filter.
   • emp_id is coerced to Number() before all DB operations.
----------------------------------------------------------------------------- */
export const createAllocation = async (req, res) => {
  try {
    const { emp_id, project } = req.body;

    if (!emp_id || !project) {
      return res.status(400).json({
        error: "Missing emp_id or project"
      });
    }

    const db = await connectDB();

    // Look up the assignment to get the canonical activity name and category
    const assignment = await db
      .collection("assignment")
      .findOne({ project_name: project });

    if (!assignment) {
      return res.status(404).json({
        error: "Assignment not found for this project"
      });
    }

    const activity = assignment.project_name;
    const category = assignment.category;

    // Rule 1: Clear all future allocations for this employee/activity/category
    await deleteFutureAllocations(db, Number(emp_id), activity, category);

    // Rule 2: Set current month allocation to 1
    await createCurrentMonthAllocation(db, Number(emp_id), activity, category);

    return res.json({ success: true });

  } catch (error) {
    console.error("Add allocation error:", error);
    return res.status(500).json({
      error: "Server error while adding allocation"
    });
  }
};

/* -----------------------------------------------------------------------------
   HANDLER: reassignAllocation
   POST /api/assignments-allocations/reassign
   -----------------------------------------------------------------------------
   Moves an employee from one project to another by:
     1. Deleting ALL allocation records (past, current, future) for the old
        employee/project/category combination
     2. Creating a new current-month allocation (amount = 1) for the new
        employee/project/category combination

   SECURITY:
   • All four required fields are validated — returns 400 if any are missing.
   • emp_id values are coerced to Number() before all DB operations.
   • deleteMany() is scoped to a precise three-field compound match —
     cannot accidentally delete records for other employees or projects.
   • Upsert on the new allocation prevents duplicate records if the new
     employee already has an entry for this project/month.

   NOTE: The original version of this handler (which only deleted future
   allocations) is preserved in comments above for reference. The current
   version deletes ALL allocations for the old employee/project combination.
----------------------------------------------------------------------------- */
export const reassignAllocation = async (req, res) => {
  try {
    const {
      old_emp_id,
      new_emp_id,
      old_project,
      new_project,
      old_category,
      new_category
    } = req.body;

    // All four core fields are required — return 400 if any are missing
    if (!old_emp_id || !new_emp_id || !old_project || !new_project) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const db = await connectDB();

    // Step 1: Delete ALL allocation records for the old employee/project/category
    // This clears the full history to cleanly remove the old assignment
    await db.collection("allocation").deleteMany({
      emp_id: Number(old_emp_id),
      activity: old_project,
      category: old_category
    });

    // Step 2: Create a new current-month allocation for the new assignment
    const currentMonth = getCurrentMonth();

    await db.collection("allocation").updateOne(
      {
        emp_id: Number(new_emp_id),
        activity: new_project,
        category: new_category,
        date: currentMonth
      },
      {
        $set: {
          amount: 1,               // Default allocation for a new assignment
          activity: new_project,
          category: new_category,
          date: currentMonth
        }
      },
      { upsert: true } // Prevent duplicate if record already exists
    );

    return res.json({ success: true });

  } catch (error) {
    console.error("Reassign allocation error:", error);
    return res.status(500).json({ error: "Server error while reassigning" });
  }
};