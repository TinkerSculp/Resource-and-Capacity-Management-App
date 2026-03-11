// /* =============================================================================
//    adminController.js
//    -----------------------------------------------------------------------------
//    PURPOSE:
//      Handles admin-only account creation. Supports 4 account types:
//        • 1 = Resource Manager  — account doc only
//        • 2 = Stakeholder       — account doc only
//        • 3 = Team Member       — account doc + full employee doc
//        • 4 = Admin             — account doc only

//    COLLECTION STRUCTURE (from profileController.js reference):
//      account    — { emp_id, account: { acc_type_id, account_id, password, username } }
//      employee   — { emp_id, emp_name, emp_title, dept_no, reports_to,
//                     manager_level, director_level, other_info, current_status }
//      department — { dept_no, dept_name }
//      account_type — { acc_type_id, acc_type }

//    SECURITY MODEL:
//      • All endpoints require JWT auth middleware (applied in routes).
//      • All endpoints require admin role check (acc_type_id === 4).
//      • All user inputs are sanitised — trimmed strings, validated types.
//      • emp_id uniqueness is verified before insert.
//      • account_id uniqueness is verified before insert.
//      • username uniqueness is verified before insert.
//      • Passwords stored as plain text to match existing schema (pass3000 pattern).
//        → Upgrade to bcrypt when ready by replacing the password field assignment.
//      • MongoDB _id fields are never returned in responses.
//      • Error messages are generic to client — full errors logged server-side only.

//    ENDPOINTS:
//      POST /api/admin/accounts         — create a new account (any type)
//      GET  /api/admin/accounts         — list all accounts (display-safe)
//      GET  /api/admin/dropdowns        — fetch dept + employee lists for the form
//      GET  /api/admin/next-emp-id      — returns the next available emp_id
//    ============================================================================= */

// import { connectDB } from "../config/db.js";

// /* =============================================================================
//    HELPER: checkAdmin
//    Looks up the caller's account from the DB using req.user.emp_id (set by the
//    protect middleware from the JWT payload). Returns true if acc_type_id === 4,
//    false + 403 response if not.

//    WHY NOT req.user.acc_type_id:
//      The JWT payload only contains { id, emp_id } — acc_type_id is not encoded
//      in the token. We must fetch it from the database on each request.
//    ============================================================================= */
// async function checkAdmin(req, res, db) {
//   const empId = req.user?.emp_id;
//   if (!empId) {
//     res.status(401).json({ error: "Unauthorised" });
//     return false;
//   }

//   const accountDoc = await db.collection("account").findOne({ emp_id: empId });
//   if (!accountDoc || accountDoc.account?.acc_type_id !== 4) {
//     res.status(403).json({ error: "Admin access required" });
//     return false;
//   }
//   return true;
// }

// /* =============================================================================
//    HELPER: sanitizeString
//    Trims and removes characters outside letters, digits, spaces, and common
//    punctuation. Prevents injection of special chars into DB queries.
//    ============================================================================= */
// function sanitizeString(val) {
//   if (typeof val !== "string") return "";
//   return val.trim().replace(/[<>"'`;]/g, "");
// }

// /* =============================================================================
//    HANDLER: getDropdowns
//    GET /api/admin/dropdowns
//    -----------------------------------------------------------------------------
//    Returns all data needed to populate the Create Account form dropdowns:
//      • departments list
//      • employees list (for Reports To, Manager Level, Director Level, VP)
//      • account_types list
//    ============================================================================= */
// export const getDropdowns = async (req, res) => {
//   try {
//     const db = await connectDB();
//     if (!(await checkAdmin(req, res, db))) return;

//     const [departments, employees, accountTypes] = await Promise.all([
//       db.collection("department").find({}, { projection: { _id: 0 } }).toArray(),
//       db.collection("employee").find({}, { projection: { _id: 0, emp_id: 1, emp_name: 1, emp_title: 1 } }).toArray(),
//       db.collection("account_type").find({}, { projection: { _id: 0 } }).toArray(),
//     ]);

//     return res.json({ departments, employees, accountTypes });

//   } catch (err) {
//     console.error("Admin dropdowns error:", err);
//     return res.status(500).json({ error: "Server error" });
//   }
// };

