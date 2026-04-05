
/* =============================================================================
   resourceController.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Handles all business logic for the resources module — employee management,
     capacity tracking, departments, and manager lookups.

       • getAllEmployees        — Returns all employee records
       • getEmployeeById        — Returns a single employee by emp_id
       • createEmployee         — Creates a new employee record
       • updateEmployee         — Full update of an employee record
       • updateEmployeeStatus   — Partial update of status field only
       • getEmployeeCapacity    — Returns capacity records for an employee
       • updateEmployeeCapacity — Upserts or deletes capacity entries per month
       • getAllDepartments       — Returns all department records
       • getAllManagers          — Returns all Resource Manager employees

   CAPACITY UPSERT / DELETE PATTERN:
     updateEmployeeCapacity processes each entry as either an upsert or delete:
       • Valid numeric amount → upsert the capacity record
       • null / empty / undefined → delete the record
     This keeps the capacity collection clean and prevents zero-value noise
     from appearing in capacity reports.

   SECURITY MODEL:
     • emp_id values from URL params are coerced with Number() before use in DB
       queries — prevents string-typed IDs from producing unexpected resultAs.
     • All numeric fields from req.body are explicitly coerced with Number()
       before writes — prevents strings from being stored where integers are expected.
     • _id is excluded from all responses via projection — MongoDB internal IDs
       are never exposed to the client.
     • Write operations must be protected by JWT + RBAC middleware in the route
       layer — only Resource Managers should modify employee or capacity data.
     • updateEmployeeStatus validates the status value against an allowed list
       before writing — prevents arbitrary values from being stored.
     • updateEmployeeCapacity validates that capacityEntries is an array and that
       each date is a number — malformed entries are skipped silently.
     • getAllManagers scopes results to acc_type_id === 1 — only Resource
       Manager employees are returned, not all accounts.
     • Generic error messages on failure — full errors are logged server-side only.

   DEPENDENCIES:
     • ../config/db.js — MongoDB connection singleton
   ============================================================================= */

import { connectDB } from "../config/db.js";

/* =============================================================================
   HANDLER: getAllEmployees
   GET /api/resources/employees
   -----------------------------------------------------------------------------
   Returns all employee records. Used by the Resources page to populate the
   employee list and by other controllers for duplicate name checking.

   SECURITY:
     • No user input in the query — injection risk eliminated
     • _id excluded via projection — internal IDs never returned
   ============================================================================= */
