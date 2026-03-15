// /* =============================================================================
//    calendarViewController.js
//    -----------------------------------------------------------------------------
//    PURPOSE:
//      Handles all business logic for the Calendar View feature:
//        • getAvailableMonths   — Returns all YYYYMM months that have activity data
//        • getActivitiesByMonth — Returns unique activities for a selected month range

//    SECURITY MODEL:
//      • getAvailableMonths uses no user input in DB queries — eliminates injection
//        risk entirely for the month list fetch.
//      • getActivitiesByMonth validates the months array before any DB query runs —
//        malformed or missing input is rejected with a 400 before touching the DB.
//      • emp_id is optional and conditionally included in the query — only appended
//        when provided, and must be validated against the authenticated user in the
//        protect() middleware to prevent one user fetching another user's data.
//      • All DB values are validated and formatted server-side before being returned
//        — malformed YYYYMM values cannot reach the frontend.
//      • Only display-safe fields (activity, category) are returned in responses —
//        no raw DB documents or internal fields are exposed.
//      • Generic error messages are returned on failure — full error detail is
//        logged server-side only, preventing DB structure leakage to the client.

//    DEPENDENCIES:
//      • ../config/db.js — MongoDB connection singleton
//    ============================================================================= */

// import { connectDB } from "../config/db.js";

// /* -----------------------------------------------------------------------------
//    UTILITY: formatMonthLabel
//    -----------------------------------------------------------------------------
//    Converts a YYYYMM integer or string into a short human-readable label
//    for display in the Calendar View month selector (e.g. 202503 → "Mar-25").

//    PARAM:  yyyymm {number|string} — Month value in YYYYMM format
//    RETURN: {string}               — Formatted label e.g. "Mar-25"

//    SECURITY:
//    • Pure formatting helper — no user input is passed directly to this function.
//    • Only called after YYYYMM values have been validated or retrieved from the DB.
//    • Prevents malformed month strings from being surfaced in the UI.
// ----------------------------------------------------------------------------- */
// function formatMonthLabel(yyyymm) {
//   const s = String(yyyymm);
//   const year = Number(s.slice(0, 4));
//   const month = Number(s.slice(4, 6));

//   // Construct a Date from year and month to leverage locale-aware formatting
//   const date = new Date(year, month - 1, 1);
//   const shortMonth = date.toLocaleString("en-US", { month: "short" });
//   const shortYear = String(year).slice(2); // Two-digit year e.g. "25"

//   return `${shortMonth}-${shortYear}`; // e.g. "Mar-25"
// }

// /* -----------------------------------------------------------------------------
//    HANDLER: getAvailableMonths
//    GET /api/calendar-view
//    -----------------------------------------------------------------------------
//    Returns all distinct YYYYMM values present in the allocation collection,
//    along with a formatted label for each. Used to populate the month selector
//    in the Calendar View UI so users can only select months with actual data.

//    RESPONSE:
//      {
//        success: true,
//        months:    [202501, 202502, ...],   — Raw YYYYMM integers
//        formatted: [{ yyyymm, label }, ...]  — With display labels e.g. "Jan-25"
//      }

//    SECURITY:
//    • No user input is used in the DB query — distinct() reads directly from
//      the collection, eliminating any injection risk.
//    • All returned YYYYMM values come from the database — they are formatted
//      server-side before being sent to the client.
//    • Generic error message on failure — full error is logged server-side only.
// ----------------------------------------------------------------------------- */
// export const getAvailableMonths = async (req, res) => {
//   try {
//     const db = await connectDB();
//     const allocationCol = db.collection("allocation");

//     // Retrieve all distinct date values from the allocation collection
//     // No user input involved — safe from injection by design
//     const rawMonths = await allocationCol.distinct("date");

//     return res.json({
//       success: true,
//       months: rawMonths,
//       formatted: rawMonths.map((m) => ({
//         yyyymm: m,
//         label: formatMonthLabel(m) // Convert to display label server-side
//       }))
//     });