// /* =============================================================================
//    HANDLER: getNextEmpId
//    GET /api/admin/next-emp-id
//    -----------------------------------------------------------------------------
//    Finds the highest existing emp_id across both the account and employee
//    collections and returns max + 1 as the suggested next ID.
//    ============================================================================= */
// export const getNextEmpId = async (req, res) => {
//   try {
//     const db = await connectDB();
//     if (!(await checkAdmin(req, res, db))) return;

//     // Find max emp_id from both collections
//     const [topAccount, topEmployee] = await Promise.all([
//       db.collection("account").find({}, { projection: { emp_id: 1 } }).sort({ emp_id: -1 }).limit(1).toArray(),
//       db.collection("employee").find({}, { projection: { emp_id: 1 } }).sort({ emp_id: -1 }).limit(1).toArray(),
//     ]);

//     const maxAccount  = topAccount[0]?.emp_id  || 0;
//     const maxEmployee = topEmployee[0]?.emp_id || 0;
//     const nextEmpId   = Math.max(maxAccount, maxEmployee) + 1;

//     return res.json({ nextEmpId });

//   } catch (err) {
//     console.error("Next emp_id error:", err);
//     return res.status(500).json({ error: "Server error" });
//   }
// };

// /* =============================================================================
//    HANDLER: createAccount
//    POST /api/admin/accounts
//    -----------------------------------------------------------------------------
//    Creates a new account. Behaviour depends on acc_type_id:

//      Types 1, 2, 4 (Resource Manager, Stakeholder, Admin):
//        → Inserts one document into `account` collection only.
//        → emp_id is still stored on the account doc for profile lookups.

//      Type 3 (Team Member):
//        → Inserts one document into `account` collection.
//        → Also inserts one document into `employee` collection with all
//           employee fields from the form.

//    REQUEST BODY:
//      {
//        // Account fields (all types)
//        acc_type_id:  number,   // 1 | 2 | 3 | 4
//        account_id:   string,   // e.g. "000112"
//        username:     string,
//        password:     string,
//        emp_id:       number,

//        // Employee fields (type 3 only)
//        emp_name:     string,
//        emp_title:    string,
//        dept_no:      string,
//        reports_to:   number,
//        manager_level: number,
//        director_level: number,
//        other_info:   string,
//        current_status: string  // "Active" | "Inactive"
//      }
//    ============================================================================= */
// export const createAccount = async (req, res) => {
//   try {
//     const db   = await connectDB();
//     if (!(await checkAdmin(req, res, db))) return;
//     const body = req.body;

//     /* -------------------------------------------------------------------------
//        VALIDATE + SANITISE ACCOUNT FIELDS
//     ------------------------------------------------------------------------- */
//     const accTypeId  = parseInt(body.acc_type_id, 10);
//     const empId      = parseInt(body.emp_id, 10);
//     const accountId  = sanitizeString(body.account_id);
//     const username   = sanitizeString(body.username);
//     const password   = sanitizeString(body.password);

//     if (![1, 2, 3, 4].includes(accTypeId)) {
//       return res.status(400).json({ error: "Invalid account type." });
//     }
//     if (!empId || isNaN(empId)) {
//       return res.status(400).json({ error: "emp_id is required and must be a number." });
//     }
//     if (!accountId) {
//       return res.status(400).json({ error: "account_id is required." });
//     }
//     if (!username) {
//       return res.status(400).json({ error: "username is required." });
//     }
//     if (!password) {
//       return res.status(400).json({ error: "password is required." });
//     }

//     /* -------------------------------------------------------------------------
//        UNIQUENESS CHECKS
//        Check emp_id, account_id, and username before inserting anything.
//     ------------------------------------------------------------------------- */
//     const [existingEmpId, existingAccountId, existingUsername] = await Promise.all([
//       db.collection("account").findOne({ emp_id: empId }),
//       db.collection("account").findOne({ "account.account_id": accountId }),
//       db.collection("account").findOne({ "account.username": username }),
//     ]);

