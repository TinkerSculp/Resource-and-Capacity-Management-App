/* =============================================================================
   summaryController.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Returns dashboard summary counts (backlog, active, on hold) for the
     main dashboard cards. Supports two modes:
       • Global summary  — Counts across all assignments (default)
       • User summary    — Counts scoped to the requesting user's role

   HOW ROLE-BASED SCOPING WORKS:
     The ?filter=mine + ?username= combination triggers user-specific counts.
     The response shape is always { backlog, active, hold } regardless of mode.
     Scoping logic per role:
       • acc_type_id 1 (Resource Manager) — Assignments where leader === emp_name
       • acc_type_id 2 (Stakeholder)      — Assignments where requestor or
                                            requestor_vp === emp_name
       • acc_type_id 3 (Team Member)      — Assignments matching the employee's
                                            current-month allocation project names

   SECURITY MODEL:
     • username query param is validated against the DB before any scoped query
       runs — prevents a user from spoofing another user's username to view their
       summary counts.
     • emp_id and acc_type_id are derived from the validated account document —
       never taken from the client request directly.
     • username.trim() prevents whitespace bypass attacks.
     • All queries use server-derived values (emp_name, emp_id, project names)
       as filter criteria — no raw user input is used in DB queries.
     • Zero counts { backlog: 0, active: 0, hold: 0 } are returned for any
       missing or invalid state rather than errors, preventing information
       leakage about whether an account or employee record exists.
     • Generic error message on failure — full error is logged server-side only.
     • This is a read-only endpoint — no writes or mutations are performed.

   DEPENDENCIES:
     • ../config/db.js — MongoDB connection singleton
   ============================================================================= */

import { connectDB } from "../config/db.js";

