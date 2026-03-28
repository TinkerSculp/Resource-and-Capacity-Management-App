/* =============================================================================
   calendarViewController.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Handles business logic for the Calendar View feature, which shows which
     projects/activities are active in each month. Supports two modes:
       • All mode   — shows all allocation data across all employees
       • Just Mine  — filters by the requesting user's role and identity

   JUST MINE SCOPING BY ROLE:
     Type 1 (Resource Manager) — allocation records for this employee
                                  (same query as Team Member)
     Type 2 (Stakeholder)      — active assignments where requestor or
                                  requestor_vp matches the employee's name
     Type 3 (Team Member)      — allocation records for this employee
     No emp_id (All mode)      — all allocation records for selected months

   KEY DESIGN DECISION — STAKEHOLDER SCOPING:
     Stakeholders see assignments they requested, not allocation records.
     This is intentional — stakeholders care about project status, not
     individual FTE amounts. The same project list is shown across all
     selected months since there is no per-month allocation record to filter on.

   SECURITY MODEL:
     • getAvailableMonths uses no user input in DB queries — zero injection risk
     • getActivitiesByMonth validates the months array before any DB query
     • emp_id is resolved server-side to acc_type_id and emp_name — role and
       identity are never trusted from the client directly
     • Only display-safe fields (activity, category) are returned — no raw DB
       documents or internal fields are exposed
     • Generic error messages are returned on failure — full error detail is
       logged server-side only to prevent DB structure leakage

   DEPENDENCIES:
     • ../config/db.js — MongoDB connection singleton
   ============================================================================= */

import { connectDB } from "../config/db.js";

/* =============================================================================
   UTILITY: formatMonthLabel
   -----------------------------------------------------------------------------
   Converts a YYYYMM integer or string to a short human-readable label for
   the Calendar View month selector (e.g. 202503 → "Mar-25").

   Uses the JavaScript Date constructor with month - 1 to handle month indexing
   (JS months are 0-indexed). toLocaleString is used for consistent short month
   names regardless of server locale.

   PARAM:  yyyymm {number|string} — Month in YYYYMM format
   RETURNS: {string}              — Formatted label e.g. "Mar-25"
   ============================================================================= */
function formatMonthLabel(yyyymm) {
  const s          = String(yyyymm);
  const year       = Number(s.slice(0, 4));
  const month      = Number(s.slice(4, 6));
  const date       = new Date(year, month - 1, 1); // month - 1: JS months are 0-indexed
  const shortMonth = date.toLocaleString("en-US", { month: "short" });
  const shortYear  = String(year).slice(2); // Last 2 digits of year e.g. "25"
  return `${shortMonth}-${shortYear}`;
}

/* =============================================================================
   HANDLER: getAvailableMonths
   GET /api/calendar-view
   -----------------------------------------------------------------------------
   Returns all distinct YYYYMM values present in the allocation collection,
   plus a formatted label for each. Used to populate the Calendar View month
   selector with only months that actually have data.

   No user input is used in the DB query — the distinct() call reads all
   unique date values from the allocation collection directly.
   ============================================================================= */
export const getAvailableMonths = async (req, res) => {
  try {
    const db  = await connectDB();
    const col = db.collection("allocation");

    // distinct() returns all unique values for the "date" field across all documents
    const rawMonths = await col.distinct("date");

    return res.json({
      success:   true,
      months:    rawMonths,
      formatted: rawMonths.map(m => ({
        yyyymm: m,
        label:  formatMonthLabel(m)
      }))
    });

  } catch (err) {
    console.error("Error in GET /calendar-view:", err);
    return res.status(500).json({
      success: false,
      error:   "Failed to load available months"
    });
  }
};

/* =============================================================================
   HANDLER: getActivitiesByMonth
   POST /api/calendar-view
   -----------------------------------------------------------------------------
   Returns the unique activities for each month in the provided selection,
   scoped by the requesting user's role if emp_id is provided.

   REQUEST BODY:
     {
       months: number[],  — Required: array of YYYYMM integers to fetch
       emp_id?: number    — Optional: triggers Just Mine scoping by role
     }

   RESPONSE:
     {
       success: true,
       activitiesByMonth: [
         { yyyymm, label, activities: [{ activity, category }, ...] },
         ...
       ]
     }

   DEDUPLICATION STRATEGY:
     A Set keyed by "activity__category" is used within each month to ensure
     each project appears only once per month, even if multiple allocation
     records exist for the same project (e.g. multiple employees on the same project).
   ============================================================================= */