//     if (existingEmpId) {
//       return res.status(409).json({ error: `emp_id ${empId} is already in use.` });
//     }
//     if (existingAccountId) {
//       return res.status(409).json({ error: `account_id "${accountId}" is already in use.` });
//     }
//     if (existingUsername) {
//       return res.status(409).json({ error: `Username "${username}" is already taken.` });
//     }

//     /* -------------------------------------------------------------------------
//        BUILD + INSERT ACCOUNT DOCUMENT
//        Structure mirrors existing docs: { emp_id, account: { ... } }
//     ------------------------------------------------------------------------- */
//     const accountDoc = {
//       emp_id: empId,
//       account: {
//         acc_type_id: accTypeId,
//         account_id:  accountId,
//         password:    password,   // Store as-is to match existing schema (pass3000 pattern)
//         username:    username,
//       },
//     };

//     await db.collection("account").insertOne(accountDoc);

//     /* -------------------------------------------------------------------------
//        TYPE 3 (TEAM MEMBER): ALSO CREATE EMPLOYEE DOCUMENT
//     ------------------------------------------------------------------------- */
//     if (accTypeId === 3) {
//       const empName      = sanitizeString(body.emp_name);
//       const empTitle     = sanitizeString(body.emp_title);
//       const deptNo       = sanitizeString(body.dept_no);
//       const reportsTo    = body.reports_to    ? parseInt(body.reports_to, 10)    : null;
//       const managerLevel = body.manager_level ? parseInt(body.manager_level, 10) : null;
//       const directorLevel = body.director_level ? parseInt(body.director_level, 10) : null;
//       const otherInfo    = sanitizeString(body.other_info);
//       const currentStatus = sanitizeString(body.current_status) || "Active";

//       if (!empName)  return res.status(400).json({ error: "emp_name is required for Team Member accounts." });
//       if (!empTitle) return res.status(400).json({ error: "emp_title is required for Team Member accounts." });
//       if (!deptNo)   return res.status(400).json({ error: "dept_no is required for Team Member accounts." });

//       // Verify dept_no exists
//       const dept = await db.collection("department").findOne({ dept_no: deptNo });
//       if (!dept) {
//         return res.status(400).json({ error: `Department "${deptNo}" not found.` });
//       }

//       // Check employee collection for emp_id uniqueness too
//       const existingEmployee = await db.collection("employee").findOne({ emp_id: empId });
//       if (existingEmployee) {
//         // Rollback the account insert
//         await db.collection("account").deleteOne({ emp_id: empId });
//         return res.status(409).json({ error: `emp_id ${empId} already exists in employee records.` });
//       }

//       const employeeDoc = {
//         emp_id:          empId,
//         emp_name:        empName,
//         emp_title:       empTitle,
//         dept_no:         deptNo,
//         reports_to:      reportsTo,
//         manager_level:   managerLevel,
//         director_level:  directorLevel,
//         other_info:      otherInfo,
//         current_status:  currentStatus,
//       };

//       await db.collection("employee").insertOne(employeeDoc);
//     }

//     return res.status(201).json({
//       message: accTypeId === 3
//         ? "Account and employee record created successfully."
//         : "Account created successfully.",
//     });

//   } catch (err) {
//     console.error("Create account error:", err);
//     return res.status(500).json({ error: "Server error" });
//   }
// };

// /* =============================================================================
//    HANDLER: getAccounts
//    GET /api/admin/accounts
//    -----------------------------------------------------------------------------
//    Returns all accounts as display-safe objects. Joins account_type for the
//    role label. Passwords and MongoDB _id are never returned.
//    ============================================================================= */
// export const getAccounts = async (req, res) => {
//   try {
//     const db = await connectDB();
//     if (!(await checkAdmin(req, res, db))) return;

//     const accounts = await db.collection("account").find({}).toArray();

//     const accountTypes = await db.collection("account_type")
//       .find({}, { projection: { _id: 0 } })
//       .toArray();

//     const typeMap = {};
//     accountTypes.forEach((t) => { typeMap[t.acc_type_id] = t.acc_type; });

//     // Build display-safe response — never include password or _id
//     const safe = accounts.map((doc) => ({
//       emp_id:     doc.emp_id,
//       username:   doc.account?.username   || "",
//       account_id: doc.account?.account_id || "",
//       acc_type_id: doc.account?.acc_type_id,
//       role:       typeMap[doc.account?.acc_type_id] || "Unknown",
//     }));

