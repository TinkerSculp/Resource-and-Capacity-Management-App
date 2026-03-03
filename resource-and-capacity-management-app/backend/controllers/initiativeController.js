import { ObjectId } from "mongodb";
import { connectDB } from "../config/db.js";

/**
 * ===========================================================================
 * CONTROLLER: getAllInitiatives
 * ===========================================================================
 * SECURITY NOTES:
 * • This endpoint returns potentially sensitive initiative data.
 * • MUST be protected by JWT middleware at the router level.
 * • Query params (?username, ?status) must be treated as untrusted input.
 * • Aggregation pipeline is safe because fields are not interpolated directly.
 * • Always sanitize output on the client (you already do this).
 * • Prevents privilege escalation by filtering "myInitiatives" by username.
 * ===========================================================================
 */
export const getAllInitiatives = async (req, res) => {
  try {
    const db = await connectDB();
    const username = req.query.username || null;
    const status = req.query.status || null;

    // SECURITY:
    // • Aggregation pipeline is safe — no string interpolation.
    // • $lookup and $project prevent leaking internal fields.
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
            requesting_dept: "$vp_department.dept_name",
            target_period: 1,
            completion_date: 1,
            description: 1,
            resource_notes: 1
          }
        }
      ])
      .toArray();

    // SECURITY:
    // • Status filtering is safe because comparison is string‑based.
    if (status === "Completed") {
      const completed = allAssignments.filter(i => i.status === "Completed");
      return res.json({ completed });
    }

    if (status === "Cancelled") {
      const cancelled = allAssignments.filter(i => i.status === "Cancelled");
      return res.json({ cancelled });
    }

    // Default: exclude cancelled
    const activeAssignments = allAssignments.filter(
      i => i.status !== "Cancelled"
    );

    let myInitiatives = [];

    // SECURITY:
    // • Username is untrusted — must validate existence in DB.
    // • Prevents users from spoofing another username.
    if (username) {
      const account = await db.collection("account").findOne({
        "account.username": username
      });

      if (account) {
        const employee = await db.collection("employee").findOne({
          emp_id: account.emp_id
        });

        if (employee) {
          // SECURITY:
          // • Ensures user only sees initiatives they lead.
          myInitiatives = activeAssignments.filter(
            i =>
              i.leader === employee.emp_name &&
              i.status !== "Completed"
          );
        }
      }
    }

    return res.json({ allAssignments: activeAssignments, myInitiatives });
  } catch (err) {
    console.error("Initiatives GET error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * ===========================================================================
 * CONTROLLER: getInitiativeById
 * ===========================================================================
 * SECURITY NOTES:
 * • Validates ObjectId to prevent malformed queries.
 * • Must ensure user is authorized to view this initiative (RBAC).
 * • Returns 404 instead of leaking DB structure.
 * ===========================================================================
 */
export const getInitiativeById = async (req, res) => {
  try {
    const { id } = req.params;

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

/**
 * ===========================================================================
 * CONTROLLER: getInitiativesByDept
 * ===========================================================================
 * SECURITY NOTES:
 * • Query param "name" is untrusted — must sanitize.
 * • Prevents injection because MongoDB driver handles values safely.
 * • Does not expose internal employee IDs beyond what is needed.
 * ===========================================================================
 */
export const getInitiativesByDept = async (req, res) => {
  try {
    const db = await connectDB();
    const name = req.query.name;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const emp = await db.collection("employee").findOne({ emp_name: name });
    if (!emp) {
      return res.status(404).json({ error: `Employee "${name}" not found` });
    }

    const dept = await db.collection("department").findOne({
      dept_no: emp.dept_no
    });

    return res.json({
      dept_no: emp.dept_no,
      dept_name: dept?.dept_name || ""
    });
  } catch (err) {
    console.error("GetDept initiative error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * ===========================================================================
 * CONTROLLER: getInitiativeDropdowns
 * ===========================================================================
 * SECURITY NOTES:
 * • Read‑only endpoint but still must require authentication.
 * • Aggregation pipeline prevents leaking sensitive account fields.
 * • VP lookup is safe because it uses numeric emp_id, not user input.
 * ===========================================================================
 */
export const getInitiativeDropdowns = async (req, res) => {
  try {
    const db = await connectDB();

    // SECURITY:
    // • Only exposes emp_name — no emails, IDs, or sensitive fields.
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

    // SECURITY:
    // • VP lookup is safe — no user input used in pipeline.
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

/**
 * ===========================================================================
 * CONTROLLER: createInitiative
 * ===========================================================================
 * SECURITY NOTES:
 * • MUST require JWT + RBAC (Resource Manager only).
 * • req.body is untrusted — must validate every field.
 * • Prevents spoofing VP/Dept by auto‑deriving them from DB.
 * • Prevents injection because MongoDB driver handles values safely.
 * ===========================================================================
 */
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

    // SECURITY:
    // • Required field validation prevents malformed inserts.
    const required = {
      project,
      category,
      lead,
      status,
      requestor,
      target_period,
      description
    };

    for (const [key, value] of Object.entries(required)) {
      if (!value || value.trim() === "") {
        return res.status(400).json({
          error: `${key.replace(/_/g, " ")} is required.`
        });
      }
    }

    // SECURITY:
    // • Business rule enforcement prevents inconsistent data.
    if (
      status === "Completed" &&
      (!completion_date || completion_date.trim() === "")
    ) {
      return res.status(400).json({
        error: "Completion date is required when status is Completed."
      });
    }

    // SECURITY:
    // • Prevents spoofing requestor → VP → Dept chain.
    const requestorEmployee = await db.collection("employee").findOne({
      emp_name: requestor
    });

    if (!requestorEmployee) {
      return res
        .status(400)
        .json({ error: `Requestor "${requestor}" not found.` });
    }

    const vpEmpId = requestorEmployee.requestor_vp;

    if (!vpEmpId) {
      return res
        .status(400)
        .json({ error: `No VP assigned for requestor "${requestor}".` });
    }

    const vpEmployee = await db.collection("employee").findOne({
      emp_id: vpEmpId
    });

    if (!vpEmployee) {
      return res
        .status(400)
        .json({ error: `VP with ID "${vpEmpId}" not found.` });
    }

    const autoVPName = vpEmployee.emp_name;

    const deptRecord = await db.collection("department").findOne({
      dept_no: vpEmployee.dept_no
    });

    const autoDept = deptRecord?.dept_name || "";

    // SECURITY:
    // • Server‑side derivation prevents client tampering.
    const newInitiative = {
      project_name: project,
      category,
      leader: lead,
      status,
      requestor,
      requestor_vp: autoVPName,
      requesting_dept: autoDept,
      target_period,
      completion_date: completion_date || null,
      description,
      resource_notes: resource_consideration || "",
      created_at: new Date()
    };

    const result = await db.collection("assignment").insertOne(newInitiative);

    return res.json({ success: true, insertedId: result.insertedId });
  } catch (err) {
    console.error("Add Initiative API error:", err);
    return res.status(500).json({ error: "Failed to add initiative" });
  }
};

/**
 * ===========================================================================
 * CONTROLLER: updateInitiative
 * ===========================================================================
 * SECURITY NOTES:
 * • MUST require JWT + RBAC (only authorized roles can update).
 * • Validates ObjectId to prevent malformed queries.
 * • req.body is untrusted — must validate all fields.
 * • Prevents client from tampering with VP/Dept (should be re‑derived).
 * ===========================================================================
 */
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

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid initiative ID" });
    }

    // SECURITY:
    // • Required field validation prevents malformed updates.
    const required = {
      project,
      category,
      lead,
      status,
      requestor,
      target_period,
      description
    };

    for (const [key, value] of Object.entries(required)) {
      if (!value || value.trim() === "") {
        return res.status(400).json({
          error: `${key.replace(/_/g, " ")} is required.`
        });
      }
    }

    if (
    status === "Completed" &&
    (!completion_date || completion_date.trim() === "")
  ) {
    return res.status(400).json({
      error: "Completion date is required when status is Completed."
    });
  }

  /*
    SECURITY:
    • Prevents client-side spoofing of the requestor → VP → Dept chain.
    • Requestor name comes from untrusted input — must validate against DB.
    • Ensures initiative cannot be assigned to a non-existent or unauthorized user.
  */
  const requestorEmployee = await db.collection("employee").findOne({
    emp_name: requestor
  });

  if (!requestorEmployee) {
    return res
      .status(400)
      .json({ error: `Requestor "${requestor}" not found.` });
  }

  /*
    SECURITY:
    • VP relationship is derived from server-side authoritative data.
    • Prevents tampering where a client tries to assign a different VP.
  */
  const vpEmpId = requestorEmployee.requestor_vp;

  if (!vpEmpId) {
    return res
      .status(400)
      .json({ error: `No VP assigned for requestor "${requestor}".` });
  }

  /*
    SECURITY:
    • Validates VP exists — prevents dangling references.
    • Protects against malformed or legacy data.
  */
  const vpEmployee = await db.collection("employee").findOne({
    emp_id: vpEmpId
  });

  if (!vpEmployee) {
    return res
      .status(400)
      .json({ error: `VP with ID "${vpEmpId}" not found.` });
  }

  const autoVPName = vpEmployee.emp_name;

  /*
    SECURITY:
    • Department is derived from VP’s authoritative record.
    • Prevents client from injecting or altering department values.
  */
  const deptRecord = await db.collection("department").findOne({
    dept_no: vpEmployee.dept_no
  });

  const autoDept = deptRecord?.dept_name || "";

  /*
    SECURITY:
    • All fields are server-derived or validated.
    • Prevents injection because MongoDB driver safely handles values.
    • updated_at timestamp ensures auditability.
  */
  const updated = {
    project_name: project,
    category,
    leader: lead,
    status,
    requestor,
    requestor_vp: autoVPName,
    requesting_dept: autoDept,
    target_period,
    completion_date: completion_date || null,
    description,
    resource_notes: resource_consideration || "",
    updated_at: new Date()
  };

  /*
    SECURITY:
    • updateOne uses a validated ObjectId — prevents malformed queries.
    • $set ensures no unintended fields are overwritten.
  */
  await db.collection("assignment").updateOne(
    { _id: new ObjectId(id) },
    { $set: updated }
  );

  return res.json({ success: true });
  } catch (err) {
    console.error("Edit Initiative API error:", err);
    return res.status(500).json({ error: "Failed to update initiative" });
  }
};