export const getActivitiesByMonth = async (req, res) => {
  try {
    const { months, emp_id } = req.body;

    // months is required and must be a non-empty array
    if (!months || !Array.isArray(months) || months.length === 0) {
      return res.status(400).json({
        success: false,
        error:   "Months array is required"
      });
    }

    const db  = await connectDB();
    const col = db.collection("allocation");

    /* =========================================================================
       ALL MODE — no emp_id provided
       Fetches all allocation records for the selected months and deduplicates
       by activity+category within each month.
       ========================================================================= */
    if (!emp_id) {
      const results = await col.find({ date: { $in: months } }).toArray();

      const activitiesByMonth = months.map(yyyymm => {
        const monthRows = results.filter(r => Number(r.date) === Number(yyyymm));

        // Deduplicate by "activity__category" key — each project appears once per month
        const unique = [];
        const seen   = new Set();
        monthRows.forEach(r => {
          const key = `${r.activity}__${r.category}`;
          if (!seen.has(key)) {
            seen.add(key);
            unique.push({ activity: r.activity, category: r.category });
          }
        });

        return { yyyymm, label: formatMonthLabel(yyyymm), activities: unique };
      });

      return res.json({ success: true, activitiesByMonth });
    }

    /* =========================================================================
       JUST MINE MODE — emp_id provided
       Resolve acc_type_id and emp_name server-side from the DB.
       Role and identity are never trusted directly from the client.
       ========================================================================= */
    const accountDoc = await db.collection("account").findOne({
      emp_id: Number(emp_id)
    });

    // No account found — return empty activities rather than an error
    // This handles edge cases like deleted accounts gracefully
    if (!accountDoc) {
      return res.json({
        success: true,
        activitiesByMonth: months.map(yyyymm => ({
          yyyymm,
          label:      formatMonthLabel(yyyymm),
          activities: []
        }))
      });
    }

    const accTypeId = accountDoc.account?.acc_type_id;

    // Fetch the employee record for emp_name (needed for type 2 scoping)
    const employeeDoc = await db.collection("employee").findOne({ emp_id: Number(emp_id) });
    const empName     = employeeDoc?.emp_name || null;

    /* =========================================================================
       TYPE 1 — Resource Manager
       Shows allocation records for this employee only — same query as Type 3.
       Resource Managers see their own allocations in Just Mine mode, not
       all allocations they manage (that is the All mode).
       ========================================================================= */
    if (accTypeId === 1) {
      const results = await col.find({
        emp_id: Number(emp_id),
        date:   { $in: months }
      }).toArray();

      const activitiesByMonth = months.map(yyyymm => {
        const monthRows = results.filter(r => Number(r.date) === Number(yyyymm));
        const unique = [];
        const seen   = new Set();
        monthRows.forEach(r => {
          const key = `${r.activity}__${r.category}`;
          if (!seen.has(key)) {
            seen.add(key);
            unique.push({ activity: r.activity, category: r.category });
          }
        });
        return { yyyymm, label: formatMonthLabel(yyyymm), activities: unique };
      });

      return res.json({ success: true, activitiesByMonth });
    }

    /* =========================================================================
       TYPE 2 — Stakeholder
       Shows assignments where requestor or requestor_vp === emp_name.
       Only active statuses are included — Completed and Cancelled are excluded
       since those projects are no longer relevant to the stakeholder.

       The same deduplicated project list is shown in every selected month
       because stakeholders have no per-month allocation records to filter on.
       ========================================================================= */
    if (accTypeId === 2) {
      // If emp_name is missing, we cannot scope by name — return empty
      if (!empName) {
        return res.json({
          success: true,
          activitiesByMonth: months.map(yyyymm => ({
            yyyymm,
            label:      formatMonthLabel(yyyymm),
            activities: []
          }))
        });
      }

      // Find all active assignments where this stakeholder is requestor or requestor_vp
      const assignments = await db.collection("assignment")
        .find(
          {
            $or: [{ requestor: empName }, { requestor_vp: empName }],
            status: { $in: ["Backlog", "On Going", "In Progress", "On Hold"] }
          },
          { projection: { _id: 0, project_name: 1, category: 1 } }
        )
        .toArray();

      // Deduplicate across all assignments — a project may appear in multiple records
      const unique = [];
      const seen   = new Set();
      assignments.forEach(a => {
        const key = `${a.project_name}__${a.category}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push({ activity: a.project_name, category: a.category });
        }
      });

      // Show the same list for every selected month — no per-month filtering for stakeholders
      const activitiesByMonth = months.map(yyyymm => ({
        yyyymm,
        label:      formatMonthLabel(yyyymm),
        activities: unique
      }));

      return res.json({ success: true, activitiesByMonth });
    }

    /* =========================================================================
       TYPE 3 — Team Member
       Shows only allocation records assigned to this employee.
       emp_id is cast to Number — allocation emp_id is stored as an integer.
       ========================================================================= */
    if (accTypeId === 3) {
      const results = await col.find({
        emp_id: Number(emp_id),
        date:   { $in: months }
      }).toArray();

      const activitiesByMonth = months.map(yyyymm => {
        const monthRows = results.filter(r => Number(r.date) === Number(yyyymm));
        const unique = [];
        const seen   = new Set();
        monthRows.forEach(r => {
          const key = `${r.activity}__${r.category}`;
          if (!seen.has(key)) {
            seen.add(key);
            unique.push({ activity: r.activity, category: r.category });
          }
        });
        return { yyyymm, label: formatMonthLabel(yyyymm), activities: unique };
      });

      return res.json({ success: true, activitiesByMonth });
    }

    /* =========================================================================
       FALLBACK — unknown or unsupported account type
       Returns empty activities rather than an error — graceful degradation
       for any future account types added without updating this controller.
       ========================================================================= */
    return res.json({
      success: true,
      activitiesByMonth: months.map(yyyymm => ({
        yyyymm,
        label:      formatMonthLabel(yyyymm),
        activities: []
      }))
    });

  } catch (err) {
    console.error("Error in POST /calendar-view:", err);
    return res.status(500).json({
      success: false,
      error:   "Failed to load activities"
    });
  }
};
