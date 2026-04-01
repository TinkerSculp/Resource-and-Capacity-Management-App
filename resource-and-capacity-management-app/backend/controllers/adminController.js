/* =============================================================================
   adminController.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Handles all Admin Dashboard operations — creating, reading, and editing
     user accounts, and migrating legacy plaintext passwords to bcrypt hashes.
     Every handler verifies the requesting user is an Admin (acc_type_id = 4)
     before performing any operation.

   ACCOUNT TYPES:
     1 = Resource Manager — gets a full employee doc (reports_to, manager hierarchy)
     2 = Stakeholder      — gets a minimal employee doc (requestor_vp only)
     3 = Team Member      — gets the same full employee doc as type 1
     4 = Admin            — account only, no employee doc created

   SECURITY MODEL:
     • Every handler calls checkAdmin() first — returns 401/403 immediately if
       the requesting user is not authenticated or not an Admin.
     • All string inputs are sanitised via sanitizeString() which strips
       dangerous characters before any value reaches the database.
     • Passwords are hashed with bcrypt (10 salt rounds) — plaintext passwords
       are never stored.
     • Uniqueness is checked for emp_id, account_id, and username before any
       insert — returns descriptive 409 errors rather than letting MongoDB
       throw a duplicate key error.
     • If an account is created successfully but the employee doc insert fails
       validation, the account is rolled back (deleted) to prevent orphaned
       account records with no corresponding employee.

   DEPENDENCIES:
     • ../config/db.js — MongoDB connection singleton
     • bcrypt          — Password hashing
   ============================================================================= */

import { connectDB } from "../config/db.js";
import bcrypt from "bcrypt";

/* -----------------------------------------------------------------------------
   SALT ROUNDS
   10 is the bcrypt industry standard — high enough to be secure, low enough
   not to noticeably slow down login or account creation.
----------------------------------------------------------------------------- */
const SALT_ROUNDS = 10;

/* =============================================================================
   HELPER: checkAdmin
   -----------------------------------------------------------------------------
   Verifies that the authenticated user (from JWT, attached to req.user by the
   protect middleware) exists and holds an Admin account (acc_type_id = 4).
   Sends the appropriate error response and returns false if not — callers
   simply return early when this returns false.

   PARAM:  req {Request}   — Express request (req.user.emp_id from JWT)
   PARAM:  res {Response}  — Express response (used to send 401/403 if needed)
   PARAM:  db  {Db}        — Active MongoDB database instance
   RETURNS: {boolean}      — true if admin, false if not (response already sent)
   ============================================================================= */
async function checkAdmin(req, res, db) {
  const empId = req.user?.emp_id;

  // No emp_id on the JWT means the token is malformed or the middleware failed
  if (!empId) {
    res.status(401).json({ error: "Unauthorised" });
    return false;
  }

  const accountDoc = await db.collection("account").findOne({ emp_id: empId });

  // Must exist and must be type 4 (Admin) — anything else is forbidden
  if (!accountDoc || accountDoc.account?.acc_type_id !== 4) {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }

  return true;
}

/* =============================================================================
   HELPER: sanitizeString
   -----------------------------------------------------------------------------
   Strips leading/trailing whitespace and removes characters that could be
   used for injection attacks (<, >, ", ', `, ;). Applied to all string inputs
   before they are written to the database.

   Returns an empty string for non-string inputs rather than throwing, so
   callers can handle missing fields with their own validation logic.

   PARAM:   val {any}    — The value to sanitise.
   RETURNS: {string}     — Cleaned string, or "" if input is not a string.
   ============================================================================= */
