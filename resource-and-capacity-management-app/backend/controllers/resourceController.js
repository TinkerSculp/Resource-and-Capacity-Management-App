/* =============================================================================
   resourceController.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Handles all business logic for the resources module, covering employee
     management, capacity tracking, departments, and managers.

       • getAllEmployees        — Returns all employee records
       • getEmployeeById        — Returns a single employee by emp_id
       • createEmployee         — Creates a new employee record
       • updateEmployee         — Full update of an employee record
       • updateEmployeeStatus   — Partial update of status field only
       • getEmployeeCapacity    — Returns capacity records for an employee
       • updateEmployeeCapacity — Upserts or deletes capacity entries per month
       • getAllDepartments       — Returns all department records
       • getAllManagers          — Returns all Resource Manager employees

   SECURITY MODEL:
     • emp_id values from URL params are always coerced with Number() before
       use in DB queries — prevents string-typed IDs from producing unexpected
       query results or matching unintended records.
     • All numeric fields from req.body are explicitly coerced with Number()
       before being written to the database — prevents string values from being
       stored where integers are expected.
     • _id is excluded from all responses via projection — MongoDB internal IDs
       are never exposed to the client.
     • Write operations (create, update, status, capacity) must be protected by
       JWT + RBAC middleware — only Resource Managers should modify employee data.
     • updateEmployeeStatus accepts the status value directly from req.body —
       the controller should validate this against an allowed list before writing.
     • updateEmployeeCapacity validates that capacityEntries is an array and that
       each date is a number before processing — malformed entries are skipped.
     • Capacity entries with null/empty amount are deleted rather than stored,
       keeping the collection clean and preventing zero-value noise in reports.
     • getAllManagers scopes results to acc_type_id === 1 via aggregation —
       only Resource Manager employees are returned, not all accounts.
     • Generic error messages on failure — full errors are logged server-side only.

   DEPENDENCIES:
     • ../config/db.js — MongoDB connection singleton
   ============================================================================= */

import { connectDB } from "../config/db.js";

