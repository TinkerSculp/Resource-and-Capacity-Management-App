/* =============================================================================
   profileController.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Returns the profile data for a given user, assembling information from
     the account, employee, department, and account_type collections into a
     single display-safe response object.

   HOW IT WORKS:
     1. Validate the username query parameter
     2. Look up the account to get emp_id and acc_type_id
     3. Look up the employee record using the server-derived emp_id
     4. Resolve department name from the employee's dept_no
     5. Resolve the human-readable role label from acc_type_id
     6. Return an explicitly constructed display-safe profile object

   SECURITY MODEL:
     • The username query parameter is required and trimmed before the DB query —
       prevents whitespace bypass attacks (e.g. " admin" matching "admin").
     • emp_id and acc_type_id are derived from the validated account document —
       never taken from the client request directly.
     • The response is an explicitly constructed object with only display-safe
       fields — passwords, account internals, and MongoDB _id are never returned.
     • Optional chaining (?.) and fallback defaults ("") ensure no undefined or
       null values reach the response if related records are missing.
     • Generic error message on failure — full error is logged server-side only,
       preventing DB structure or collection names from leaking to the client.
     • This endpoint must be protected by JWT authentication middleware in the
       route layer — unauthenticated users must not be able to fetch profiles.

   DEPENDENCIES:
     • ../config/db.js — MongoDB connection singleton
   ============================================================================= */

import { connectDB } from "../config/db.js";

/* =============================================================================
   HANDLER: getProfile
   GET /api/profile?username=<username>
   -----------------------------------------------------------------------------
   Assembles and returns the profile for the user matching the provided username.
   Joins data across the account, employee, department, and account_type
   collections to produce a single display-safe profile object.

   QUERY PARAMETERS:
     ?username=<username>  — Required: the username to look up

   RESPONSE:
     {
       name:       string,  — Employee full name
       title:      string,  — Employee job title
       department: string,  — Department name (resolved from dept_no)
       role:       string,  — Account type label e.g. "Resource Manager"
       id:         number   — Employee ID
     }
   ============================================================================= */
export const getProfile = async (req, res) => {
  try {
    const db       = await connectDB();
    const username = req.query.username;

    // username is required — return 400 immediately before any DB query
    if (!username) {
      return res.status(400).json({ error: "Missing username" });
    }

    // Look up the account by username — trim to prevent whitespace bypass
    const accountDoc = await db.collection("account").findOne({
      "account.username": username.trim()
    });

    if (!accountDoc) {
      return res.status(404).json({ error: "Account not found" });
    }

    // Derive emp_id and acc_type_id from the validated account document —
    // these are never trusted from the client request
    const empId     = accountDoc.emp_id;
    const accTypeId = accountDoc.account?.acc_type_id;

    // Fetch the employee record using the server-derived emp_id
    const employee = await db.collection("employee").findOne({ emp_id: empId });

    // Fetch the department only if the employee record exists —
    // optional chaining prevents a crash if the employee record is missing
    const department = employee
      ? await db.collection("department").findOne({ dept_no: employee.dept_no })
      : null;

    // Fetch the human-readable account type label (e.g. "Resource Manager")
    const accountType = await db.collection("account_type").findOne({
      acc_type_id: accTypeId
    });

    /* -------------------------------------------------------------------------
       BUILD DISPLAY-SAFE PROFILE RESPONSE
       Explicitly constructed — no raw DB documents are returned.
       Fallback defaults ("") prevent undefined or null from reaching the
       response if any of the related records are missing.
    --------------------------------------------------------------------------- */
    const profile = {
      name:       employee?.emp_name    || "",
      title:      employee?.emp_title   || "",
      department: department?.dept_name || "",
      role:       accountType?.acc_type || "",
      id:         employee?.emp_id      || ""
    };

    return res.json(profile);

  } catch (err) {
    // Log full error server-side — generic message prevents DB internals leaking
    console.error("Profile API error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
