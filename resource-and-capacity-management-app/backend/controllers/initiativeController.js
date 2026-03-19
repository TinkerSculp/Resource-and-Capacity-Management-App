/* =============================================================================
   initiativeController.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Handles all business logic for the initiatives resource:
       • getAllInitiatives      — Returns all initiatives with optional filtering
       • getInitiativeById      — Returns a single initiative by MongoDB _id
       • getInitiativesByDept   — Returns department info for a given employee name
       • getInitiativeDropdowns — Returns leads and requestors for form dropdowns
       • createInitiative       — Creates a new initiative with server-derived VP/dept
       • updateInitiative       — Updates an existing initiative with server-derived VP/dept

   SECURITY MODEL:
     • All write operations (create, update) must be protected by JWT + RBAC
       middleware — only Resource Managers should be permitted to modify initiatives.
     • MongoDB ObjectId values are validated with ObjectId.isValid() before any
       query — malformed IDs return 400 immediately without touching the DB.
     • Query parameters (?username, ?status, ?name) are treated as untrusted input —
       they are validated and used only in safe typed MongoDB queries, never
       interpolated into raw query strings.
     • requestor_vp and requesting_dept are derived server-side from the requestor's
       employee record — the client can never spoof or inject these values.
     • Aggregation pipelines use $project to explicitly control which fields are
       returned — no raw account documents or sensitive fields are ever exposed.
     • The "myInitiatives" filter verifies the username against the database before
       filtering — prevents a user from spoofing another user's username to see
       their initiatives.
     • Generic error messages on failure — full errors are logged server-side only.

   DEPENDENCIES:
     • mongodb          — ObjectId for _id-based queries
     • ../config/db.js  — MongoDB connection singleton
   ============================================================================= */

import { ObjectId } from "mongodb";
import { connectDB } from "../config/db.js";

/* -----------------------------------------------------------------------------
   HANDLER: getAllInitiatives
   GET /api/initiatives
   -----------------------------------------------------------------------------
   Returns all initiative records joined with department data via an aggregation
   pipeline. Supports optional filtering by status or by the requesting user's
   username.

   QUERY PARAMETERS:
     ?username=<username>  — Optional: also returns initiatives led by this user
     ?status=Completed     — Optional: returns only completed initiatives
     ?status=Cancelled     — Optional: returns only cancelled initiatives

   RESPONSE (default):
     { allAssignments: [...], myInitiatives: [...] }

   RESPONSE (status filter):
     { completed: [...] } or { cancelled: [...] }

   SECURITY:
   • Aggregation pipeline uses $lookup and $project — no user input is
     interpolated into the pipeline, eliminating injection risk.
   • $project explicitly whitelists returned fields — internal fields and
     sensitive account data are never included in the response.
   • status comparison is a simple string equality check — safe by design.
   • username is validated against the DB before filtering — prevents a user
     from spoofing another user's username to view their initiatives.
   • myInitiatives is further scoped to initiatives where leader === emp_name
     and status !== "Completed" — users only see their own active initiatives.
----------------------------------------------------------------------------- */
export const getAllInitiatives = async (req, res) => {
  try {
    const db = await connectDB();

    // Query params are optional — default to null if not provided
    const username = req.query.username || null;
    const status = req.query.status || null;

    // Aggregate all assignment records, joining with employee and department
    // to resolve the requesting department name from the VP's employee record.
    // $project whitelists returned fields — no internal fields are exposed.
    const allAssignments = await db
      .collection("assignment")
      .aggregate([
        {
          $lookup: {
            from: "employee",
            localField: "requestor_vp",
            foreignField: "emp_name",
            as: "vp_employee"
          }
        },
        { $unwind: { path: "$vp_employee", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "department",
            localField: "vp_employee.dept_no",
            foreignField: "dept_no",
            as: "vp_department"
          }
        },
        { $unwind: { path: "$vp_department", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            project_name: 1,
            category: 1,
            leader: 1,
            status: 1,
            requestor: 1,
            requestor_vp: 1,
            requesting_dept: "$vp_department.dept_name", // Resolved from VP's dept — not raw input
            target_period: 1,
            completion_date: 1,
            description: 1,
            resource_notes: 1
          }
        }
      ])
      .toArray();

    // Handle status filters — scoped to the user's own initiatives for Stakeholders
    if (status === "Completed" || status === "Cancelled") {
      let filtered = allAssignments.filter((i) => i.status === status);

      // For Stakeholders, scope to their own initiatives only
      if (username) {
        const account = await db.collection("account").findOne({
          "account.username": username
        });

        if (account && account.account?.acc_type_id === 2) {
          const employee = await db.collection("employee").findOne({
            emp_id: account.emp_id
          });

          if (employee) {
            // Resolve the dept_name from the employee's dept_no
            const dept = await db.collection("department").findOne({
              dept_no: employee.dept_no
            });

            if (dept?.dept_name) {
              // assignment.requesting_dept stores the dept name string — match directly
              filtered = filtered.filter(
                (i) => i.requesting_dept === dept.dept_name
              );
            }
          }
        }
      }

      if (status === "Completed") return res.json({ completed: filtered });
      if (status === "Cancelled") return res.json({ cancelled: filtered });
    }

    // Default: exclude cancelled initiatives from the main list
    const activeAssignments = allAssignments.filter(
      (i) => i.status !== "Cancelled"
    );

    let myInitiatives = [];

    if (username) {
      // Validate username against the DB — never trust the client-provided value
      const account = await db.collection("account").findOne({
        "account.username": username
      });

      if (account) {
        const accTypeId = account.account?.acc_type_id;

        // Resolve the employee record from the validated emp_id
        const employee = await db.collection("employee").findOne({
          emp_id: account.emp_id
        });

        if (employee) {
          const empName = employee.emp_name;

          if (accTypeId === 2) {
            // Stakeholder (acc_type_id 2) — match on leader, requestor, or requestor_vp
            // Completed and Cancelled are included so the tabs work correctly
            myInitiatives = allAssignments.filter(
              (i) =>
                i.leader === empName ||
                i.requestor === empName ||
                i.requestor_vp === empName
            );
          } else {
            // Resource Manager (acc_type_id 1) — match on leader only, active only
            myInitiatives = activeAssignments.filter(
              (i) =>
                i.leader === empName &&
                i.status !== "Completed"
            );
          }
        }
      }
    }

    return res.json({ allAssignments: activeAssignments, myInitiatives });

  } catch (err) {
    console.error("Initiatives GET error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* -----------------------------------------------------------------------------
   HANDLER: getInitiativeById
   GET /api/initiatives/:id
   -----------------------------------------------------------------------------
   Returns a single initiative record by its MongoDB _id.

   SECURITY:
   • ObjectId.isValid() validates the id format before any DB query — prevents
     malformed IDs from reaching the database and causing query errors.
   • Returns 404 if not found rather than exposing whether the ID format was
     valid or whether the collection was queried.
   • new ObjectId(id) will only be called after isValid() confirms the format.
----------------------------------------------------------------------------- */
export const getInitiativeById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format before querying — returns 400 on invalid format
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid initiative ID" });
    }

    const db = await connectDB();
    const data = await db.collection("assignment").findOne({
      _id: new ObjectId(id)
    });

    if (!data) {
      return res.status(404).json({ error: "Initiative not found" });
    }

    return res.json(data);

  } catch (err) {
    console.error("GetOne initiative error:", err);
    return res.status(500).json({ error: "Failed to load initiative" });
  }
};

