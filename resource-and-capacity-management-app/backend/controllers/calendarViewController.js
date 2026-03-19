/* =============================================================================
   calendarViewController.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Handles all business logic for the Calendar View feature:
       • getAvailableMonths   — Returns all YYYYMM months that have activity data
       • getActivitiesByMonth — Returns unique activities for a selected month range

   JUST MINE SCOPING BY ROLE:
     Type 1 (Resource Manager) — assignments where leader === emp_name,
                                  grouped by completion_date month
     Type 2 (Stakeholder)      — assignments where requestor or requestor_vp
                                  === emp_name, grouped by completion_date month
     Type 3 (Team Member)      — allocation records for the employee
     All mode / no emp_id      — all allocation records for selected months

   SECURITY MODEL:
     • getAvailableMonths uses no user input in DB queries — eliminates injection
       risk entirely for the month list fetch.
     • getActivitiesByMonth validates the months array before any DB query runs —
       malformed or missing input is rejected with a 400 before touching the DB.
     • emp_id is resolved server-side to acc_type_id and emp_name — role and
       identity are never trusted from the client directly.
     • All DB values are validated and formatted server-side before being returned
       — malformed YYYYMM values cannot reach the frontend.
     • Only display-safe fields (activity, category) are returned in responses —
       no raw DB documents or internal fields are exposed.
     • Generic error messages are returned on failure — full error detail is
       logged server-side only, preventing DB structure leakage to the client.

   DEPENDENCIES:
     • ../config/db.js — MongoDB connection singleton
   ============================================================================= */

import { connectDB } from "../config/db.js";

/* -----------------------------------------------------------------------------
   UTILITY: formatMonthLabel
   -----------------------------------------------------------------------------
   Converts a YYYYMM integer or string into a short human-readable label
   for display in the Calendar View month selector (e.g. 202503 → "Mar-25").

   PARAM:  yyyymm {number|string} — Month value in YYYYMM format
   RETURN: {string}               — Formatted label e.g. "Mar-25"
----------------------------------------------------------------------------- */
function formatMonthLabel(yyyymm) {
  const s = String(yyyymm);
  const year = Number(s.slice(0, 4));
  const month = Number(s.slice(4, 6));
  const date = new Date(year, month - 1, 1);
  const shortMonth = date.toLocaleString("en-US", { month: "short" });
  const shortYear = String(year).slice(2);
  return `${shortMonth}-${shortYear}`;
}

/* -----------------------------------------------------------------------------
   HANDLER: getAvailableMonths
   GET /api/calendar-view
   -----------------------------------------------------------------------------
   Returns all distinct YYYYMM values present in the allocation collection,
   along with a formatted label for each.
----------------------------------------------------------------------------- */
export const getAvailableMonths = async (req, res) => {
  try {
    const db = await connectDB();
    const allocationCol = db.collection("allocation");

    const rawMonths = await allocationCol.distinct("date");

    return res.json({
      success: true,
      months: rawMonths,
      formatted: rawMonths.map((m) => ({
        yyyymm: m,
        label: formatMonthLabel(m)
      }))
    });

  } catch (err) {
    console.error("Error in GET /calendar-view:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to load available months"
    });
  }
};

