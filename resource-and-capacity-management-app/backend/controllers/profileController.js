/* =============================================================================
   profileController.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Returns the profile data for a given user, assembling information from
     the account, employee, department, and account_type collections into a
     single display-safe response object.

   SECURITY MODEL:
     • The username query parameter is required and trimmed before use in the
       DB query — prevents whitespace bypass attacks.
     • The username is used only in a MongoDB equality match — the driver
       handles it as a typed parameter, not interpolated into a raw query string.
     • emp_id and acc_type_id are derived from the validated account document —
       never taken directly from the client request.
     • The response is an explicitly constructed object containing only
       display-safe fields — passwords, account internals, and MongoDB _id
       values are never included in the response.
     • Optional chaining (?.) and fallback defaults ("") ensure no undefined
       or null values reach the response if related records are missing.
     • Generic error message on failure — full error is logged server-side only,
       preventing DB structure or collection names from leaking to the client.
     • This endpoint must be protected by JWT authentication middleware —
       unauthenticated users must not be able to fetch profile data.

   DEPENDENCIES:
     • ../config/db.js — MongoDB connection singleton
   ============================================================================= */

import { connectDB } from "../config/db.js";

/* -----------------------------------------------------------------------------
   HANDLER: getProfile
   GET /api/profile?username=<username>
   -----------------------------------------------------------------------------
   Assembles and returns the profile for the user matching the provided
   username query parameter. Joins data across account, employee, department,
   and account_type collections to produce a single display-safe profile object.

   QUERY PARAMETERS:
     ?username=<username>  — Required: the username to look up

   RESPONSE:
     {
       name:       string,  — Employee full name
       title:      string,  — Employee job title
       department: string,  — Department name
       role:       string,  — Account type label (e.g. "Resource Manager")
       id:         number   — Employee ID
     }

   SECURITY:
   • username is required — returns 400 immediately if missing.
   • username.trim() prevents whitespace bypass (e.g. " admin" matching "admin").
   • emp_id and acc_type_id are read from the validated account document —
     never from the client request directly.
   • Response object is explicitly constructed — no raw DB documents are
     returned, ensuring passwords and internal fields are never exposed.
----------------------------------------------------------------------------- */
export const getProfile = async (req, res) => {
  try {
    const db = await connectDB();

    const username = req.query.username;

    // username is required — return 400 immediately if missing
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
    // never trust these values from the client request
    const empId = accountDoc.emp_id;
    const accTypeId = accountDoc.account?.acc_type_id;

    // Fetch the employee record using the server-derived emp_id
    const employee = await db.collection("employee").findOne({
      emp_id: empId
    });

    // Fetch the department record if the employee exists —
    // optional chaining guards against a missing employee record
    const department = employee
      ? await db.collection("department").findOne({
          dept_no: employee.dept_no
        })
      : null;

    // Fetch the account type label (e.g. "Resource Manager") using acc_type_id
    const accountType = await db.collection("account_type").findOne({
      acc_type_id: accTypeId
    });

    // Build the display-safe profile response — explicitly constructed to ensure
    // no raw DB documents, passwords, or internal fields are ever included.
    // Fallback defaults ("") prevent undefined or null from reaching the response
    // if any related records are missing.
    const profile = {
      name:       employee?.emp_name   || "",
      title:      employee?.emp_title  || "",
      department: department?.dept_name || "",
      role:       accountType?.acc_type || "",
      id:         employee?.emp_id     || ""
    };

    return res.json(profile);

  } catch (err) {
    // Log full error server-side — generic message returned to client to
    // prevent DB structure or collection names from leaking in error responses
    console.error("Profile API error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};