function sanitizeString(val) {
  if (typeof val !== "string") return "";
  return val.trim().replace(/[<>"'`;]/g, "");
}

/* =============================================================================
   HANDLER: getDropdowns
   GET /api/admin/dropdowns
   -----------------------------------------------------------------------------
   Returns all data needed to populate the Admin Dashboard create/edit form
   dropdowns: departments, account types, and employees enriched with their
   current acc_type_id so the frontend can filter the employee list by role.

   The account type join is done server-side to avoid multiple round trips
   from the frontend — accounts and employees are fetched in parallel then
   merged into a single enrichedEmployees array.
   ============================================================================= */
export const getDropdowns = async (req, res) => {
  try {
    const db = await connectDB();
    if (!(await checkAdmin(req, res, db))) return;

    // Fetch departments and account types in parallel — neither depends on the other
    const [departments, accountTypes] = await Promise.all([
      db.collection("department").find({}, { projection: { _id: 0 } }).toArray(),
      db.collection("account_type").find({}, { projection: { _id: 0 } }).toArray(),
    ]);

    // Fetch accounts and employees in parallel, then join them below
    const [accounts, employees] = await Promise.all([
      db.collection("account").find({}, {
        projection: { _id: 0, emp_id: 1, "account.acc_type_id": 1 }
      }).toArray(),
      db.collection("employee").find({}, {
        projection: { _id: 0, emp_id: 1, emp_name: 1, emp_title: 1 }
      }).toArray(),
    ]);

    // Build a emp_id → acc_type_id lookup map for O(1) joins below
    const accTypeMap = {};
    accounts.forEach(a => { accTypeMap[a.emp_id] = a.account?.acc_type_id; });

    // Attach acc_type_id to each employee — null if no account exists for that emp_id
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
   GET /api/admin/next-emp-id
   -----------------------------------------------------------------------------
   Returns the next available emp_id by finding the highest existing emp_id
   across both the account and employee collections and adding 1.

   Checks both collections because an Admin account (type 4) has no employee
   doc — so the highest emp_id may live in accounts only.
   ============================================================================= */
export const getNextEmpId = async (req, res) => {
  try {
    const db = await connectDB();
    if (!(await checkAdmin(req, res, db))) return;

    // Find the highest emp_id in each collection simultaneously
    const [topAccount, topEmployee] = await Promise.all([
      db.collection("account").find({}, { projection: { emp_id: 1 } })
        .sort({ emp_id: -1 }).limit(1).toArray(),
      db.collection("employee").find({}, { projection: { emp_id: 1 } })
        .sort({ emp_id: -1 }).limit(1).toArray(),
    ]);

    // Take the higher of the two maximums and add 1 — safe even if collections are empty
    const nextEmpId = Math.max(
      topAccount[0]?.emp_id  || 0,
      topEmployee[0]?.emp_id || 0
    ) + 1;

    return res.json({ nextEmpId });
  } catch (err) {
    console.error("Next emp_id error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* =============================================================================
   HELPER: buildEmployeeDoc
   -----------------------------------------------------------------------------
   Constructs the employee document to insert for account types 1, 2, and 3.
   The document shape varies by type:
     • Type 2 (Stakeholder) — minimal: base fields + requestor_vp only
     • Types 1 & 3          — full: base fields + full manager hierarchy
     • Type 4 (Admin)       — returns null, no employee doc is created

   All numeric ID fields (reports_to, manager_level, etc.) are parsed as
   integers — the frontend may send them as strings in form payloads.

   PARAM:   accTypeId {number} — The account type (1–4)
   PARAM:   empId     {number} — The employee ID for this record
   PARAM:   body      {object} — The raw request body
   RETURNS: {object|null}      — The employee document, or null for type 4
   ============================================================================= */
function buildEmployeeDoc(accTypeId, empId, body) {
  // Sanitise all string fields before building the document
  const empName       = sanitizeString(body.emp_name);
  const empTitle      = sanitizeString(body.emp_title);
  const deptNo        = sanitizeString(body.dept_no);
  const otherInfo     = sanitizeString(body.other_info || "");
  const currentStatus = sanitizeString(body.current_status) || "Active";

  // Parse numeric foreign keys — null if empty/missing
  const requestorVp   = body.requestor_vp   ? parseInt(body.requestor_vp,   10) : null;
  const reportsTo     = body.reports_to     ? parseInt(body.reports_to,     10) : null;
  const managerLevel  = body.manager_level  ? parseInt(body.manager_level,  10) : null;
  const directorLevel = body.director_level ? parseInt(body.director_level, 10) : null;

  // Fields shared by all employee-linked account types
  const base = { emp_id: empId, emp_name: empName, emp_title: empTitle, dept_no: deptNo };

  if (accTypeId === 2) {
    // Stakeholder — only needs requestor_vp for the initiative requestor lookup
    return { ...base, requestor_vp: requestorVp };
  }

  if (accTypeId === 1 || accTypeId === 3) {
    // Resource Manager and Team Member — full hierarchy needed for assignments and reports
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

  // Type 4 (Admin) — no employee doc
  return null;
}

/* =============================================================================
   HANDLER: createAccount
   POST /api/admin/accounts
   -----------------------------------------------------------------------------
   Creates a new user account and, for types 1–3, a corresponding employee
   record. Enforces uniqueness on emp_id, account_id, and username before
   writing anything to the database.

   ROLLBACK STRATEGY:
     If the account is inserted successfully but the employee doc fails
     validation (missing required fields), the account is deleted before
     returning the error — preventing orphaned account records.
   ============================================================================= */
export const createAccount = async (req, res) => {
  try {
    const db = await connectDB();
    if (!(await checkAdmin(req, res, db))) return;

    const body = req.body;

    // Parse and sanitise all incoming fields
    const accTypeId   = parseInt(body.acc_type_id, 10);
    const empId       = parseInt(body.emp_id,       10);
    const accountId   = sanitizeString(body.account_id);
    const username    = sanitizeString(body.username);
    const rawPassword = sanitizeString(body.password);

    // Validate required fields before touching the database
    if (![1, 2, 3, 4].includes(accTypeId))
      return res.status(400).json({ error: "Invalid account type." });
    if (!empId || isNaN(empId))
      return res.status(400).json({ error: "emp_id is required and must be a number." });
    if (!accountId)   return res.status(400).json({ error: "account_id is required." });
    if (!username)    return res.status(400).json({ error: "username is required." });
    if (!rawPassword) return res.status(400).json({ error: "password is required." });

    // Hash the password before any uniqueness checks — keeps the happy path clean
    const password = await bcrypt.hash(rawPassword, SALT_ROUNDS);

    // Check all three uniqueness constraints in parallel — faster than sequential checks
    const [existingEmpId, existingAccountId, existingUsername] = await Promise.all([
      db.collection("account").findOne({ emp_id: empId }),
      db.collection("account").findOne({ "account.account_id": accountId }),
      db.collection("account").findOne({ "account.username": username }),
    ]);

    // Return descriptive conflict errors so the admin knows exactly what to change
    if (existingEmpId)     return res.status(409).json({ error: `emp_id ${empId} is already in use.` });
    if (existingAccountId) return res.status(409).json({ error: `account_id "${accountId}" is already in use.` });
    if (existingUsername)  return res.status(409).json({ error: `Username "${username}" is already taken.` });

    // Insert the account document
    await db.collection("account").insertOne({
      emp_id: empId,
      account: { acc_type_id: accTypeId, account_id: accountId, password, username },
    });

    // Types 1, 2, 3 — also create an employee document
    if ([1, 2, 3].includes(accTypeId)) {
      const empName  = sanitizeString(body.emp_name);
      const empTitle = sanitizeString(body.emp_title);
      const deptNo   = sanitizeString(body.dept_no);

      // Validate employee fields — roll back the account insert if any are missing
      if (!empName) {
        await db.collection("account").deleteOne({ emp_id: empId });
        return res.status(400).json({ error: "emp_name is required." });
      }
      if (!empTitle) {
        await db.collection("account").deleteOne({ emp_id: empId });
        return res.status(400).json({ error: "emp_title is required." });
      }
      if (!deptNo) {
        await db.collection("account").deleteOne({ emp_id: empId });
        return res.status(400).json({ error: "dept_no is required." });
      }

      // Check the employee collection separately — emp_id could exist there without an account
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
   -----------------------------------------------------------------------------
   Updates an existing account and, for types 1–3, the corresponding employee
   record. Only fields present in the request body are updated — missing fields
   are left unchanged (partial update / PATCH-style behaviour).

   The employee patch uses upsert: true so that existing Resource Managers
   who were created before the employee collection existed still get a
   document created if one is missing.
   ============================================================================= */
export const editAccount = async (req, res) => {
  try {
    const db = await connectDB();
    if (!(await checkAdmin(req, res, db))) return;

    const empId = parseInt(req.params.empId, 10);
    if (!empId || isNaN(empId))
      return res.status(400).json({ error: "Invalid emp_id in URL." });

    const body = req.body;

    // Confirm the account exists before attempting any update
    const existingAccount = await db.collection("account").findOne({ emp_id: empId });
    if (!existingAccount)
      return res.status(404).json({ error: `No account found for emp_id ${empId}.` });

    const accTypeId = existingAccount.account?.acc_type_id;

    /* -------------------------------------------------------------------------
       ACCOUNT PATCH
       Build the update object dynamically — only include fields that were
       sent in the request body. This prevents accidentally overwriting fields
       the admin didn't intend to change.
    --------------------------------------------------------------------------- */
    const accountPatch = {};

    if (body.username !== undefined) {
      const username = sanitizeString(body.username);
      // Check uniqueness — exclude the current account from the conflict check
      const conflict = await db.collection("account").findOne({
        "account.username": username, emp_id: { $ne: empId }
      });
      if (conflict) return res.status(409).json({ error: `Username "${username}" is already taken.` });
      accountPatch["account.username"] = username;
    }

    if (body.account_id !== undefined) {
      const accountId = sanitizeString(body.account_id);
      const conflict = await db.collection("account").findOne({
        "account.account_id": accountId, emp_id: { $ne: empId }
      });
      if (conflict) return res.status(409).json({ error: `account_id "${accountId}" is already in use.` });
      accountPatch["account.account_id"] = accountId;
    }

    if (body.password !== undefined && sanitizeString(body.password).length > 0) {
      // Only hash and update if a non-empty password was provided
      accountPatch["account.password"] = await bcrypt.hash(sanitizeString(body.password), SALT_ROUNDS);
    }

    if (body.acc_type_id !== undefined)
      accountPatch["account.acc_type_id"] = parseInt(body.acc_type_id, 10);

    if (Object.keys(accountPatch).length > 0) {
      await db.collection("account").updateOne({ emp_id: empId }, { $set: accountPatch });
    }

    /* -------------------------------------------------------------------------
       EMPLOYEE PATCH — types 1, 2, 3 only
       Type 2 (Stakeholder) only supports base fields + requestor_vp.
       Types 1 and 3 support the full hierarchy.
       upsert: true creates the doc if it doesn't exist — handles legacy accounts.
    --------------------------------------------------------------------------- */
    if ([1, 2, 3].includes(accTypeId)) {
      const empPatch = {};

      // Base fields shared by all employee-linked types
      if (body.emp_name  !== undefined) empPatch.emp_name  = sanitizeString(body.emp_name);
      if (body.emp_title !== undefined) empPatch.emp_title = sanitizeString(body.emp_title);
      if (body.dept_no   !== undefined) empPatch.dept_no   = sanitizeString(body.dept_no);

      // Requestor VP — all three types
      if (body.requestor_vp !== undefined)
        empPatch.requestor_vp = body.requestor_vp ? parseInt(body.requestor_vp, 10) : null;

      // Full hierarchy — types 1 and 3 only
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
          { upsert: true } // Create a new employee doc if one doesn't exist for this account
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
   -----------------------------------------------------------------------------
   Returns all accounts enriched with their employee data and human-readable
   role name. Strips the password field — it is never sent to the client.

   The join between accounts, employees, and account_types is done server-side
   using in-memory lookup maps for efficiency — avoids N+1 queries.
   ============================================================================= */
export const getAccounts = async (req, res) => {
  try {
    const db = await connectDB();
    if (!(await checkAdmin(req, res, db))) return;

    // Fetch all three collections in parallel
    const [accounts, accountTypes, employees] = await Promise.all([
      db.collection("account").find({}).toArray(),
      db.collection("account_type").find({}, { projection: { _id: 0 } }).toArray(),
      db.collection("employee").find({}, { projection: { _id: 0 } }).toArray(),
    ]);

    // Build lookup maps for O(1) joins — avoids nested loops over large arrays
    const typeMap = {};
    accountTypes.forEach((t) => { typeMap[t.acc_type_id] = t.acc_type; });

    const empMap = {};
    employees.forEach((e) => { empMap[e.emp_id] = e; });

    // Merge account + employee data into a single safe response object per account
    // Password is deliberately excluded — never sent to the frontend
    const safe = accounts.map((doc) => {
      const accTypeId = doc.account?.acc_type_id;
      const emp       = empMap[doc.emp_id] || {}; // Empty object if no employee doc exists

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
   -----------------------------------------------------------------------------
   One-time utility to hash any plaintext passwords left in the database from
   before bcrypt was implemented. Skips passwords that are already hashed
   (bcrypt hashes always start with "$2b$").

   Safe to run multiple times — already-hashed passwords are skipped, not
   double-hashed. Should be removed or disabled once all passwords are migrated.
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

      // Skip if already a bcrypt hash — "$2b$" is the bcrypt version 2b prefix
      if (!password || password.startsWith("$2b$")) {
        skipped++;
        continue;
      }

      // Hash the plaintext password and update the record
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