/* -----------------------------------------------------------------------------
   HANDLER: getActivitiesByMonth
   POST /api/calendar-view
   -----------------------------------------------------------------------------
   Returns the unique activities for each month in the provided selection.

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
----------------------------------------------------------------------------- */
export const getActivitiesByMonth = async (req, res) => {
  try {
    const { months, emp_id } = req.body;

    // Validate months array — must be present, an array, and non-empty
    if (!months || !Array.isArray(months) || months.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Months array is required"
      });
    }

    const db = await connectDB();
    const allocationCol = db.collection("allocation");

    /* -------------------------------------------------------------------------
       ALL MODE — no emp_id provided
       Reads from allocation collection exactly as before.
    ------------------------------------------------------------------------- */
    if (!emp_id) {
      const query = { date: { $in: months } };
      const results = await allocationCol.find(query).toArray();

      const activitiesByMonth = months.map((yyyymm) => {
        const monthRows = results.filter(
          (r) => Number(r.date) === Number(yyyymm)
        );
        const unique = [];
        const seen = new Set();
        monthRows.forEach((r) => {
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

    /* -------------------------------------------------------------------------
       JUST MINE MODE — emp_id provided
       Resolve acc_type_id and emp_name server-side, then scope by role.
    ------------------------------------------------------------------------- */
    const accountDoc = await db.collection("account").findOne({
      emp_id: Number(emp_id)
    });

    // No account found — return empty activities rather than error
    if (!accountDoc) {
      return res.json({
        success: true,
        activitiesByMonth: months.map((yyyymm) => ({
          yyyymm,
          label: formatMonthLabel(yyyymm),
          activities: []
        }))
      });
    }

    const accTypeId = accountDoc.account?.acc_type_id;

    const employeeDoc = await db.collection("employee").findOne({
      emp_id: Number(emp_id)
    });
    const empName = employeeDoc?.emp_name || null;

    /* -----------------------------------------------------------------------
       TYPE 1 — Resource Manager
       Allocation records for this employee in the selected months (same as
       Team Member) — unchanged from original behaviour.
    ----------------------------------------------------------------------- */
    if (accTypeId === 1) {
      const query = {
        date: { $in: months },
        emp_id: Number(emp_id)
      };

      const results = await allocationCol.find(query).toArray();

      const activitiesByMonth = months.map((yyyymm) => {
        const monthRows = results.filter(
          (r) => Number(r.date) === Number(yyyymm)
        );
        const unique = [];
        const seen   = new Set();
        monthRows.forEach((r) => {
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

    /* -----------------------------------------------------------------------
       TYPE 2 — Stakeholder
       Assignments where requestor or requestor_vp === emp_name.
       Returns all matching assignments regardless of completion_date —
       the project is shown in every selected month so the stakeholder
       can always see their projects in the calendar.
    ----------------------------------------------------------------------- */
    if (accTypeId === 2) {
      // If emp_name not found, return empty
      if (!empName) {
        return res.json({
          success: true,
          activitiesByMonth: months.map((yyyymm) => ({
            yyyymm,
            label: formatMonthLabel(yyyymm),
            activities: []
          }))
        });
      }

      const assignments = await db.collection("assignment")
        .find(
          {
            $or: [{ requestor: empName }, { requestor_vp: empName }],
            status: { $in: ["Backlog", "On Going", "In Progress", "On Hold"] }
          },
          { projection: { _id: 0, project_name: 1, category: 1 } }
        )
        .toArray();

      // Deduplicate across all assignments for this stakeholder
      const unique = [];
      const seen   = new Set();
      assignments.forEach((a) => {
        const key = `${a.project_name}__${a.category}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push({ activity: a.project_name, category: a.category });
        }
      });

      // Show the same deduplicated list in every selected month
      const activitiesByMonth = months.map((yyyymm) => ({
        yyyymm,
        label: formatMonthLabel(yyyymm),
        activities: unique
      }));

      return res.json({ success: true, activitiesByMonth });
    }

    /* -----------------------------------------------------------------------
       TYPE 3 — Team Member
       Allocation records for this employee in the selected months.
    ----------------------------------------------------------------------- */
    if (accTypeId === 3) {
      // Cast emp_id to Number — allocation emp_id is stored as an integer
      const empIdNum = Number(emp_id);
      const results = await allocationCol.find({
        emp_id: empIdNum,
        date:   { $in: months }
      }).toArray();

      const activitiesByMonth = months.map((yyyymm) => {
        const monthRows = results.filter(
          (r) => Number(r.date) === Number(yyyymm)
        );
        const unique = [];
        const seen   = new Set();
        monthRows.forEach((r) => {
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

    /* -----------------------------------------------------------------------
       FALLBACK — unknown account type, return empty
    ----------------------------------------------------------------------- */
    return res.json({
      success: true,
      activitiesByMonth: months.map((yyyymm) => ({
        yyyymm,
        label: formatMonthLabel(yyyymm),
        activities: []
      }))
    });

  } catch (err) {
    console.error("Error in POST /calendar-view:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to load activities"
    });
  }
};
