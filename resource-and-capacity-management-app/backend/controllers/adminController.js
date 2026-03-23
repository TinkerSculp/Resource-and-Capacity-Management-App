/* =============================================================================
   adminController.js
   ============================================================================= */

import { connectDB } from "../config/db.js";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

async function checkAdmin(req, res, db) {
  const empId = req.user?.emp_id;
  if (!empId) { res.status(401).json({ error: "Unauthorised" }); return false; }
  const accountDoc = await db.collection("account").findOne({ emp_id: empId });
  if (!accountDoc || accountDoc.account?.acc_type_id !== 4) {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
}

function sanitizeString(val) {
  if (typeof val !== "string") return "";
  return val.trim().replace(/[<>"'`;]/g, "");
}

/* =============================================================================
   HANDLER: getDropdowns
   GET /api/admin/dropdowns
   — Returns employees WITH acc_type_id so the frontend can filter by role
   ============================================================================= */
export const getDropdowns = async (req, res) => {
  try {
    const db = await connectDB();
    if (!(await checkAdmin(req, res, db))) return;

    const [departments, accountTypes] = await Promise.all([
      db.collection("department").find({}, { projection: { _id: 0 } }).toArray(),
      db.collection("account_type").find({}, { projection: { _id: 0 } }).toArray(),
    ]);

    // Join accounts + employees so we can return acc_type_id alongside emp details
    const [accounts, employees] = await Promise.all([
      db.collection("account").find({}, { projection: { _id: 0, emp_id: 1, "account.acc_type_id": 1 } }).toArray(),
      db.collection("employee").find({}, { projection: { _id: 0, emp_id: 1, emp_name: 1, emp_title: 1 } }).toArray(),
    ]);

    const accTypeMap = {};
    accounts.forEach(a => { accTypeMap[a.emp_id] = a.account?.acc_type_id; });

    const enrichedEmployees = employees.map(e => ({
      ...e,
      acc_type_id: accTypeMap[e.emp_id] ?? null,
    }));

    return res.json({ departments, employees: enrichedEmployees, accountTypes });
  } catch (err) {
    console.error("Admin dropdowns error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* =============================================================================
   HANDLER: getNextEmpId
   ============================================================================= */
export const getNextEmpId = async (req, res) => {
  try {
    const db = await connectDB();
    if (!(await checkAdmin(req, res, db))) return;

    const [topAccount, topEmployee] = await Promise.all([
      db.collection("account").find({}, { projection: { emp_id: 1 } }).sort({ emp_id: -1 }).limit(1).toArray(),
      db.collection("employee").find({}, { projection: { emp_id: 1 } }).sort({ emp_id: -1 }).limit(1).toArray(),
    ]);

    const nextEmpId = Math.max(topAccount[0]?.emp_id || 0, topEmployee[0]?.emp_id || 0) + 1;
    return res.json({ nextEmpId });
  } catch (err) {
    console.error("Next emp_id error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* =============================================================================
   HELPER: buildEmployeeDoc
   Shared logic for types 1, 2, 3 — builds the employee document to insert
   ============================================================================= */
function buildEmployeeDoc(accTypeId, empId, body) {
  const empName       = sanitizeString(body.emp_name);
  const empTitle      = sanitizeString(body.emp_title);
  const deptNo        = sanitizeString(body.dept_no);
  const requestorVp   = body.requestor_vp   ? parseInt(body.requestor_vp, 10)   : null;
  const reportsTo     = body.reports_to     ? parseInt(body.reports_to, 10)     : null;
  const managerLevel  = body.manager_level  ? parseInt(body.manager_level, 10)  : null;
  const directorLevel = body.director_level ? parseInt(body.director_level, 10) : null;
  const otherInfo     = sanitizeString(body.other_info || "");
  const currentStatus = sanitizeString(body.current_status) || "Active";

  const base = { emp_id: empId, emp_name: empName, emp_title: empTitle, dept_no: deptNo };

  if (accTypeId === 2) {
    return { ...base, requestor_vp: requestorVp };
  }

  if (accTypeId === 1 || accTypeId === 3) {
    return {
      ...base,
      reports_to:     reportsTo,
      manager_level:  managerLevel,
      director_level: directorLevel,
      requestor_vp:   requestorVp,
      other_info:     otherInfo,
      current_status: currentStatus,
    };
  }

  return null; // acc_type_id 4 (Admin) — no employee doc
}

/* =============================================================================
   HANDLER: createAccount
   POST /api/admin/accounts
   ============================================================================= */
export const createAccount = async (req, res) => {
  try {
    const db = await connectDB();
    if (!(await checkAdmin(req, res, db))) return;

    const body = req.body;

    const accTypeId   = parseInt(body.acc_type_id, 10);
    const empId       = parseInt(body.emp_id, 10);
    const accountId   = sanitizeString(body.account_id);
    const username    = sanitizeString(body.username);
    const rawPassword = sanitizeString(body.password);

    if (![1, 2, 3, 4].includes(accTypeId))
      return res.status(400).json({ error: "Invalid account type." });
    if (!empId || isNaN(empId))
      return res.status(400).json({ error: "emp_id is required and must be a number." });
    if (!accountId)   return res.status(400).json({ error: "account_id is required." });
    if (!username)    return res.status(400).json({ error: "username is required." });
    if (!rawPassword) return res.status(400).json({ error: "password is required." });

    const password = await bcrypt.hash(rawPassword, SALT_ROUNDS);

    const [existingEmpId, existingAccountId, existingUsername] = await Promise.all([
      db.collection("account").findOne({ emp_id: empId }),
      db.collection("account").findOne({ "account.account_id": accountId }),
      db.collection("account").findOne({ "account.username": username }),
    ]);
    if (existingEmpId)     return res.status(409).json({ error: `emp_id ${empId} is already in use.` });
    if (existingAccountId) return res.status(409).json({ error: `account_id "${accountId}" is already in use.` });
    if (existingUsername)  return res.status(409).json({ error: `Username "${username}" is already taken.` });

    await db.collection("account").insertOne({
      emp_id: empId,
      account: { acc_type_id: accTypeId, account_id: accountId, password, username },
    });

    // Types 1, 2, 3 all get an employee doc
    if ([1, 2, 3].includes(accTypeId)) {
      const empName  = sanitizeString(body.emp_name);
      const empTitle = sanitizeString(body.emp_title);
      const deptNo   = sanitizeString(body.dept_no);

      if (!empName)  { await db.collection("account").deleteOne({ emp_id: empId }); return res.status(400).json({ error: "emp_name is required." }); }
      if (!empTitle) { await db.collection("account").deleteOne({ emp_id: empId }); return res.status(400).json({ error: "emp_title is required." }); }
      if (!deptNo)   { await db.collection("account").deleteOne({ emp_id: empId }); return res.status(400).json({ error: "dept_no is required." }); }

      const existingEmployee = await db.collection("employee").findOne({ emp_id: empId });
      if (existingEmployee) {
        await db.collection("account").deleteOne({ emp_id: empId });
        return res.status(409).json({ error: `emp_id ${empId} already exists in employee records.` });
      }

      const empDoc = buildEmployeeDoc(accTypeId, empId, body);
      if (empDoc) await db.collection("employee").insertOne(empDoc);
    }

    return res.status(201).json({
      message: [1, 2, 3].includes(accTypeId)
        ? "Account and employee record created successfully."
        : "Account created successfully.",
    });
  } catch (err) {
    console.error("Create account error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* =============================================================================
   HANDLER: editAccount
   PUT /api/admin/accounts/:empId
   ============================================================================= */
export const editAccount = async (req, res) => {
  try {
    const db = await connectDB();
    if (!(await checkAdmin(req, res, db))) return;

    const empId = parseInt(req.params.empId, 10);
    if (!empId || isNaN(empId))
      return res.status(400).json({ error: "Invalid emp_id in URL." });

    const body = req.body;

    const existingAccount = await db.collection("account").findOne({ emp_id: empId });
    if (!existingAccount)
      return res.status(404).json({ error: `No account found for emp_id ${empId}.` });

    const accTypeId = existingAccount.account?.acc_type_id;

    /* ---- Account patch ---- */
    const accountPatch = {};

    if (body.username !== undefined) {
      const username = sanitizeString(body.username);
      const conflict = await db.collection("account").findOne({ "account.username": username, emp_id: { $ne: empId } });
      if (conflict) return res.status(409).json({ error: `Username "${username}" is already taken.` });
      accountPatch["account.username"] = username;
    }

    if (body.account_id !== undefined) {
      const accountId = sanitizeString(body.account_id);
      const conflict = await db.collection("account").findOne({ "account.account_id": accountId, emp_id: { $ne: empId } });
      if (conflict) return res.status(409).json({ error: `account_id "${accountId}" is already in use.` });
      accountPatch["account.account_id"] = accountId;
    }

    if (body.password !== undefined && sanitizeString(body.password).length > 0) {
      accountPatch["account.password"] = await bcrypt.hash(sanitizeString(body.password), SALT_ROUNDS);
    }

    if (body.acc_type_id !== undefined)
      accountPatch["account.acc_type_id"] = parseInt(body.acc_type_id, 10);

    if (Object.keys(accountPatch).length > 0) {
      await db.collection("account").updateOne({ emp_id: empId }, { $set: accountPatch });
    }

    /* ---- Employee patch — types 1, 2, 3 ---- */
    if ([1, 2, 3].includes(accTypeId)) {
      const empPatch = {};

      if (body.emp_name  !== undefined) empPatch.emp_name  = sanitizeString(body.emp_name);
      if (body.emp_title !== undefined) empPatch.emp_title = sanitizeString(body.emp_title);
      if (body.dept_no   !== undefined) empPatch.dept_no   = sanitizeString(body.dept_no);

      // Requestor VP for all three types
      if (body.requestor_vp !== undefined)
        empPatch.requestor_vp = body.requestor_vp ? parseInt(body.requestor_vp, 10) : null;

      // Reports To, Manager Level, Director Level for types 1 and 3
      if (accTypeId === 1 || accTypeId === 3) {
        if (body.reports_to     !== undefined) empPatch.reports_to     = body.reports_to     ? parseInt(body.reports_to, 10)     : null;
        if (body.manager_level  !== undefined) empPatch.manager_level  = body.manager_level  ? parseInt(body.manager_level, 10)  : null;
        if (body.director_level !== undefined) empPatch.director_level = body.director_level ? parseInt(body.director_level, 10) : null;
        if (body.other_info     !== undefined) empPatch.other_info     = sanitizeString(body.other_info);
        if (body.current_status !== undefined) empPatch.current_status = sanitizeString(body.current_status);
      }

      if (Object.keys(empPatch).length > 0) {
        await db.collection("employee").updateOne(
          { emp_id: empId },
          { $set: empPatch },
          { upsert: true } // upsert so existing Resource Managers without an employee doc get one created
        );
      }
    }

    return res.json({ message: "Account updated successfully." });
  } catch (err) {
    console.error("Edit account error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* =============================================================================
   HANDLER: getAccounts
   GET /api/admin/accounts
   ============================================================================= */
export const getAccounts = async (req, res) => {
  try {
    const db = await connectDB();
    if (!(await checkAdmin(req, res, db))) return;

    const [accounts, accountTypes, employees] = await Promise.all([
      db.collection("account").find({}).toArray(),
      db.collection("account_type").find({}, { projection: { _id: 0 } }).toArray(),
      db.collection("employee").find({}, { projection: { _id: 0 } }).toArray(),
    ]);

    const typeMap = {};
    accountTypes.forEach((t) => { typeMap[t.acc_type_id] = t.acc_type; });

    const empMap = {};
    employees.forEach((e) => { empMap[e.emp_id] = e; });

    const safe = accounts.map((doc) => {
      const accTypeId = doc.account?.acc_type_id;
      const emp       = empMap[doc.emp_id] || {};
      return {
        emp_id:         doc.emp_id,
        username:       doc.account?.username    || "",
        account_id:     doc.account?.account_id  || "",
        acc_type_id:    accTypeId,
        role:           typeMap[accTypeId]        || "Unknown",
        emp_name:       emp.emp_name       || "",
        emp_title:      emp.emp_title      || "",
        dept_no:        emp.dept_no        || "",
        requestor_vp:   emp.requestor_vp   ?? null,
        reports_to:     emp.reports_to     ?? null,
        manager_level:  emp.manager_level  ?? null,
        director_level: emp.director_level ?? null,
        other_info:     emp.other_info     || "",
        current_status: emp.current_status || "",
      };
    });

    return res.json(safe);
  } catch (err) {
    console.error("Get accounts error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* =============================================================================
   HANDLER: migratePasswords
   POST /api/admin/migrate-passwords
   ============================================================================= */
export const migratePasswords = async (req, res) => {
  try {
    const db = await connectDB();
    if (!(await checkAdmin(req, res, db))) return;

    const accounts = await db.collection("account").find({}).toArray();

    let updated = 0;
    let skipped = 0;

    for (const account of accounts) {
      const password = account.account?.password;
      if (!password || password.startsWith("$2b$")) { skipped++; continue; }
      const hashed = await bcrypt.hash(password, SALT_ROUNDS);
      await db.collection("account").updateOne(
        { _id: account._id },
        { $set: { "account.password": hashed } }
      );
      updated++;
    }

    return res.json({
      message: `Migration complete. Updated: ${updated}, Skipped (already hashed): ${skipped}.`,
      updated,
      skipped,
    });
  } catch (err) {
    console.error("Migrate passwords error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