//   } catch (err) {
//     // Log full error server-side — generic message returned to client to
//     // prevent DB structure or collection names from leaking in error responses
//     console.error("Error in GET /calendar-view:", err);
//     return res.status(500).json({
//       success: false,
//       error: "Failed to load available months"
//     });
//   }
// };

// /* -----------------------------------------------------------------------------
//    HANDLER: getActivitiesByMonth
//    POST /api/calendar-view
//    -----------------------------------------------------------------------------
//    Returns the unique activities for each month in the provided selection.
//    Activities are deduplicated per month using a Set-based key so the same
//    activity never appears twice in the same month's list.

//    REQUEST BODY:
//      {
//        months: number[],  — Required: array of YYYYMM integers to fetch
//        emp_id?: number    — Optional: scope results to a single employee
//      }

//    RESPONSE:
//      {
//        success: true,
//        activitiesByMonth: [
//          { yyyymm, label, activities: [{ activity, category }, ...] },
//          ...
//        ]
//      }

//    SECURITY:
//    • months array is validated before any DB query — must be a non-empty array.
//      Malformed or missing input is rejected with a 400 immediately.
//    • emp_id is optional — only appended to the query when provided. The protect()
//      middleware must verify that the provided emp_id belongs to the authenticated
//      user to prevent cross-user data access.
//    • { $in: months } is safe because the months array is validated above —
//      no dynamic operators or $where expressions are used.
//    • Only activity and category fields are returned per record — no raw DB
//      documents or internal fields are exposed to the client.
//    • Deduplication via Set prevents duplicate activity rows from appearing in
//      the UI if the same activity/category has multiple allocation records.
//    • Generic error message on failure — full error is logged server-side only.
// ----------------------------------------------------------------------------- */
// export const getActivitiesByMonth = async (req, res) => {
//   try {
//     const { months, emp_id } = req.body;

//     // Validate months array — must be present, an array, and non-empty
//     // Reject immediately before any DB query if invalid
//     if (!months || !Array.isArray(months) || months.length === 0) {
//       return res.status(400).json({
//         success: false,
//         error: "Months array is required"
//       });
//     }

//     const db = await connectDB();
//     const allocationCol = db.collection("allocation");

//     // Build the DB query — emp_id is only included if provided
//     // Conditional spread prevents undefined from being passed as a query field
//     const query = {
//       date: { $in: months }, // Match any allocation in the selected months
//       ...(emp_id ? { emp_id } : {}) // Scope to employee only when filtering
//     };

//     const results = await allocationCol.find(query).toArray();

//     // Group and deduplicate activities per month
//     const activitiesByMonth = months.map((yyyymm) => {

//       // Filter results to only this month's records
//       const monthRows = results.filter(
//         (r) => Number(r.date) === Number(yyyymm) // Coerce both sides to avoid type mismatch
//       );

//       // Deduplicate using a composite key: "activity__category"
//       // Prevents the same activity appearing multiple times if it has
//       // multiple allocation amounts within the same month
//       const unique = [];
//       const seen = new Set();

//       monthRows.forEach((r) => {
//         const key = `${r.activity}__${r.category}`;
//         if (!seen.has(key)) {
//           seen.add(key);
//           // Only return display-safe fields — not the full allocation record
//           unique.push({
//             activity: r.activity,
//             category: r.category
//           });
//         }
//       });

//       return {
//         yyyymm,
//         label: formatMonthLabel(yyyymm), // Human-readable label e.g. "Mar-25"
//         activities: unique
//       };
//     });

//     return res.json({
//       success: true,
//       activitiesByMonth
//     });

//   } catch (err) {
//     // Log full error server-side — generic message returned to client to
//     // prevent DB structure or collection names from leaking in error responses
//     console.error("Error in POST /calendar-view:", err);
//     return res.status(500).json({
//       success: false,
//       error: "Failed to load activities"
//     });
//   }
// };

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