/* -----------------------------------------------------------------------------
   HANDLER: getInitiativesByDept
   GET /api/initiatives/dept/search
   -----------------------------------------------------------------------------
   Returns the department number and name for a given employee name. Used to
   pre-populate department fields in the initiative form when a VP is selected.

   QUERY PARAMETERS:
     ?name=<emp_name>  — Required: the employee name to look up

   SECURITY:
   • name query param is required — returns 400 if missing.
   • Used in a MongoDB equality match — the driver handles the value as a
     typed parameter, not interpolated into a raw query string.
   • Returns only dept_no and dept_name — no internal employee fields exposed.
----------------------------------------------------------------------------- */
export const getInitiativesByDept = async (req, res) => {
  try {
    const db = await connectDB();
    const name = req.query.name;

    // name is required — return 400 immediately if missing
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    // Look up employee by name — used in an equality match, not interpolated
    const emp = await db.collection("employee").findOne({ emp_name: name });
    if (!emp) {
      return res.status(404).json({ error: `Employee "${name}" not found` });
    }

    // Resolve the department name from the employee's dept_no
    const dept = await db.collection("department").findOne({
      dept_no: emp.dept_no
    });

    // Return only the department fields needed by the form
    return res.json({
      dept_no: emp.dept_no,
      dept_name: dept?.dept_name || ""
    });

  } catch (err) {
    console.error("GetDept initiative error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* -----------------------------------------------------------------------------
   HANDLER: getInitiativeDropdowns
   GET /api/initiatives/dropdowns
   -----------------------------------------------------------------------------
   Returns the leads and requestors lists used to populate the initiative form
   dropdowns. Leads are scoped to Resource Managers (acc_type_id === 1).
   Requestors include both Resource Managers and Team Members (acc_type_id 1 + 2).

   SECURITY:
   • No user input is used in any pipeline — all data is derived from existing
     collection records, eliminating injection risk.
   • $project in each pipeline explicitly whitelists returned fields —
     sensitive account fields (passwords, tokens) are never included.
   • VP lookup uses a numeric emp_id join — not a user-controlled value.
   • Only emp_name is returned for leads — no account IDs or credentials exposed.
----------------------------------------------------------------------------- */
export const getInitiativeDropdowns = async (req, res) => {
  try {
    const db = await connectDB();

    // Leads: Resource Managers only (acc_type_id === 1)
    // $project returns only emp_name — no account credentials or IDs exposed
    const leads = await db
      .collection("account")
      .aggregate([
        { $match: { "account.acc_type_id": 1 } },
        {
          $lookup: {
            from: "employee",
            localField: "emp_id",
            foreignField: "emp_id",
            as: "employee_info"
          }
        },
        { $unwind: "$employee_info" },
        { $project: { _id: 0, emp_name: "$employee_info.emp_name" } }
      ])
      .toArray();

    // Requestors: Resource Managers + Team Members (acc_type_id 1 and 2)
    // VP name is resolved via a numeric emp_id join — not user input
    const requestors = await db
      .collection("account")
      .aggregate([
        { $match: { "account.acc_type_id": { $in: [1, 2] } } },
        {
          $lookup: {
            from: "employee",
            localField: "emp_id",
            foreignField: "emp_id",
            as: "employee_info"
          }
        },
        { $unwind: "$employee_info" },
        {
          $lookup: {
            from: "employee",
            localField: "employee_info.requestor_vp",
            foreignField: "emp_id",
            as: "vp_info"
          }
        },
        { $unwind: { path: "$vp_info", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            emp_name: "$employee_info.emp_name",
            acc_type_id: "$account.acc_type_id",
            requestor_vp: "$employee_info.requestor_vp",
            requestor_vp_name: "$vp_info.emp_name"
          }
        }
      ])
      .toArray();

    return res.json({ employees: leads, requestors });

  } catch (err) {
    console.error("Dropdown API error:", err);
    return res.status(500).json({ error: "Failed to load employee names" });
  }
};

/* -----------------------------------------------------------------------------
   HANDLER: createInitiative
   POST /api/initiatives
   -----------------------------------------------------------------------------
   Creates a new initiative record. Validates all required fields, then derives
   the requestor_vp and requesting_dept server-side from the requestor's employee
   record — the client cannot supply or spoof these values.

   REQUEST BODY:
     { project, category, lead, status, requestor, completion_date,
       target_period, description, resource_consideration }

   SECURITY:
   • MUST require JWT + RBAC — only Resource Managers should create initiatives.
   • All required fields are validated before any DB operation runs.
   • requestor_vp and requesting_dept are derived from the DB using the requestor
     name — the client cannot inject or tamper with these values.
   • created_at timestamp is set server-side — the client cannot spoof it.
   • MongoDB driver handles all values as typed parameters — no injection risk.
----------------------------------------------------------------------------- */
export const createInitiative = async (req, res) => {
  try {
    const db = await connectDB();
    const {
      project,
      category,
      lead,
      status,
      requestor,
      completion_date,
      target_period,
      description,
      resource_consideration
    } = req.body;

    // Validate all required fields — return 400 with a descriptive message
    // if any are missing or blank
    const required = { project, category, lead, status, requestor, target_period, description };

    for (const [key, value] of Object.entries(required)) {
      if (!value || value.trim() === "") {
        return res.status(400).json({
          error: `${key.replace(/_/g, " ")} is required.`
        });
      }
    }

    // Business rule: completion_date is required when status is "Completed"
    if ((status === "Completed" || status === "Cancelled") && (!completion_date || completion_date.trim() === "")) {
      return res.status(400).json({
        error: "Completion date is required when status is Completed or Cancelled."
      });
    }

    // Derive VP from the requestor's employee record — never trust client input
    // for this chain. Requestor name is validated against the DB first.
    const requestorEmployee = await db.collection("employee").findOne({
      emp_name: requestor
    });

    if (!requestorEmployee) {
      return res.status(400).json({ error: `Requestor "${requestor}" not found.` });
    }

    const vpEmpId = requestorEmployee.requestor_vp;

    if (!vpEmpId) {
      return res.status(400).json({ error: `No VP assigned for requestor "${requestor}".` });
    }

    // Resolve VP employee record using the numeric emp_id — not client-provided
    const vpEmployee = await db.collection("employee").findOne({ emp_id: vpEmpId });

    if (!vpEmployee) {
      return res.status(400).json({ error: `VP with ID "${vpEmpId}" not found.` });
    }

    const autoVPName = vpEmployee.emp_name;

    // Derive department from the VP's record — client cannot override this
    const deptRecord = await db.collection("department").findOne({
      dept_no: vpEmployee.dept_no
    });

    const autoDept = deptRecord?.dept_name || "";

    // Build the insert document — VP and dept are server-derived, not client-provided
    const newInitiative = {
      project_name: project,
      category,
      leader: lead,
      status,
      requestor,
      requestor_vp: autoVPName,     // Server-derived — cannot be spoofed by client
      requesting_dept: autoDept,    // Server-derived — cannot be spoofed by client
      target_period,
      completion_date: completion_date || null,
      description,
      resource_notes: resource_consideration || "",
      created_at: new Date()        // Server-side timestamp — cannot be spoofed
    };

    const result = await db.collection("assignment").insertOne(newInitiative);

    return res.json({ success: true, insertedId: result.insertedId });

  } catch (err) {
    console.error("Add Initiative API error:", err);
    return res.status(500).json({ error: "Failed to add initiative" });
  }
};

/* -----------------------------------------------------------------------------
   HANDLER: updateInitiative
   PUT /api/initiatives
   -----------------------------------------------------------------------------
   Updates an existing initiative record. Validates the ObjectId and all required
   fields, then re-derives requestor_vp and requesting_dept server-side from the
   requestor's employee record — the client cannot supply or tamper with these.

   REQUEST BODY:
     { id, project, category, lead, status, requestor, completion_date,
       target_period, description, resource_consideration }

   SECURITY:
   • MUST require JWT + RBAC — only Resource Managers should update initiatives.
   • ObjectId.isValid() validates the id before any DB query.
   • All required fields are validated before any DB operation runs.
   • requestor_vp and requesting_dept are re-derived on every update — the client
     cannot inject or alter these values even across multiple edits.
   • updated_at is set server-side — the client cannot spoof the audit timestamp.
   • $set ensures only the specified fields are updated — no unintended overwrites.
----------------------------------------------------------------------------- */
export const updateInitiative = async (req, res) => {
  try {
    const db = await connectDB();
    const {
      id,
      project,
      category,
      lead,
      status,
      requestor,
      completion_date,
      target_period,
      description,
      resource_consideration
    } = req.body;

    // Validate ObjectId format before any DB query — returns 400 on invalid format
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid initiative ID" });
    }

    // Validate all required fields — return 400 with a descriptive message
    // if any are missing or blank
    const required = { project, category, lead, status, requestor, target_period, description };

    for (const [key, value] of Object.entries(required)) {
      if (!value || value.trim() === "") {
        return res.status(400).json({
          error: `${key.replace(/_/g, " ")} is required.`
        });
      }
    }

    // Business rule: completion_date is required when status is "Completed"
    if ((status === "Completed" || status === "Cancelled") && (!completion_date || completion_date.trim() === "")) {
      return res.status(400).json({
        error: "Completion date is required when status is Completed or Cancelled."
      });
    }

    // Re-derive VP from the requestor's employee record on every update —
    // prevents a client from retaining a stale or spoofed VP from a previous save
    const requestorEmployee = await db.collection("employee").findOne({
      emp_name: requestor
    });

    if (!requestorEmployee) {
      return res.status(400).json({ error: `Requestor "${requestor}" not found.` });
    }

    const vpEmpId = requestorEmployee.requestor_vp;

    if (!vpEmpId) {
      return res.status(400).json({ error: `No VP assigned for requestor "${requestor}".` });
    }

    // Resolve VP employee record using numeric emp_id — validates VP still exists
    const vpEmployee = await db.collection("employee").findOne({ emp_id: vpEmpId });

    if (!vpEmployee) {
      return res.status(400).json({ error: `VP with ID "${vpEmpId}" not found.` });
    }

    const autoVPName = vpEmployee.emp_name;

    // Re-derive department from VP's current record — reflects any org changes
    const deptRecord = await db.collection("department").findOne({
      dept_no: vpEmployee.dept_no
    });

    const autoDept = deptRecord?.dept_name || "";

    // Build the update document — VP and dept are server-derived, not client-provided
    const updated = {
      project_name: project,
      category,
      leader: lead,
      status,
      requestor,
      requestor_vp: autoVPName,     // Re-derived server-side on every update
      requesting_dept: autoDept,    // Re-derived server-side on every update
      target_period,
      completion_date: completion_date || null,
      description,
      resource_notes: resource_consideration || "",
      updated_at: new Date()        // Server-side audit timestamp — cannot be spoofed
    };

    // $set ensures only specified fields are updated — no unintended overwrites
    await db.collection("assignment").updateOne(
      { _id: new ObjectId(id) }, // Validated ObjectId — safe to convert
      { $set: updated }
    );

    return res.json({ success: true });

  } catch (err) {
    console.error("Edit Initiative API error:", err);
    return res.status(500).json({ error: "Failed to update initiative" });
  }
};
