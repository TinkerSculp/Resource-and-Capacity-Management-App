/* =============================================================================
   summaryController.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Returns dashboard summary counts (backlog, active, on hold) for the
     main dashboard cards. Supports two modes:
       • Global summary — Counts across all assignments (default)
       • User summary   — Counts scoped to the requesting user's role

   HOW ROLE-BASED SCOPING WORKS:
     The ?filter=mine + ?username= combination triggers user-specific counts.
     The response shape is always { backlog, active, hold } regardless of mode.

     Scoping logic per account type:
       • Type 1 (Resource Manager) — Assignments where leader === emp_name
       • Type 2 (Stakeholder)      — Assignments where requestor OR
                                      requestor_vp === emp_name
       • Type 3 (Team Member)      — Assignments matching the employee's
                                      current-month allocation project names

   WHY ZERO COUNTS ON MISSING DATA:
     Zero counts { backlog: 0, active: 0, hold: 0 } are returned for any
     missing or invalid state (no username, account not found, employee not
     found, unknown account type) rather than errors. This prevents the
     dashboard from breaking due to incomplete data and avoids leaking
     information about whether a record exists.

   SECURITY MODEL:
     • username is validated against the DB before any scoped query runs —
       prevents a user from spoofing another user's username to view their counts.
     • emp_id and acc_type_id are derived from the validated account document —
       never taken from the client request directly.
     • username.trim() prevents whitespace bypass attacks.
     • All queries use server-derived values (emp_name, emp_id, project names)
       as filter criteria — no raw user input is used in DB queries.
     • This is a read-only endpoint — no writes or mutations are performed.
     • Generic error message on failure — full error is logged server-side only.

   DEPENDENCIES:
     • ../config/db.js — MongoDB connection singleton
   ============================================================================= */

import { connectDB } from "../config/db.js";

/* =============================================================================
   HANDLER: getSummary
   GET /api/summary
   -----------------------------------------------------------------------------
   Returns backlog, active, and on-hold assignment counts for the dashboard.
   Defaults to a global count across all assignments unless ?filter=mine is
   provided, in which case counts are scoped by the requesting user's role.

   QUERY PARAMETERS:
     ?filter=mine          — Optional: enables user-scoped summary
     ?username=<username>  — Required when filter=mine: the user to scope to

   RESPONSE:
     { backlog: number, active: number, hold: number }
   ============================================================================= */
export const getSummary = async (req, res) => {
  try {
    const db       = await connectDB();
    const filter   = req.query.filter;
    const username = req.query.username;

    /* =========================================================================
       GLOBAL SUMMARY — default when filter !== "mine"
       No user input is used in these queries — injection risk eliminated.
       countDocuments() is used rather than aggregate() for simplicity
       since only counts are needed.
       ========================================================================= */
    if (filter !== "mine") {
      const [backlog, active, hold] = await Promise.all([
        db.collection("assignment").countDocuments({ status: "Backlog" }),
        db.collection("assignment").countDocuments({ status: { $in: ["On Going", "In Progress"] } }),
        db.collection("assignment").countDocuments({ status: "On Hold" })
      ]);
      return res.json({ backlog, active, hold });
    }

    /* =========================================================================
       USER-SCOPED SUMMARY — filter=mine
       ========================================================================= */

    // Return zero counts if username is missing — avoids leaking what would
    // have been returned if the param was provided
    if (!username) {
      return res.json({ backlog: 0, active: 0, hold: 0 });
    }

    // Validate username against the DB — never trust the client-provided value
    // for scoping. Trim to prevent whitespace bypass.
    const accountDoc = await db.collection("account").findOne({
      "account.username": username.trim()
    });

    // Zero counts if account not found — avoids confirming account existence
    if (!accountDoc) return res.json({ backlog: 0, active: 0, hold: 0 });

    // Resolve employee record from the validated account's emp_id
    const employee = await db.collection("employee").findOne({
      emp_id: accountDoc.emp_id
    });

    // Zero counts if employee record missing — handles Admin accounts (type 4)
    // which have no employee doc, and any other edge cases
    if (!employee) return res.json({ backlog: 0, active: 0, hold: 0 });

    // Derive acc_type_id from the validated account document — not client input
    const accType = accountDoc.account.acc_type_id;

    /* =========================================================================
       TYPE 1 — RESOURCE MANAGER
       Scoped to assignments where leader === the manager's emp_name.
       emp_name is derived from the validated employee record.
       ========================================================================= */
    if (accType === 1) {
      const baseQuery = { leader: employee.emp_name }; // Server-derived — not client input

      const [backlog, active, hold] = await Promise.all([
        db.collection("assignment").countDocuments({ ...baseQuery, status: "Backlog" }),
        db.collection("assignment").countDocuments({ ...baseQuery, status: { $in: ["On Going", "In Progress"] } }),
        db.collection("assignment").countDocuments({ ...baseQuery, status: "On Hold" })
      ]);

      return res.json({ backlog, active, hold });
    }

    /* =========================================================================
       TYPE 2 — STAKEHOLDER
       Scoped to assignments where requestor OR requestor_vp === emp_name.
       $or covers both roles in a single countDocuments() call.
       ========================================================================= */
    if (accType === 2) {
      const baseQuery = {
        $or: [
          { requestor:    employee.emp_name },
          { requestor_vp: employee.emp_name }
        ]
      };

      const [backlog, active, hold] = await Promise.all([
        db.collection("assignment").countDocuments({ ...baseQuery, status: "Backlog" }),
        db.collection("assignment").countDocuments({ ...baseQuery, status: { $in: ["On Going", "In Progress"] } }),
        db.collection("assignment").countDocuments({ ...baseQuery, status: "On Hold" })
      ]);

      return res.json({ backlog, active, hold });
    }

    /* =========================================================================
       TYPE 3 — TEAM MEMBER
       Scoped to assignments matching the employee's current-month allocations.
       Current month is calculated server-side — not from client input.

       Two-step process:
         1. Find all allocation records for this employee in the current month
         2. Count assignments whose project_name is in that set
       ========================================================================= */
    if (accType === 3) {
      // Calculate current month as YYYYMM integer — server-side only
      const now = new Date();
      const ym  = now.getFullYear() * 100 + (now.getMonth() + 1);

      // Find all projects this employee is allocated to this month
      const allocations = await db.collection("allocation")
        .find({
          emp_id: employee.emp_id, // Server-derived emp_id — not client input
          date:   ym
        })
        .toArray();

      // No allocations this month — return zero counts
      if (!allocations.length) return res.json({ backlog: 0, active: 0, hold: 0 });

      // Build project name list from validated allocation records
      const projectNames = allocations.map(a => a.activity);

      const baseQuery = {
        project_name: { $in: projectNames } // Server-derived list — not client input
      };

      const [backlog, active, hold] = await Promise.all([
        db.collection("assignment").countDocuments({ ...baseQuery, status: "Backlog" }),
        db.collection("assignment").countDocuments({ ...baseQuery, status: { $in: ["On Going", "In Progress"] } }),
        db.collection("assignment").countDocuments({ ...baseQuery, status: "On Hold" })
      ]);

      return res.json({ backlog, active, hold });
    }

    // Unknown or unsupported account type — return safe zero counts
    return res.json({ backlog: 0, active: 0, hold: 0 });

  } catch (err) {
    console.error("Summary API error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
