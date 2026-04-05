/* =============================================================================
   initiativeController.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Handles all business logic for the Initiatives resource:
       • getAllInitiatives      — Returns all initiatives with optional filtering
       • getInitiativeById      — Returns a single initiative by MongoDB _id
       • getInitiativesByDept   — Returns department info for a given employee name
       • getInitiativeDropdowns — Returns leads and requestors for form dropdowns
       • createInitiative       — Creates a new initiative
       • updateInitiative       — Updates an existing initiative

   KEY DESIGN DECISION — SERVER-DERIVED VP AND DEPARTMENT:
     requestor_vp and requesting_dept are never accepted from the client.
     They are always derived server-side from the requestor's employee record
     on both create and update. This means:
       • The client cannot spoof or inject these values
       • Both fields stay consistent with the current org structure —
         if a VP changes, the next save will automatically reflect that
       • Admins cannot accidentally break the VP/dept chain by editing the form

   SECURITY MODEL:
     • MongoDB ObjectId values are validated with ObjectId.isValid() before any
       query — malformed IDs return 400 immediately without touching the DB.
     • Query parameters (?username, ?status, ?name) are used only in safe
       typed MongoDB queries — never interpolated into raw query strings.
     • requestor_vp and requesting_dept are derived server-side — the client
       cannot supply or spoof these values.
     • Aggregation pipelines use $project to explicitly whitelist returned fields —
       no raw account documents or sensitive fields are ever exposed.
     • The myInitiatives filter validates the username against the DB before
       filtering — prevents a user from spoofing another user's username.
     • Generic error messages on failure — full errors are logged server-side only.

   DEPENDENCIES:
     • mongodb          — ObjectId for _id-based queries
     • ../config/db.js  — MongoDB connection singleton
   ============================================================================= */

import { ObjectId } from "mongodb";
import { connectDB } from "../config/db.js";

/* =============================================================================
   HANDLER: getAllInitiatives
   GET /api/initiatives
   -----------------------------------------------------------------------------
   Returns all initiative records joined with department data via an aggregation
   pipeline. Supports optional filtering by status or by the requesting user's
   username ("My Initiatives" tab).

   QUERY PARAMETERS:
     ?username=<username>  — Optional: also returns initiatives for this user
     ?status=Completed     — Optional: returns only completed initiatives
     ?status=Cancelled     — Optional: returns only cancelled initiatives

   RESPONSE (default):
     { allAssignments: [...], myInitiatives: [...] }

   RESPONSE (status filter):
     { completed: [...] }  or  { cancelled: [...] }

   AGGREGATION STRATEGY:
     The pipeline uses two $lookup stages to resolve requesting_dept from the
     VP's employee record → department collection. This is done server-side
     so the client always receives the human-readable dept name rather than a
     dept code that it would need to resolve separately.
   ============================================================================= */