export const getAllEmployees = async (req, res) => {
  try {
    const db = await connectDB();

    const employees = await db.collection("employee")
      .find({}, { projection: { _id: 0 } }) // _id excluded — never exposed to client
      .toArray();

    return res.json(employees);

  } catch (err) {
    console.error("getAllEmployees error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* =============================================================================
   HANDLER: getEmployeeById
   GET /api/resources/employees/:emp_id
   -----------------------------------------------------------------------------
   Returns a single employee record by emp_id. Used by the Edit Resource modal
   to pre-populate the form with the employee's current values.

   SECURITY:
     • emp_id coerced with Number() — non-numeric values produce NaN which
       matches nothing, returning a clean 404 without exposing DB internals
     • _id excluded via projection
   ============================================================================= */
export const getEmployeeById = async (req, res) => {
  try {
    const emp_id = Number(req.params.emp_id); // Coerce — prevents string-typed ID matching
    const db     = await connectDB();

    const employee = await db.collection("employee")
      .findOne({ emp_id }, { projection: { _id: 0 } });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    return res.json(employee);

  } catch (err) {
    console.error("getEmployeeById error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* =============================================================================
   HANDLER: createEmployee
   POST /api/resources/employees
   -----------------------------------------------------------------------------
   Creates a new employee record. All numeric ID fields are explicitly coerced
   to ensure correct integer types are stored — downstream queries on these
   fields use numeric equality, so string storage would cause silent mismatches.

   Optional numeric fields (manager_level, director_level, etc.) are stored as
   null rather than 0 or undefined when not provided — null is the explicit
   "not set" value used across the application.

   SECURITY:
     • Must be protected by JWT + RBAC — only Resource Managers should create
       employee records
     • All numeric fields explicitly coerced with Number()
     • Optional fields use null default rather than undefined
   ============================================================================= */
export const createEmployee = async (req, res) => {
  try {
    const db = await connectDB();

    const newEmployee = {
      emp_id:         Number(req.body.emp_id),         // Always required — coerced to integer
      emp_name:       req.body.emp_name,
      emp_title:      req.body.emp_title,
      dept_no:        req.body.dept_no,
      manager_level:  req.body.manager_level  ? Number(req.body.manager_level)  : null,
      director_level: req.body.director_level ? Number(req.body.director_level) : null,
      reports_to:     req.body.reports_to     ? Number(req.body.reports_to)     : null,
      requestor_vp:   req.body.requestor_vp   ? Number(req.body.requestor_vp)   : null,
      other_info:     req.body.other_info     ?? "",       // Default to "" — null would show as "null" in UI
      current_status: req.body.current_status ?? "Active"  // New employees are Active by default
    };

    await db.collection("employee").insertOne(newEmployee);

    return res.json({ message: "Employee created successfully" });

  } catch (err) {
    console.error("createEmployee error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* =============================================================================
   HANDLER: updateEmployee
   PUT /api/resources/employees/:emp_id
   -----------------------------------------------------------------------------
   Performs a full replacement of an employee record's editable fields.
   emp_id in the update document defaults to the URL param value if not
   provided in the body — this prevents an accidental emp_id change from a
   malformed request body.

   SECURITY:
     • Must be protected by JWT + RBAC
     • emp_id from URL used as the query filter — coerced to Number()
     • All numeric fields explicitly coerced — same pattern as createEmployee
     • $set ensures only specified fields are updated — no unintended overwrites
   ============================================================================= */
export const updateEmployee = async (req, res) => {
  try {
    const emp_id = Number(req.params.emp_id); // URL param — used as the query filter
    const db     = await connectDB();

    await db.collection("employee").updateOne(
      { emp_id },
      {
        $set: {
          // Default emp_id to URL param if missing from body — prevents accidental ID changes
          emp_id:         req.body.emp_id ? Number(req.body.emp_id) : emp_id,
          emp_name:       req.body.emp_name,
          emp_title:      req.body.emp_title,
          dept_no:        req.body.dept_no,
          manager_level:  req.body.manager_level  ? Number(req.body.manager_level)  : null,
          director_level: req.body.director_level ? Number(req.body.director_level) : null,
          reports_to:     req.body.reports_to     ? Number(req.body.reports_to)     : null,
          requestor_vp:   req.body.requestor_vp   ? Number(req.body.requestor_vp)   : null,
          other_info:     req.body.other_info     ?? "",
          current_status: req.body.current_status ?? "Active"
        }
      }
    );

    return res.json({ message: "Employee updated successfully" });

  } catch (err) {
    console.error("updateEmployee error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* =============================================================================
   HANDLER: updateEmployeeStatus
   PATCH /api/resources/employees/:emp_id/status
   -----------------------------------------------------------------------------
   Partial update — modifies only the current_status field of an employee record.
   PATCH is used intentionally to signal a targeted single-field update rather
   than a full record replacement (which would be PUT).

   SECURITY:
     • Must be protected by JWT + RBAC — status changes affect login access
     • Status value validated against ALLOWED_STATUSES before writing —
       prevents arbitrary strings from being stored in the field
     • $set scopes the update to current_status only — no other fields touched
   ============================================================================= */
export const updateEmployeeStatus = async (req, res) => {
  try {
    const emp_id = Number(req.params.emp_id);
    const db     = await connectDB();

    // Allowlist validation — only known status values can be written
    const ALLOWED_STATUSES = ["Active", "Inactive"];
    const status           = req.body.status;

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(", ")}`
      });
    }

    // $set scopes to current_status only — no other fields are affected
    await db.collection("employee").updateOne(
      { emp_id },
      { $set: { current_status: status } }
    );

    return res.json({ message: "Employee status updated" });

  } catch (err) {
    console.error("updateEmployeeStatus error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* =============================================================================
   HANDLER: getEmployeeCapacity
   GET /api/resources/employees/:emp_id/capacity
   -----------------------------------------------------------------------------
   Returns all capacity records for a specific employee. Used by the capacity
   planning views to show available FTE per month, and by the assignments page
   to check over-allocation before saving an inline edit.

   SECURITY:
     • emp_id coerced with Number() — string-typed IDs return no results
     • _id excluded via projection — internal IDs never returned
   ============================================================================= */
export const getEmployeeCapacity = async (req, res) => {
  try {
    const emp_id = Number(req.params.emp_id);
    const db     = await connectDB();

    const capacity = await db.collection("capacity")
      .find({ emp_id }, { projection: { _id: 0 } }) // _id excluded — never exposed
      .toArray();

    return res.json(capacity);

  } catch (err) {
    console.error("getEmployeeCapacity error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* =============================================================================
   HANDLER: updateEmployeeCapacity
   PUT /api/resources/employees/:emp_id/capacity
   -----------------------------------------------------------------------------
   Processes an array of capacity entries, upserting valid values and deleting
   null/empty ones. This keeps the capacity collection clean — months with no
   capacity set have no record rather than a zero-value record.

   REQUEST BODY:
     { capacityEntries: [{ date: number, amount: number | null }, ...] }

   UPSERT VS DELETE LOGIC:
     • amount is a valid number → upsert (create or update)
     • amount is null, "" or undefined → delete the record for that month

   SECURITY:
     • Must be protected by JWT + RBAC
     • capacityEntries must be an array — returns 400 if not
     • Each entry's date validated as a number — non-numeric dates skipped
     • emp_id from URL param only — never from req.body
   ============================================================================= */
export const updateEmployeeCapacity = async (req, res) => {
  try {
    const emp_id = Number(req.params.emp_id);
    const db     = await connectDB();
    const updates = req.body.capacityEntries;

    // Must be an array — reject immediately if not to prevent unexpected behaviour
    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: "capacityEntries must be an array" });
    }

    for (const entry of updates) {
      const { date, amount } = entry;

      // Skip entries with non-numeric dates — prevents malformed data reaching the DB
      if (typeof date !== "number") continue;

      if (amount === null || amount === "" || amount === undefined) {
        // No capacity set for this month — delete the record to keep the collection clean
        await db.collection("capacity").deleteOne({ emp_id, date });
        continue;
      }

      if (typeof amount === "number") {
        // Valid capacity value — upsert (update existing record or insert new one)
        await db.collection("capacity").updateOne(
          { emp_id, date },
          { $set: { amount } },
          { upsert: true }
        );
      }
    }

    return res.json({ message: "Capacity updated successfully" });

  } catch (err) {
    console.error("updateEmployeeCapacity error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* =============================================================================
   HANDLER: getAllDepartments
   GET /api/resources/departments
   -----------------------------------------------------------------------------
   Returns all department records. Used to populate department dropdowns
   throughout the application (resource creation, admin dashboard, etc.).

   SECURITY:
     • No user input in the query — injection risk eliminated
     • _id excluded via projection
     • Still requires JWT to prevent unauthenticated enumeration of internal
       organisational structure
   ============================================================================= */
export const getAllDepartments = async (req, res) => {
  try {
    const db = await connectDB();

    const departments = await db.collection("department")
      .find({}, { projection: { _id: 0 } })
      .toArray();

    return res.json(departments);

  } catch (err) {
    console.error("getAllDepartments error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* =============================================================================
   HANDLER: getAllManagers
   GET /api/resources/managers
   -----------------------------------------------------------------------------
   Returns all employees who hold a Resource Manager account (acc_type_id === 1).
   Used to populate the Reports To, Manager Level, Director Level, and VP
   dropdowns in the Create/Edit Resource modals.

   Uses an aggregation join rather than a simple find() so results are scoped
   to the correct account type — prevents non-Resource-Manager employees from
   appearing in manager dropdowns.

   SECURITY:
     • No user input in the pipeline — injection risk eliminated
     • $match scopes to acc_type_id === 1 — only Resource Managers returned
     • $project whitelists returned fields — no account credentials exposed
     • _id excluded from projection
   ============================================================================= */
export const getAllManagers = async (req, res) => {
  try {
    const db = await connectDB();

    // Join employee → account and filter to Resource Managers (acc_type_id === 1)
    const managers = await db.collection("employee").aggregate([
      {
        $lookup: {
          from:         "account",
          localField:   "emp_id",
          foreignField: "emp_id",
          as:           "account"
        }
      },
      { $unwind: "$account" },
      { $match: { "account.account.acc_type_id": 1 } }, // Resource Managers only
      {
        $project: {
          _id:       0,    // Exclude internal MongoDB _id
          emp_id:    1,
          emp_name:  1,
          emp_title: 1,
          dept_no:   1
          // account fields intentionally excluded — no credentials in response
        }
      }
    ]).toArray();

    return res.json(managers);

  } catch (err) {
    console.error("getAllManagers error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* =============================================================================
   HANDLER: deleteEmployee
   DELETE /api/resources/employees/:emp_id
   -----------------------------------------------------------------------------
   Deletes an employee record and all associated capacity records for that
   employee. Capacity records are cleaned up in the same operation to prevent
   orphaned data from accumulating in the capacity collection.

   SECURITY:
     • Must be protected by JWT + RBAC — only Resource Managers should delete
     • emp_id coerced with Number() — prevents string-typed ID matching
     • Returns 404 if employee not found — no silent no-ops on missing records
     • Capacity cleanup scoped to emp_id only — no cross-employee deletions
   ============================================================================= */
export const deleteEmployee = async (req, res) => {
  try {
    const emp_id = Number(req.params.emp_id);
    const db     = await connectDB();

    const result = await db.collection("employee").deleteOne({ emp_id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Clean up all capacity records for this employee — prevents orphaned data
    await db.collection("capacity").deleteMany({ emp_id });

    return res.json({ message: "Employee deleted successfully" });

  } catch (err) {
    console.error("deleteEmployee error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