/* -----------------------------------------------------------------------------
   HANDLER: getAllEmployees
   GET /api/resources/employees
   -----------------------------------------------------------------------------
   Returns all employee records from the employee collection.
   Used by the resource management dashboard to populate the employee list.

   SECURITY:
   • No user input is used in the query — injection risk is eliminated.
   • _id is excluded via projection — MongoDB internal IDs are never returned.
----------------------------------------------------------------------------- */
export const getAllEmployees = async (req, res) => {
  try {
    const db = await connectDB();

    // Projection excludes _id — MongoDB internal IDs are never exposed to client
    const employees = await db
      .collection("employee")
      .find({}, { projection: { _id: 0 } })
      .toArray();

    return res.json(employees);

  } catch (err) {
    console.error("getAllEmployees error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* -----------------------------------------------------------------------------
   HANDLER: getEmployeeById
   GET /api/resources/employees/:emp_id
   -----------------------------------------------------------------------------
   Returns a single employee record matching the provided emp_id URL parameter.

   SECURITY:
   • emp_id is coerced with Number() — non-numeric values produce NaN which
     will not match any document, returning a clean 404 response.
   • _id is excluded via projection — MongoDB internal IDs are never returned.
----------------------------------------------------------------------------- */
export const getEmployeeById = async (req, res) => {
  try {
    // Coerce to number — prevents string-typed IDs from matching unexpectedly
    const emp_id = Number(req.params.emp_id);
    const db = await connectDB();

    const employee = await db
      .collection("employee")
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

/* -----------------------------------------------------------------------------
   HANDLER: createEmployee
   POST /api/resources/employees
   -----------------------------------------------------------------------------
   Creates a new employee record. All numeric fields are explicitly coerced
   before insert to ensure correct data types are stored in the database.

   SECURITY:
   • MUST require JWT + RBAC — only Resource Managers should create employees.
   • All numeric fields (emp_id, manager_level, director_level, reports_to,
     requestor_vp) are coerced with Number() — prevents string values from
     being stored where integers are expected.
   • Optional numeric fields use conditional coercion — stored as null if not
     provided rather than as NaN or an empty string.
   • other_info and current_status use ?? defaults — prevents undefined from
     being written to the document.
----------------------------------------------------------------------------- */
export const createEmployee = async (req, res) => {
  try {
    const db = await connectDB();

    // Build the insert document — all numeric fields are explicitly coerced
    // to prevent type mismatches in downstream queries and reports
    const newEmployee = {
      emp_id:         Number(req.body.emp_id),
      emp_name:       req.body.emp_name,
      emp_title:      req.body.emp_title,
      dept_no:        req.body.dept_no,
      manager_level:  req.body.manager_level  ? Number(req.body.manager_level)  : null,
      director_level: req.body.director_level ? Number(req.body.director_level) : null,
      reports_to:     req.body.reports_to     ? Number(req.body.reports_to)     : null,
      requestor_vp:   req.body.requestor_vp   ? Number(req.body.requestor_vp)   : null,
      other_info:     req.body.other_info     ?? "",       // Default to empty string if not provided
      current_status: req.body.current_status ?? "Active"  // Default to Active for new employees
    };

    await db.collection("employee").insertOne(newEmployee);

    return res.json({ message: "Employee created successfully" });

  } catch (err) {
    console.error("createEmployee error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* -----------------------------------------------------------------------------
   HANDLER: updateEmployee
   PUT /api/resources/employees/:emp_id
   -----------------------------------------------------------------------------
   Performs a full update of an employee record. All editable fields are
   replaced with the values provided in the request body.

   SECURITY:
   • MUST require JWT + RBAC — only Resource Managers should update employees.
   • emp_id from the URL param is used as the query filter — coerced to Number().
   • emp_id in the update body defaults to the URL param value if not provided,
     preventing accidental emp_id changes from malformed requests.
   • All numeric fields are explicitly coerced — same pattern as createEmployee.
   • $set ensures only specified fields are updated — no unintended overwrites
     of fields not included in the update document.
----------------------------------------------------------------------------- */
export const updateEmployee = async (req, res) => {
  try {
    // Coerce URL param emp_id — used as the query filter
    const emp_id = Number(req.params.emp_id);
    const db = await connectDB();

    const updateDoc = {
      $set: {
        // Default emp_id to URL param if not provided in body — prevents accidental ID changes
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
    };

    await db.collection("employee").updateOne({ emp_id }, updateDoc);

    return res.json({ message: "Employee updated successfully" });

  } catch (err) {
    console.error("updateEmployee error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* -----------------------------------------------------------------------------
   HANDLER: updateEmployeeStatus
   PATCH /api/resources/employees/:emp_id/status
   -----------------------------------------------------------------------------
   Partial update — modifies only the current_status field of an employee record.
   PATCH is used intentionally to signal a targeted field update rather than a
   full record replacement.

   SECURITY:
   • MUST require JWT + RBAC — status changes affect visibility and access.
   • emp_id is coerced with Number() before use in the query filter.
   • status value is taken directly from req.body — should be validated against
     an allowed list (e.g. ["Active", "Inactive", "On Leave"]) before writing
     to prevent arbitrary values from being stored in the database.
   • $set scopes the update to current_status only — no other fields are touched.
----------------------------------------------------------------------------- */
export const updateEmployeeStatus = async (req, res) => {
  try {
    const emp_id = Number(req.params.emp_id);
    const db = await connectDB();

    const ALLOWED_STATUSES = ["Active", "Inactive"];
    const status = req.body.status;
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(", ")}` });
    }

    // $set scopes the update to current_status only — no other fields affected
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

/* -----------------------------------------------------------------------------
   HANDLER: getEmployeeCapacity
   GET /api/resources/employees/:emp_id/capacity
   -----------------------------------------------------------------------------
   Returns all capacity records for a specific employee, used by the capacity
   planning views to show available vs allocated hours per month.

   SECURITY:
   • emp_id is coerced with Number() — prevents string-typed IDs from matching
     unintended records.
   • _id is excluded via projection — MongoDB internal IDs are never returned.
   • No user input is used beyond the emp_id URL param.
----------------------------------------------------------------------------- */
export const getEmployeeCapacity = async (req, res) => {
  try {
    const emp_id = Number(req.params.emp_id);
    const db = await connectDB();

    // Projection excludes _id — MongoDB internal IDs are never exposed to client
    const capacity = await db
      .collection("capacity")
      .find({ emp_id }, { projection: { _id: 0 } })
      .toArray();

    return res.json(capacity);

  } catch (err) {
    console.error("getEmployeeCapacity error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* -----------------------------------------------------------------------------
   HANDLER: updateEmployeeCapacity
   PUT /api/resources/employees/:emp_id/capacity
   -----------------------------------------------------------------------------
   Processes an array of capacity entries for a specific employee. Each entry
   is either upserted (if amount is a valid number) or deleted (if amount is
   null, empty, or undefined). This keeps the collection clean and prevents
   zero-value noise from appearing in capacity reports.

   REQUEST BODY:
     { capacityEntries: [{ date: number, amount: number|null }, ...] }

   SECURITY:
   • MUST require JWT + RBAC — only Resource Managers should adjust capacity.
   • capacityEntries must be an array — returns 400 immediately if not.
   • Each entry's date is validated as a number before processing — non-numeric
     dates are skipped silently to prevent malformed data from reaching the DB.
   • amount is validated as a number before upsert — only valid numeric values
     trigger a write; null/empty/undefined values trigger a delete instead.
   • emp_id is coerced with Number() from the URL param — never from req.body.
----------------------------------------------------------------------------- */
export const updateEmployeeCapacity = async (req, res) => {
  try {
    const emp_id = Number(req.params.emp_id);
    const db = await connectDB();

    const updates = req.body.capacityEntries;

    // capacityEntries must be an array — reject immediately if not
    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: "capacityEntries must be an array" });
    }

    for (const entry of updates) {
      const { date, amount } = entry;

      // Skip entries with invalid date types — prevents malformed data reaching DB
      if (typeof date !== "number") continue;

      if (amount === null || amount === "" || amount === undefined) {
        // Null/empty amount — delete the record to keep the collection clean
        await db.collection("capacity").deleteOne({ emp_id, date });
        continue;
      }

      if (typeof amount === "number") {
        // Valid numeric amount — upsert the capacity record
        // Upsert creates the record if it doesn't exist, updates it if it does
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

/* -----------------------------------------------------------------------------
   HANDLER: getAllDepartments
   GET /api/resources/departments
   -----------------------------------------------------------------------------
   Returns all department records. Used to populate department dropdowns
   throughout the application.

   SECURITY:
   • No user input is used in the query — injection risk is eliminated.
   • _id is excluded via projection — MongoDB internal IDs are never returned.
   • Still requires JWT to prevent unauthenticated enumeration of internal
     organisational structure.
----------------------------------------------------------------------------- */
export const getAllDepartments = async (req, res) => {
  try {
    const db = await connectDB();

    // Projection excludes _id — MongoDB internal IDs are never exposed to client
    const departments = await db
      .collection("department")
      .find({}, { projection: { _id: 0 } })
      .toArray();

    return res.json(departments);

  } catch (err) {
    console.error("getAllDepartments error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* -----------------------------------------------------------------------------
   HANDLER: getAllManagers
   GET /api/resources/managers
   -----------------------------------------------------------------------------
   Returns all employees who hold a Resource Manager account (acc_type_id === 1).
   Uses an aggregation pipeline to join employee and account collections and
   filter to the correct role before projecting display-safe fields.

   SECURITY:
   • No user input is used in the pipeline — injection risk is eliminated.
   • $match scopes results to acc_type_id === 1 — only Resource Manager
     employees are returned, not all accounts or all employees.
   • $project explicitly whitelists returned fields — account credentials,
     passwords, and internal fields are never included in the response.
   • _id is excluded from the projection.
----------------------------------------------------------------------------- */
export const getAllManagers = async (req, res) => {
  try {
    const db = await connectDB();

    // Join employee with account collection and filter to Resource Managers only
    // $project whitelists display-safe fields — no account credentials returned
    const managers = await db
      .collection("employee")
      .aggregate([
        {
          $lookup: {
            from: "account",
            localField: "emp_id",
            foreignField: "emp_id",
            as: "account"
          }
        },
        { $unwind: "$account" },
        { $match: { "account.account.acc_type_id": 1 } }, // Resource Managers only
        {
          $project: {
            _id: 0,
            emp_id: 1,
            emp_name: 1,
            emp_title: 1,
            dept_no: 1
          }
        }
      ])
      .toArray();

    return res.json(managers);

  } catch (err) {
    console.error("getAllManagers error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
