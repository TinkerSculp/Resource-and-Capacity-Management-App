// Allocation operations
import { connectDB } from "../config/db.js";
import { ObjectId } from "mongodb";

/* ---------------------------------------------------------
   HELPERS
--------------------------------------------------------- */

// Build rolling month range (unchanged)
function buildMonthRange() {
  const months = [];
  const now = new Date();

  const start = new Date(now);
  start.setMonth(start.getMonth() - 12); // keep 12 months before
  start.setDate(1);

  // 12 before + 1 current + 16 after = 29 months
  for (let i = 0; i < 29; i++) {
    const y = start.getFullYear();
    const m = start.getMonth() + 1;
    months.push(`${y}${m.toString().padStart(2, "0")}`);
    start.setMonth(start.getMonth() + 1);
  }

  return months;
}

// Current YYYYMM as number
function getCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return Number(`${year}${month}`);
}

// Delete future allocations for an employee/activity/category
async function deleteFutureAllocations(db, emp_id, activity, category) {
  const currentMonth = getCurrentMonth();

  await db.collection("allocation").deleteMany({
    emp_id,
    activity,
    category,
    date: { $gt: currentMonth }
  });
}

// Upsert current month allocation = 1
async function createCurrentMonthAllocation(db, emp_id, activity, category) {
  const currentMonth = getCurrentMonth();

  await db.collection("allocation").updateOne(
    {
      emp_id,
      activity,
      category,
      date: currentMonth
    },
    {
      $set: {
        amount: 1,
        activity,
        category,
        date: currentMonth
      }
    },
    { upsert: true }
  );
}

/* ---------------------------------------------------------
   GET ALL ALLOCATIONS
--------------------------------------------------------- */