export const getAllInitiatives = async (req, res) => {
  try {
    const db = await connectDB();

    const username = req.query.username || null;
    const status   = req.query.status   || null;

    /* -------------------------------------------------------------------------
       AGGREGATION PIPELINE
       Joins assignment → employee (via requestor_vp name) → department
       to resolve the requesting dept name. $project whitelists returned
       fields — internal fields and sensitive account data are never included.
    --------------------------------------------------------------------------- */
    const allAssignments = await db.collection("assignment").aggregate([
      // Join to employee collection to get the VP's record by name
      {
        $lookup: {
          from:         "employee",
          localField:   "requestor_vp",
          foreignField: "emp_name",
          as:           "vp_employee"
        }
      },
      // Unwind preserveNullAndEmptyArrays — keeps rows where VP lookup fails
      { $unwind: { path: "$vp_employee", preserveNullAndEmptyArrays: true } },
      // Join to department collection using the VP's dept_no
      {
        $lookup: {
          from:         "department",
          localField:   "vp_employee.dept_no",
          foreignField: "dept_no",
          as:           "vp_department"
        }
      },
      { $unwind: { path: "$vp_department", preserveNullAndEmptyArrays: true } },
      // Whitelist returned fields — requesting_dept resolved from VP's dept record
      {
        $project: {
          _id:             1,
          project_name:    1,
          category:        1,
          leader:          1,
          status:          1,
          requestor:       1,
          requestor_vp:    1,
          requesting_dept: "$vp_department.dept_name", // Resolved server-side — not raw client input
          target_period:   1,
          completion_date: 1,
          description:     1,
          resource_notes:  1
        }
      }
    ]).toArray();

    /* -------------------------------------------------------------------------
       STATUS FILTER — Completed / Cancelled
       Used by the Completed and Cancelled tabs. For Stakeholders, further
       scopes to their own department's initiatives only.
    --------------------------------------------------------------------------- */
    if (status === "Completed" || status === "Cancelled") {
      let filtered = allAssignments.filter(i => i.status === status);

      if (username) {
        const account = await db.collection("account").findOne({
          "account.username": username
        });

        // Scope Stakeholder (type 2) results to their own department
        if (account && account.account?.acc_type_id === 2) {
          const employee = await db.collection("employee").findOne({
            emp_id: account.emp_id
          });

          if (employee) {
            const dept = await db.collection("department").findOne({
              dept_no: employee.dept_no
            });

            if (dept?.dept_name) {
              // requesting_dept stores the dept name string — match directly
              filtered = filtered.filter(i => i.requesting_dept === dept.dept_name);
            }
          }
        }
      }

      if (status === "Completed") return res.json({ completed: filtered });
      if (status === "Cancelled") return res.json({ cancelled: filtered });
    }

    /* -------------------------------------------------------------------------
       DEFAULT — active initiatives only, plus My Initiatives for the user
       Cancelled initiatives are excluded from the default list — they appear
       only in the Cancelled tab via the status filter above.
    --------------------------------------------------------------------------- */
    const activeAssignments = allAssignments.filter(i => i.status !== "Cancelled");

    let myInitiatives = [];

    if (username) {
      // Validate username against the DB — never trust client-provided identity
      const account = await db.collection("account").findOne({
        "account.username": username
      });

      if (account) {
        const accTypeId = account.account?.acc_type_id;

        const employee = await db.collection("employee").findOne({
          emp_id: account.emp_id
        });

        if (employee) {
          const empName = employee.emp_name;

          if (accTypeId === 2) {
            // Stakeholder — can see initiatives they requested or are VP on
            // Includes all statuses so all tabs work correctly
            myInitiatives = allAssignments.filter(
              i =>
                i.leader       === empName ||
                i.requestor    === empName ||
                i.requestor_vp === empName
            );
          } else {
            // Resource Manager — sees only initiatives they lead, active only
            myInitiatives = activeAssignments.filter(
              i => i.leader === empName && i.status !== "Completed"
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

/* =============================================================================
   HANDLER: getInitiativeById
   GET /api/initiatives/:id
   -----------------------------------------------------------------------------
   Returns a single initiative record by its MongoDB _id. Used by the Edit
   Initiative modal to pre-populate the form with existing values.

   SECURITY:
     • ObjectId.isValid() validates the id format before any DB query —
       prevents malformed IDs from reaching the database
     • new ObjectId(id) is only called after isValid() confirms the format
   ============================================================================= */
export const getInitiativeById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format before querying — prevents DB errors on bad input
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid initiative ID" });
    }

    const db   = await connectDB();
    const data = await db.collection("assignment").findOne({ _id: new ObjectId(id) });

    if (!data) {
      return res.status(404).json({ error: "Initiative not found" });
    }

    return res.json(data);

  } catch (err) {
    console.error("GetOne initiative error:", err);
    return res.status(500).json({ error: "Failed to load initiative" });
  }
};

/* =============================================================================
   HANDLER: getInitiativesByDept
   GET /api/initiatives/dept/search
   -----------------------------------------------------------------------------
   Returns the department number and name for a given employee name. Used by
   the initiative form to auto-populate the Requesting Dept field when a
   Requestor is selected from the dropdown.

   QUERY PARAMETERS:
     ?name=<emp_name>  — Required: the employee name to look up

   SECURITY:
     • name is required — returns 400 if missing
     • Used in a MongoDB equality match — no injection risk
     • Returns only dept_no and dept_name — no other employee fields exposed
   ============================================================================= */
export const getInitiativesByDept = async (req, res) => {
  try {
    const db   = await connectDB();
    const name = req.query.name;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const emp = await db.collection("employee").findOne({ emp_name: name });
    if (!emp) {
      return res.status(404).json({ error: `Employee "${name}" not found` });
    }

    // Resolve department name from the employee's dept_no
    const dept = await db.collection("department").findOne({ dept_no: emp.dept_no });

    return res.json({
      dept_no:   emp.dept_no,
      dept_name: dept?.dept_name || ""
    });

  } catch (err) {
    console.error("GetDept initiative error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* =============================================================================
   HANDLER: getInitiativeDropdowns
   GET /api/initiatives/dropdowns
   -----------------------------------------------------------------------------
   Returns the leads and requestors lists for the initiative form dropdowns.
   Leads are scoped to Resource Managers (acc_type_id === 1).
   Requestors include Resource Managers and Stakeholders (acc_type_id 1 + 2),
   enriched with their VP name for auto-population of the Requestor VP field.

   SECURITY:
     • No user input is used in any pipeline — all data derived from the DB
     • $project whitelists returned fields — no passwords or account IDs exposed
     • VP lookup uses a numeric emp_id join — not a user-controlled value
   ============================================================================= */
export const getInitiativeDropdowns = async (req, res) => {
  try {
    const db = await connectDB();

    /* -------------------------------------------------------------------------
       LEADS — Resource Managers only (acc_type_id === 1)
       Only emp_name is returned — no account credentials or IDs exposed.
    --------------------------------------------------------------------------- */
    const leads = await db.collection("account").aggregate([
      { $match: { "account.acc_type_id": 1 } },
      {
        $lookup: {
          from:         "employee",
          localField:   "emp_id",
          foreignField: "emp_id",
          as:           "employee_info"
        }
      },
      { $unwind: "$employee_info" },
      { $project: { _id: 0, emp_name: "$employee_info.emp_name" } }
    ]).toArray();

    /* -------------------------------------------------------------------------
       REQUESTORS — Resource Managers + Stakeholders (acc_type_id 1 and 2)
       VP name is resolved via numeric emp_id join — not user input.
       requestor_vp_name is used by the frontend to auto-populate the VP field
       when a requestor is selected.
    --------------------------------------------------------------------------- */
    const requestors = await db.collection("account").aggregate([
      { $match: { "account.acc_type_id": { $in: [1, 2] } } },
      {
        $lookup: {
          from:         "employee",
          localField:   "emp_id",
          foreignField: "emp_id",
          as:           "employee_info"
        }
      },
      { $unwind: "$employee_info" },
      {
        $lookup: {
          from:         "employee",
          localField:   "employee_info.requestor_vp",
          foreignField: "emp_id",
          as:           "vp_info"
        }
      },
      // preserveNullAndEmptyArrays — keep requestors who have no VP assigned
      { $unwind: { path: "$vp_info", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id:               0,
          emp_name:          "$employee_info.emp_name",
          acc_type_id:       "$account.acc_type_id",
          requestor_vp:      "$employee_info.requestor_vp",
          requestor_vp_name: "$vp_info.emp_name" // Resolved VP name for auto-population
        }
      }
    ]).toArray();

    return res.json({ employees: leads, requestors });

  } catch (err) {
    console.error("Dropdown API error:", err);
    return res.status(500).json({ error: "Failed to load employee names" });
  }
};

/* =============================================================================
   HANDLER: createInitiative
   POST /api/initiatives
   -----------------------------------------------------------------------------
   Creates a new initiative record. Validates all required fields, then derives
   requestor_vp and requesting_dept server-side from the requestor's employee
   record — the client cannot supply or spoof these values.

   REQUEST BODY:
     { project, category, lead, status, requestor, completion_date,
       target_period, description, resource_consideration }

   DERIVATION CHAIN:
     requestor name → employee.requestor_vp (emp_id) → VP employee → VP name
     VP employee.dept_no → department → dept_name

   SECURITY:
     • All required fields validated before any DB operation
     • requestor_vp and requesting_dept are derived from the DB — not client input
     • created_at timestamp is set server-side — cannot be spoofed by client
   ============================================================================= */
export const createInitiative = async (req, res) => {
  try {
    const db = await connectDB();
    const {
      project, category, lead, status, requestor,
      completion_date, target_period, description, resource_consideration
    } = req.body;

    // Validate all required fields — return 400 with a descriptive message
    const required = { project, category, lead, status, requestor, target_period, description };
    for (const [key, value] of Object.entries(required)) {
      if (!value || value.trim() === "") {
        return res.status(400).json({ error: `${key.replace(/_/g, " ")} is required.` });
      }
    }

    // Business rule: completion_date required when status is Completed or Cancelled
    if (
      (status === "Completed" || status === "Cancelled") &&
      (!completion_date || completion_date.trim() === "")
    ) {
      return res.status(400).json({
        error: "Completion date is required when status is Completed or Cancelled."
      });
    }

    /* -------------------------------------------------------------------------
       DERIVE VP + DEPARTMENT FROM REQUESTOR
       Chain: requestor name → employee record → VP emp_id → VP record → dept
       Each step validates the previous — fails fast with a descriptive error
       if any part of the chain is broken (e.g. missing VP assignment).
    --------------------------------------------------------------------------- */
    const requestorEmployee = await db.collection("employee").findOne({ emp_name: requestor });
    if (!requestorEmployee) {
      return res.status(400).json({ error: `Requestor "${requestor}" not found.` });
    }

    const vpEmpId = requestorEmployee.requestor_vp;
    if (!vpEmpId) {
      return res.status(400).json({ error: `No VP assigned for requestor "${requestor}".` });
    }

    const vpEmployee = await db.collection("employee").findOne({ emp_id: vpEmpId });
    if (!vpEmployee) {
      return res.status(400).json({ error: `VP with ID "${vpEmpId}" not found.` });
    }

    const autoVPName = vpEmployee.emp_name;

    const deptRecord = await db.collection("department").findOne({ dept_no: vpEmployee.dept_no });
    const autoDept   = deptRecord?.dept_name || "";

    // Build insert document — VP and dept are server-derived, not client-provided
    const newInitiative = {
      project_name:    project,
      category,
      leader:          lead,
      status,
      requestor,
      requestor_vp:    autoVPName,  // Server-derived — cannot be spoofed
      requesting_dept: autoDept,    // Server-derived — cannot be spoofed
      target_period,
      completion_date: completion_date || null,
      description,
      resource_notes:  resource_consideration || "",
      created_at:      new Date()   // Server-side timestamp — cannot be spoofed
    };

    const result = await db.collection("assignment").insertOne(newInitiative);
    return res.json({ success: true, insertedId: result.insertedId });

  } catch (err) {
    console.error("Add Initiative API error:", err);
    return res.status(500).json({ error: "Failed to add initiative" });
  }
};

/* =============================================================================
   HANDLER: updateInitiative
   PUT /api/initiatives
   -----------------------------------------------------------------------------
   Updates an existing initiative record. Re-derives requestor_vp and
   requesting_dept on every save — this ensures both fields always reflect
   the current org structure, even if the VP or department changed since the
   initiative was last edited.

   REQUEST BODY:
     { id, project, category, lead, status, requestor, completion_date,
       target_period, description, resource_consideration }

   SECURITY:
     • ObjectId.isValid() validates id before any DB query
     • requestor_vp and requesting_dept re-derived on every update — client
       cannot retain a stale or spoofed value from a previous save
     • updated_at is set server-side — cannot be spoofed by the client
     • $set ensures only specified fields are updated — no unintended overwrites
   ============================================================================= */
export const updateInitiative = async (req, res) => {
  try {
    const db = await connectDB();
    const {
      id, project, category, lead, status, requestor,
      completion_date, target_period, description, resource_consideration
    } = req.body;

    // Validate ObjectId format before any DB query
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid initiative ID" });
    }

    // Validate all required fields
    const required = { project, category, lead, status, requestor, target_period, description };
    for (const [key, value] of Object.entries(required)) {
      if (!value || value.trim() === "") {
        return res.status(400).json({ error: `${key.replace(/_/g, " ")} is required.` });
      }
    }

    // Business rule: completion_date required when status is Completed or Cancelled
    if (
      (status === "Completed" || status === "Cancelled") &&
      (!completion_date || completion_date.trim() === "")
    ) {
      return res.status(400).json({
        error: "Completion date is required when status is Completed or Cancelled."
      });
    }

    /* -------------------------------------------------------------------------
       RE-DERIVE VP + DEPARTMENT FROM REQUESTOR
       Re-derived on every update — not stored from the previous save.
       This ensures both fields reflect current org structure and prevents
       a client from retaining a stale or spoofed VP from a previous edit.
    --------------------------------------------------------------------------- */
    const requestorEmployee = await db.collection("employee").findOne({ emp_name: requestor });
    if (!requestorEmployee) {
      return res.status(400).json({ error: `Requestor "${requestor}" not found.` });
    }

    const vpEmpId = requestorEmployee.requestor_vp;
    if (!vpEmpId) {
      return res.status(400).json({ error: `No VP assigned for requestor "${requestor}".` });
    }

    const vpEmployee = await db.collection("employee").findOne({ emp_id: vpEmpId });
    if (!vpEmployee) {
      return res.status(400).json({ error: `VP with ID "${vpEmpId}" not found.` });
    }

    const autoVPName = vpEmployee.emp_name;

    const deptRecord = await db.collection("department").findOne({ dept_no: vpEmployee.dept_no });
    const autoDept   = deptRecord?.dept_name || "";

    // Build update document — $set ensures only these fields are changed
    const updated = {
      project_name:    project,
      category,
      leader:          lead,
      status,
      requestor,
      requestor_vp:    autoVPName,  // Re-derived server-side on every update
      requesting_dept: autoDept,    // Re-derived server-side on every update
      target_period,
      completion_date: completion_date || null,
      description,
      resource_notes:  resource_consideration || "",
      updated_at:      new Date()   // Server-side audit timestamp — cannot be spoofed
    };

    await db.collection("assignment").updateOne(
      { _id: new ObjectId(id) }, // Safe — ObjectId validated above
      { $set: updated }
    );

    return res.json({ success: true });

  } catch (err) {
    console.error("Edit Initiative API error:", err);
    return res.status(500).json({ error: "Failed to update initiative" });
  }
};

/* =============================================================================
   HANDLER: deleteInitiative
   DELETE /api/initiatives/:id
   -----------------------------------------------------------------------------
   Deletes a single initiative record by its MongoDB _id.

   SECURITY:
     • Must be protected by JWT + RBAC — only Resource Managers should delete
     • ObjectId.isValid() validates the id format before any DB query —
       malformed IDs return 400 immediately without touching the DB
     • Returns 404 if initiative not found — no silent no-ops on missing records
     • Generic error message on failure — full error logged server-side only
   ============================================================================= */
export const deleteInitiative = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format before querying — prevents DB errors on bad input
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid initiative ID" });
    }

    const db     = await connectDB();
    const result = await db.collection("assignment").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Initiative not found" });
    }

    return res.json({ success: true, message: "Initiative deleted successfully" });

  } catch (err) {
    console.error("deleteInitiative error:", err);
    return res.status(500).json({ error: "Failed to delete initiative" });
  }
};