//     return res.json(safe);

//   } catch (err) {
//     console.error("Get accounts error:", err);
//     return res.status(500).json({ error: "Server error" });
//   }
// };
/* =============================================================================
   adminController.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Handles admin-only account creation, editing, and listing.
     Supports 4 account types:
       • 1 = Resource Manager  — account doc only
       • 2 = Stakeholder       — account doc + employee doc
                                 (emp_id, emp_name, emp_title, dept_no, requestor_vp)
       • 3 = Team Member       — account doc + full employee doc
                                 (emp_id, emp_name, emp_title, dept_no, reports_to,
                                  manager_level, director_level, other_info, current_status)
       • 4 = Admin             — account doc only

   COLLECTION STRUCTURE:
     account    — { emp_id, account: { acc_type_id, account_id, password, username } }
     employee   — { emp_id, emp_name, emp_title, dept_no, reports_to,
                    manager_level, director_level, other_info, current_status,
                    requestor_vp }
     department — { dept_no, dept_name }
     account_type — { acc_type_id, acc_type }

   SECURITY MODEL:
     • All endpoints require JWT auth middleware (applied in routes).
     • All endpoints require admin role — checked via DB lookup of acc_type_id
       using req.user.emp_id (JWT payload only contains id + emp_id, not role).
     • All user inputs sanitised — trimmed strings, validated types.
     • emp_id uniqueness verified before insert.
     • account_id + username uniqueness verified before insert.
     • emp_id is immutable — cannot be changed via edit.
     • MongoDB _id never returned in responses.
     • Generic error messages to client — full errors logged server-side only.

   ENDPOINTS:
     POST /api/admin/accounts         — create account (any type)
     PUT  /api/admin/accounts/:empId  — edit account + employee fields
     GET  /api/admin/accounts         — list all accounts (display-safe)
     GET  /api/admin/dropdowns        — dept + employee lists for form
     GET  /api/admin/next-emp-id      — next available emp_id
   ============================================================================= */

import { connectDB } from "../config/db.js";

/* =============================================================================
   HELPER: checkAdmin
   Looks up the caller's account from the DB using req.user.emp_id (set by the
   protect middleware from the JWT payload). Returns true if acc_type_id === 4.

   WHY DB LOOKUP:
     JWT payload only contains { id, emp_id } — acc_type_id is not encoded
     in the token so we must fetch it from the database on each request.
   ============================================================================= */
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

/* =============================================================================
   HELPER: sanitizeString
   ============================================================================= */
