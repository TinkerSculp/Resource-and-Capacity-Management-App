// controllers/resourceController.js
import { connectDB } from "../config/db.js";

// -------------------------------------------------------------
// GET ALL EMPLOYEES
// -------------------------------------------------------------
export const getAllEmployees = async (req, res) => {
  try {
    const db = await connectDB();
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

// -------------------------------------------------------------
// GET EMPLOYEE BY ID
// -------------------------------------------------------------
export const getEmployeeById = async (req, res) => {
  try {
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

// -------------------------------------------------------------
// CREATE EMPLOYEE
// -------------------------------------------------------------
export const createEmployee = async (req, res) => {
  try {
    const db = await connectDB();

    const newEmployee = {
      emp_id: Number(req.body.emp_id),
      emp_name: req.body.emp_name,
      emp_title: req.body.emp_title,
      dept_no: req.body.dept_no,
      manager_level: req.body.manager_level ? Number(req.body.manager_level) : null,
      director_level: req.body.director_level ? Number(req.body.director_level) : null,
      reports_to: req.body.reports_to ? Number(req.body.reports_to) : null,
      requestor_vp: req.body.requestor_vp ? Number(req.body.requestor_vp) : null,
      other_info: req.body.other_info ?? "",
      current_status: req.body.current_status ?? "Active"
    };

    await db.collection("employee").insertOne(newEmployee);

    return res.json({ message: "Employee created successfully" });
  } catch (err) {
    console.error("createEmployee error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// -------------------------------------------------------------
// UPDATE EMPLOYEE
// -------------------------------------------------------------
export const updateEmployee = async (req, res) => {
  try {
    const emp_id = Number(req.params.emp_id);
    const db = await connectDB();

    const updateDoc = {
      $set: {
        emp_id: req.body.emp_id ? Number(req.body.emp_id) : emp_id,
        emp_name: req.body.emp_name,
        emp_title: req.body.emp_title,
        dept_no: req.body.dept_no,
        manager_level: req.body.manager_level ? Number(req.body.manager_level) : null,
        director_level: req.body.director_level ? Number(req.body.director_level) : null,
        reports_to: req.body.reports_to ? Number(req.body.reports_to) : null,
        requestor_vp: req.body.requestor_vp ? Number(req.body.requestor_vp) : null,
        other_info: req.body.other_info ?? "",
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
// -------------------------------------------------------------
// UPDATE EMPLOYEE STATUS
// -------------------------------------------------------------
export const updateEmployeeStatus = async (req, res) => {
  try {
    const emp_id = Number(req.params.emp_id);
    const db = await connectDB();

    const status = req.body.status;

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

// -------------------------------------------------------------
// GET EMPLOYEE CAPACITY
// -------------------------------------------------------------
export const getEmployeeCapacity = async (req, res) => {
  try {
    const emp_id = Number(req.params.emp_id);
    const db = await connectDB();

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

// -------------------------------------------------------------
// UPDATE EMPLOYEE CAPACITY (ONLY emp_id, date, amount)
// -------------------------------------------------------------
// -------------------------------------------------------------
// UPDATE EMPLOYEE CAPACITY (DELETE WHEN AMOUNT IS NULL)
// -------------------------------------------------------------
export const updateEmployeeCapacity = async (req, res) => {
  try {
    const emp_id = Number(req.params.emp_id);
    const db = await connectDB();

    const updates = req.body.capacityEntries;

    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: "capacityEntries must be an array" });
    }

    for (const entry of updates) {
      const { date, amount } = entry;

      // Validate date
      if (typeof date !== "number") continue;

      // DELETE if amount is null or empty
      if (amount === null || amount === "" || amount === undefined) {
        await db.collection("capacity").deleteOne({ emp_id, date });
        continue;
      }

      // UPDATE/UPSERT if amount is valid
      if (typeof amount === "number") {
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

// -------------------------------------------------------------
// GET ALL DEPARTMENTS
// -------------------------------------------------------------
export const getAllDepartments = async (req, res) => {
  try {
    const db = await connectDB();
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

// -------------------------------------------------------------
// GET ALL MANAGERS (acc_type_id = 1)
// -------------------------------------------------------------
export const getAllManagers = async (req, res) => {
  try {
    const db = await connectDB();

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
        { $match: { "account.account.acc_type_id": 1 } },
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