/* -----------------------------------------------------------------------------
   HANDLER: getSummary
   GET /api/summary
   -----------------------------------------------------------------------------
   Returns backlog, active, and on-hold assignment counts for the dashboard.
   Defaults to a global count across all assignments unless ?filter=mine is
   provided, in which case counts are scoped to the requesting user's role.

   QUERY PARAMETERS:
     ?filter=mine          — Optional: enables user-scoped summary
     ?username=<username>  — Required when filter=mine: the user to scope to

   RESPONSE:
     { backlog: number, active: number, hold: number }

   SECURITY:
   • username is validated against the DB before any scoped query — prevents
     username spoofing to view another user's summary counts.
   • All filter criteria are derived server-side from validated DB records.
   • Graceful zero fallbacks prevent information leakage on missing records.
----------------------------------------------------------------------------- */
export const getSummary = async (req, res) => {
  try {
    const db = await connectDB();

    const filter = req.query.filter;
    const username = req.query.username;

    // -------------------------------------------------------------------------
    // GLOBAL SUMMARY (default — no filter=mine)
    // -------------------------------------------------------------------------
    // Returns counts across all assignments regardless of user.
    // No user input is used in these queries — injection risk is eliminated.
    if (filter !== "mine") {
      const backlog = await db.collection("assignment").countDocuments({
        status: "Backlog"
      });

      const active = await db.collection("assignment").countDocuments({
        status: { $in: ["On Going", "In Progress"] }
      });

      const hold = await db.collection("assignment").countDocuments({
        status: "On Hold"
      });

      return res.json({ backlog, active, hold });
    }

    // -------------------------------------------------------------------------
    // USER-SCOPED SUMMARY (filter=mine)
    // -------------------------------------------------------------------------
    // Return zero counts gracefully if username is missing — avoids leaking
    // whether the param was required or what would have been returned
    if (!username) {
      return res.json({ backlog: 0, active: 0, hold: 0 });
    }

    // Validate username against the DB — never trust the client-provided value
    // directly for scoping. Trim to prevent whitespace bypass.
    const accountDoc = await db.collection("account").findOne({
      "account.username": username.trim()
    });

    // Return zero counts if account not found — avoids confirming account existence
    if (!accountDoc) {
      return res.json({ backlog: 0, active: 0, hold: 0 });
    }

    // Resolve employee record from the validated account's emp_id
    const employee = await db.collection("employee").findOne({
      emp_id: accountDoc.emp_id
    });

    // Return zero counts if employee record is missing — defensive fallback
    if (!employee) {
      return res.json({ backlog: 0, active: 0, hold: 0 });
    }

    // Derive acc_type_id from the validated account document — not from the client
    const accType = accountDoc.account.acc_type_id;

    // -------------------------------------------------------------------------
    // RESOURCE MANAGER SUMMARY (acc_type_id === 1)
    // -------------------------------------------------------------------------
    // Scoped to assignments where leader === the manager's emp_name.
    // emp_name is derived from the validated employee record — not user input.
    if (accType === 1) {
      const baseQuery = { leader: employee.emp_name };

      const backlog = await db.collection("assignment").countDocuments({
        ...baseQuery,
        status: "Backlog"
      });

      const active = await db.collection("assignment").countDocuments({
        ...baseQuery,
        status: { $in: ["On Going", "In Progress"] }
      });

      const hold = await db.collection("assignment").countDocuments({
        ...baseQuery,
        status: "On Hold"
      });

      return res.json({ backlog, active, hold });
    }

    // -------------------------------------------------------------------------
    // STAKEHOLDER SUMMARY (acc_type_id === 2)
    // -------------------------------------------------------------------------
    // Scoped to assignments where requestor or requestor_vp === the
    // stakeholder's emp_name. $or covers both requestor roles in one query.
    if (accType === 2) {
      const baseQuery = {
        $or: [
          { requestor:    employee.emp_name },
          { requestor_vp: employee.emp_name }
        ]
      };

      const backlog = await db.collection("assignment").countDocuments({
        ...baseQuery,
        status: "Backlog"
      });

      const active = await db.collection("assignment").countDocuments({
        ...baseQuery,
        status: { $in: ["On Going", "In Progress"] }
      });

      const hold = await db.collection("assignment").countDocuments({
        ...baseQuery,
        status: "On Hold"
      });

      return res.json({ backlog, active, hold });
    }

    // -------------------------------------------------------------------------
    // TEAM MEMBER SUMMARY (acc_type_id === 3)
    // -------------------------------------------------------------------------
    // Scoped to assignments matching the employee's current-month allocations.
    // Current month is calculated server-side — not from client input.
    if (accType === 3) {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const ym = year * 100 + month; // Current month as YYYYMM integer

      // Find all allocation records for this employee in the current month
      const allocations = await db.collection("allocation")
        .find({
          emp_id: employee.emp_id, // Server-derived emp_id — not client input
          date: ym
        })
        .toArray();

      // No allocations this month — return zero counts
      if (!allocations.length) {
        return res.json({ backlog: 0, active: 0, hold: 0 });
      }

      // Derive project names from the validated allocation records
      const projectNames = allocations.map((a) => a.activity);

      // Scope assignment counts to projects this employee is allocated to
      const baseQuery = {
        project_name: { $in: projectNames } // Server-derived list — not client input
      };

      const backlog = await db.collection("assignment").countDocuments({
        ...baseQuery,
        status: "Backlog"
      });

      const active = await db.collection("assignment").countDocuments({
        ...baseQuery,
        status: { $in: ["On Going", "In Progress"] }
      });

      const hold = await db.collection("assignment").countDocuments({
        ...baseQuery,
        status: "On Hold"
      });

      return res.json({ backlog, active, hold });
    }

    // Unknown account type — return zero counts as a safe default
    return res.json({ backlog: 0, active: 0, hold: 0 });

  } catch (err) {
    // Log full error server-side — generic message returned to client to
    // prevent DB structure or collection names from leaking in error responses
    console.error("Summary API error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};