function sanitizeString(val) {
  if (typeof val !== "string") return "";
  return val.trim().replace(/[<>"'`;]/g, "");
}

/* =============================================================================
   HANDLER: getDropdowns
   GET /api/admin/dropdowns
   ============================================================================= */
export const getDropdowns = async (req, res) => {
  try {
    const db = await connectDB();
    if (!(await checkAdmin(req, res, db))) return;

    const [departments, employees, accountTypes] = await Promise.all([
      db.collection("department").find({}, { projection: { _id: 0 } }).toArray(),
      db.collection("employee").find({}, { projection: { _id: 0, emp_id: 1, emp_name: 1, emp_title: 1 } }).toArray(),
      db.collection("account_type").find({}, { projection: { _id: 0 } }).toArray(),
    ]);

    return res.json({ departments, employees, accountTypes });
  } catch (err) {
    console.error("Admin dropdowns error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* =============================================================================
   HANDLER: getNextEmpId
   GET /api/admin/next-emp-id
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
   HANDLER: createAccount
   POST /api/admin/accounts
   -----------------------------------------------------------------------------
   Types 1, 4  → account doc only
   Type  2     → account doc + employee doc { emp_id, emp_name, emp_title,
                                               dept_no, requestor_vp }
   Type  3     → account doc + full employee doc
   ============================================================================= */
export const createAccount = async (req, res) => {
  try {
    const db   = await connectDB();
    if (!(await checkAdmin(req, res, db))) return;

    const body = req.body;

    /* ---- Validate account fields ---- */
    const accTypeId = parseInt(body.acc_type_id, 10);
    const empId     = parseInt(body.emp_id, 10);
    const accountId = sanitizeString(body.account_id);
    const username  = sanitizeString(body.username);
    const password  = sanitizeString(body.password);

    if (![1, 2, 3, 4].includes(accTypeId))
      return res.status(400).json({ error: "Invalid account type." });
    if (!empId || isNaN(empId))
      return res.status(400).json({ error: "emp_id is required and must be a number." });
    if (!accountId) return res.status(400).json({ error: "account_id is required." });
    if (!username)  return res.status(400).json({ error: "username is required." });
    if (!password)  return res.status(400).json({ error: "password is required." });

    /* ---- Uniqueness checks ---- */
    const [existingEmpId, existingAccountId, existingUsername] = await Promise.all([
      db.collection("account").findOne({ emp_id: empId }),
      db.collection("account").findOne({ "account.account_id": accountId }),
      db.collection("account").findOne({ "account.username": username }),
    ]);
    if (existingEmpId)    return res.status(409).json({ error: `emp_id ${empId} is already in use.` });
    if (existingAccountId) return res.status(409).json({ error: `account_id "${accountId}" is already in use.` });
    if (existingUsername) return res.status(409).json({ error: `Username "${username}" is already taken.` });

    /* ---- Insert account doc ---- */
    await db.collection("account").insertOne({
      emp_id: empId,
      account: { acc_type_id: accTypeId, account_id: accountId, password, username },
    });

    /* ---- Type 2: Stakeholder employee doc ---- */
    if (accTypeId === 2) {
      const empName    = sanitizeString(body.emp_name);
      const empTitle   = sanitizeString(body.emp_title);
      const deptNo     = sanitizeString(body.dept_no);
      const requestorVp = body.requestor_vp ? parseInt(body.requestor_vp, 10) : null;

      if (!empName)  { await db.collection("account").deleteOne({ emp_id: empId }); return res.status(400).json({ error: "emp_name is required for Stakeholder accounts." }); }
      if (!empTitle) { await db.collection("account").deleteOne({ emp_id: empId }); return res.status(400).json({ error: "emp_title is required for Stakeholder accounts." }); }
      if (!deptNo)   { await db.collection("account").deleteOne({ emp_id: empId }); return res.status(400).json({ error: "dept_no is required for Stakeholder accounts." }); }

      const existingEmployee = await db.collection("employee").findOne({ emp_id: empId });
      if (existingEmployee) {
        await db.collection("account").deleteOne({ emp_id: empId });
        return res.status(409).json({ error: `emp_id ${empId} already exists in employee records.` });
      }

      await db.collection("employee").insertOne({
        emp_id:       empId,
        emp_name:     empName,
        emp_title:    empTitle,
        dept_no:      deptNo,
        requestor_vp: requestorVp,
      });
    }

    /* ---- Type 3: Team Member full employee doc ---- */
    if (accTypeId === 3) {
      const empName       = sanitizeString(body.emp_name);
      const empTitle      = sanitizeString(body.emp_title);
      const deptNo        = sanitizeString(body.dept_no);
      const reportsTo     = body.reports_to     ? parseInt(body.reports_to, 10)     : null;
      const managerLevel  = body.manager_level  ? parseInt(body.manager_level, 10)  : null;
      const directorLevel = body.director_level ? parseInt(body.director_level, 10) : null;
      const otherInfo     = sanitizeString(body.other_info);
      const currentStatus = sanitizeString(body.current_status) || "Active";

      if (!empName)  { await db.collection("account").deleteOne({ emp_id: empId }); return res.status(400).json({ error: "emp_name is required for Team Member accounts." }); }
      if (!empTitle) { await db.collection("account").deleteOne({ emp_id: empId }); return res.status(400).json({ error: "emp_title is required for Team Member accounts." }); }
      if (!deptNo)   { await db.collection("account").deleteOne({ emp_id: empId }); return res.status(400).json({ error: "dept_no is required for Team Member accounts." }); }

      const existingEmployee = await db.collection("employee").findOne({ emp_id: empId });
      if (existingEmployee) {
        await db.collection("account").deleteOne({ emp_id: empId });
        return res.status(409).json({ error: `emp_id ${empId} already exists in employee records.` });
      }

      await db.collection("employee").insertOne({
        emp_id:         empId,
        emp_name:       empName,
        emp_title:      empTitle,
        dept_no:        deptNo,
        reports_to:     reportsTo,
        manager_level:  managerLevel,
        director_level: directorLevel,
        other_info:     otherInfo,
        current_status: currentStatus,
      });
    }

    return res.status(201).json({
      message: [2, 3].includes(accTypeId)
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
   Updates account fields and employee fields (if type 2 or 3).
   emp_id is immutable — cannot be changed.
   Only provided fields are updated ($set) — missing fields are left unchanged.
   ============================================================================= */
export const editAccount = async (req, res) => {
  try {
    const db    = await connectDB();
    if (!(await checkAdmin(req, res, db))) return;

    const empId = parseInt(req.params.empId, 10);
    if (!empId || isNaN(empId))
      return res.status(400).json({ error: "Invalid emp_id in URL." });

    const body = req.body;

    /* ---- Fetch existing account to know the type ---- */
    const existingAccount = await db.collection("account").findOne({ emp_id: empId });
    if (!existingAccount)
      return res.status(404).json({ error: `No account found for emp_id ${empId}.` });

    const accTypeId = existingAccount.account?.acc_type_id;

    /* ---- Build account $set patch ---- */
    const accountPatch = {};
    if (body.username   !== undefined) {
      const username = sanitizeString(body.username);
      // Check username uniqueness (exclude self)
      const conflict = await db.collection("account").findOne({
        "account.username": username,
        emp_id: { $ne: empId },
      });
      if (conflict) return res.status(409).json({ error: `Username "${username}" is already taken.` });
      accountPatch["account.username"] = username;
    }
    if (body.password   !== undefined) accountPatch["account.password"]   = sanitizeString(body.password);
    if (body.account_id !== undefined) {
      const accountId = sanitizeString(body.account_id);
      const conflict = await db.collection("account").findOne({
        "account.account_id": accountId,
        emp_id: { $ne: empId },
      });
      if (conflict) return res.status(409).json({ error: `account_id "${accountId}" is already in use.` });
      accountPatch["account.account_id"] = accountId;
    }
    if (body.acc_type_id !== undefined) accountPatch["account.acc_type_id"] = parseInt(body.acc_type_id, 10);

    if (Object.keys(accountPatch).length > 0) {
      await db.collection("account").updateOne({ emp_id: empId }, { $set: accountPatch });
    }

    /* ---- Build employee $set patch (types 2 and 3) ---- */
    if ([2, 3].includes(accTypeId)) {
      const empPatch = {};

      if (body.emp_name  !== undefined) empPatch.emp_name  = sanitizeString(body.emp_name);
      if (body.emp_title !== undefined) empPatch.emp_title = sanitizeString(body.emp_title);
      if (body.dept_no   !== undefined) empPatch.dept_no   = sanitizeString(body.dept_no);

      // Type 2 (Stakeholder) specific
      if (accTypeId === 2 && body.requestor_vp !== undefined)
        empPatch.requestor_vp = body.requestor_vp ? parseInt(body.requestor_vp, 10) : null;

      // Type 3 (Team Member) specific
      if (accTypeId === 3) {
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
          { upsert: false }
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
   Returns all accounts as display-safe objects. Joins employee data for
   types 2 and 3. Passwords and _id are never returned.
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
        emp_id:      doc.emp_id,
        username:    doc.account?.username    || "",
        account_id:  doc.account?.account_id  || "",
        acc_type_id: accTypeId,
        role:        typeMap[accTypeId]        || "Unknown",
        // Employee fields — populated for types 2 and 3
        emp_name:       emp.emp_name       || "",
        emp_title:      emp.emp_title      || "",
        dept_no:        emp.dept_no        || "",
        requestor_vp:   emp.requestor_vp   || null,
        reports_to:     emp.reports_to     || null,
        manager_level:  emp.manager_level  || null,
        director_level: emp.director_level || null,
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