export const getAllAllocations = async (req, res) => {
  try {
    const db = await connectDB();
    const username = req.query.username;

    const employees = await db.collection("employee").find({}).toArray();
    const assignments = await db.collection("assignment").find({}).toArray();
    const allocations = await db.collection("allocation").find({}).toArray();
    const departments = await db.collection("department").find({}).toArray();

    const months = buildMonthRange();

    const deptMap = new Map();
    departments.forEach((d) => {
      if (d.dept_no) deptMap.set(d.dept_no, d.dept_name || d.dept_no);
    });

    const employeeById = new Map();
    employees.forEach((e) => employeeById.set(e.emp_id, e));

    const assignmentKey = (activity, category) => `${activity}||${category}`;
    const assignmentByKey = new Map();
    assignments.forEach((a) => {
      assignmentByKey.set(assignmentKey(a.project_name, a.category), a);
    });

    const rowsMap = new Map();

    for (const alloc of allocations) {
      const emp = employeeById.get(alloc.emp_id);
      if (!emp) continue;

      const assignment = assignmentByKey.get(
        assignmentKey(alloc.activity, alloc.category)
      );
      if (!assignment) continue;

      const rowKey = `${emp.emp_id}||${assignment._id}`;

      if (!rowsMap.has(rowKey)) {
        rowsMap.set(rowKey, {
          employee: emp,
          assignment,
          allocations: {}
        });
      }

      const row = rowsMap.get(rowKey);
      const dateStr = String(alloc.date);

      if (months.includes(dateStr)) {
        row.allocations[dateStr] = alloc.amount;
      }
    }

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

    let myAssignments = [];

    if (username) {
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

/* ---------------------------------------------------------
   GET ALLOCATION ROW BY EMPLOYEE ID
--------------------------------------------------------- */

// export const getAllocationById = async (req, res) => {
//   try {
//     const db = await connectDB();
//     const emp_id = parseInt(req.params.id, 10);

//     if (!emp_id || isNaN(emp_id)) {
//       return res.status(400).json({ error: "Invalid emp_id" });
//     }

//     const employee = await db.collection("employee").findOne({ emp_id });
//     if (!employee) {
//       return res.status(404).json({ error: "Employee not found" });
//     }

//     const allocations = await db
//       .collection("allocation")
//       .find({ emp_id })
//       .toArray();

//     let assignment = null;

//     if (allocations.length > 0) {
//       const projectName = allocations[0].activity;

//       assignment = await db.collection("assignment").findOne({
//         project_name: projectName
//       });

//       if (assignment) {
//         const dept =
//           assignment.department ||
//           assignment.requesting_dept ||
//           assignment.dept ||
//           "";

//         assignment.department = dept;
//         assignment.requesting_dept = dept;
//       }
//     }

//     const managerAccounts = await db
//       .collection("account")
//       .find({ "account.acc_type_id": 1 })
//       .toArray();

//     const managerIds = managerAccounts.map((a) => a.emp_id);

//     const managers = await db
//       .collection("employee")
//       .find({ emp_id: { $in: managerIds } })
//       .toArray();

//     return res.json({
//       row: {
//         employee,
//         allocations,
//         assignment
//       },
//       dropdowns: {
//         managers
//       }
//     });

//   } catch (err) {
//     console.error("GET ONE allocation error:", err);
//     return res.status(500).json({ error: "Server error" });
//   }
// };

export const getAllocationById = async (req, res) => {
  try {
    const db = await connectDB();
    const emp_id = parseInt(req.params.id, 10);
    const project = req.query.project;   // ⭐ NEW

    if (!emp_id || isNaN(emp_id)) {
      return res.status(400).json({ error: "Invalid emp_id" });
    }

    const employee = await db.collection("employee").findOne({ emp_id });
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // ⭐ If project is provided, load THAT assignment
    let assignment = null;

    if (project) {
      assignment = await db.collection("assignment").findOne({
        project_name: project
      });
    }

    // ⭐ If no project provided, fallback to newest allocation
    if (!assignment) {
      const allocations = await db
        .collection("allocation")
        .find({ emp_id })
        .sort({ date: -1 })
        .toArray();

      if (allocations.length > 0) {
        const latest = allocations[0];
        assignment = await db.collection("assignment").findOne({
          project_name: latest.activity,
          category: latest.category
        });
      }
    }

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
/* ---------------------------------------------------------
   GET DEPT FOR VP NAME
--------------------------------------------------------- */

export const getDeptForEmployee = async (req, res) => {
  try {
    const name = req.query.name;

    if (!name) {
      return res.status(400).json({ error: "Missing name" });
    }

    const db = await connectDB();

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

/* ---------------------------------------------------------
   GET PROJECTS (ALL OR ONE)
--------------------------------------------------------- */

export const getProjects = async (req, res) => {
  try {
    const project = req.query.project;
    const db = await connectDB();

    if (project) {
      const assignment = await db
        .collection("assignment")
        .findOne({ project_name: project });

      return res.json({ assignment });
    }

    const projects = await db
      .collection("assignment")
      .find({
        status: { $nin: ["Completed", "Cancelled"] }
      })
      .project({ project_name: 1, _id: 0 })
      .toArray();

    return res.json({ projects });

  } catch (error) {
    console.error("get-projects error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/* ---------------------------------------------------------
   GET EMPLOYEE + DEPARTMENT NAME (FIXED VERSION)
--------------------------------------------------------- */

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

/* ---------------------------------------------------------
   GET DATA MANAGEMENT EMPLOYEES
--------------------------------------------------------- */

export const getDMEmployees = async (req, res) => {
  try {
    const db = await connectDB();

    const employees = await db
      .collection("employee")
      .find({ dept_no: "D01" })
      .project({
        emp_id: 1,
        emp_name: 1,
        dept_no: 1,
        reports_to: 1,
        _id: 0
      })
      .toArray();

    return res.json({ employees });

  } catch (error) {
    console.error("get-dm-employees error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/* ---------------------------------------------------------
   EDIT ALLOCATION AMOUNT (PER-CELL)
--------------------------------------------------------- */

export const editAllocationAmount = async (req, res) => {
  try {
    const { emp_id, month, amount, activity, category } = req.body;

    const db = await connectDB();

    await db.collection("allocation").updateOne(
      {
        emp_id,
        activity,
        category,
        date: Number(month)
      },
      {
        $set: {
          amount: amount === null ? null : Number(amount),
          activity,
          category,
          date: Number(month)
        }
      },
      { upsert: true }
    );

    return res.json({ success: true });

  } catch (err) {
    console.error("editallocationamount error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* ---------------------------------------------------------
   DELETE SINGLE ALLOCATION ENTRY
--------------------------------------------------------- */

export const deleteAllocation = async (req, res) => {
  try {
    const { emp_id, month, activity, category } = req.body;

    const db = await connectDB();

    await db.collection("allocation").deleteOne({
      emp_id,
      activity,
      category,
      date: Number(month)
    });

    return res.json({ success: true });

  } catch (err) {
    console.error("delete allocation error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* ---------------------------------------------------------
   UPDATE ASSIGNMENT (EXISTING LOGIC)
--------------------------------------------------------- */

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
        department: requesting_dept,
        target_period,
        completion_date: completion_date || null,
        description,
        resource_notes: resource_consideration || "",
        updated_at: new Date()
      }
    };

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

/* ---------------------------------------------------------
   DROPDOWNS FOR ALLOCATION UI
--------------------------------------------------------- */

export const getAllocationDropdowns = async (req, res) => {
  try {
    const db = await connectDB();

    const employees = await db.collection("employee")
      .find({})
      .project({ emp_id: 1, emp_name: 1 })
      .sort({ emp_name: 1 })
      .toArray();

    const managers = await db.collection("employee")
      .aggregate([
        { $match: { manager_name: { $ne: null } } },
        { $group: { _id: "$manager_name" } },
        { $project: { name: "$_id", _id: 0 } },
        { $sort: { name: 1 } }
      ])
      .toArray();

    const projects = await db.collection("assignment")
      .aggregate([
        { $match: { project_name: { $ne: null } } },
        { $group: { _id: "$project_name" } },
        { $project: { name: "$_id", _id: 0 } },
        { $sort: { name: 1 } }
      ])
      .toArray();

    const categories = await db.collection("assignment")
      .aggregate([
        { $match: { category: { $ne: null } } },
        { $group: { _id: "$category" } },
        { $project: { name: "$_id", _id: 0 } },
        { $sort: { name: 1 } }
      ])
      .toArray();

    const leaders = await db.collection("assignment")
      .aggregate([
        { $match: { leader: { $ne: null } } },
        { $group: { _id: "$leader" } },
        { $project: { name: "$_id", _id: 0 } },
        { $sort: { name: 1 } }
      ])
      .toArray();

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

/* ---------------------------------------------------------
   CREATE NEW ALLOCATION ENTRY (RULE A + CURRENT MONTH = 1)
--------------------------------------------------------- */

export const createAllocation = async (req, res) => {
  try {
    const { emp_id, project } = req.body;

    if (!emp_id || !project) {
      return res.status(400).json({
        error: "Missing emp_id or project"
      });
    }

    const db = await connectDB();

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

    // Delete future allocations for this employee/activity/category
    await deleteFutureAllocations(db, Number(emp_id), activity, category);

    // Ensure current month allocation = 1
    await createCurrentMonthAllocation(db, Number(emp_id), activity, category);

    return res.json({
      success: true
    });

  } catch (error) {
    console.error("Add allocation error:", error);
    return res.status(500).json({
      error: "Server error while adding allocation"
    });
  }
};

/* ---------------------------------------------------------
   REASSIGN ALLOCATION (MOVE EMPLOYEE TO NEW PROJECT)
--------------------------------------------------------- */

// export const reassignAllocation = async (req, res) => {
//   try {
//     const {
//       old_emp_id,
//       new_emp_id,
//       old_project,
//       new_project,
//       category
//     } = req.body;

//     if (!old_emp_id || !new_emp_id || !old_project || !new_project) {
//       return res.status(400).json({ error: "Missing required fields" });
//     }

//     const db = await connectDB();

//     // Find assignment for new project
//     const newAssignment = await db.collection("assignment").findOne({
//       project_name: new_project
//     });

//     if (!newAssignment) {
//       return res.status(404).json({ error: "New project not found" });
//     }

//     const activity = newAssignment.project_name;
//     const newCategory = newAssignment.category;

//     // Delete future allocations for old employee/project/category
//     await deleteFutureAllocations(db, Number(old_emp_id), old_project, category);

//     // Create current month allocation for new employee/project/category
//     await createCurrentMonthAllocation(
//       db,
//       Number(new_emp_id),
//       activity,
//       newCategory
//     );

//     return res.json({ success: true });

//   } catch (error) {
//     console.error("Reassign allocation error:", error);
//     return res.status(500).json({ error: "Server error while reassigning" });
//   }
// };

/* ---------------------------------------------------------
   REASSIGN ALLOCATION (DELETE CURRENT + FUTURE ONLY)
--------------------------------------------------------- */

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

    if (!old_emp_id || !new_emp_id || !old_project || !new_project) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const db = await connectDB();

    /* ---------------------------------------------------------
       1. DELETE ALL allocations for the old employee/project/category
    --------------------------------------------------------- */
    await db.collection("allocation").deleteMany({
      emp_id: Number(old_emp_id),
      activity: old_project,
      category: old_category
    });

    /* ---------------------------------------------------------
       2. CREATE NEW ALLOCATION = 1 FOR NEW EMPLOYEE/PROJECT/CATEGORY
    --------------------------------------------------------- */
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
          amount: 1,
          activity: new_project,
          category: new_category,
          date: currentMonth
        }
      },
      { upsert: true }
    );

    return res.json({ success: true });

  } catch (error) {
    console.error("Reassign allocation error:", error);
    return res.status(500).json({ error: "Server error while reassigning" });
  }
};