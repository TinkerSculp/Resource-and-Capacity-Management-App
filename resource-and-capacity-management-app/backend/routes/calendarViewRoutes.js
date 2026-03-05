/* =============================================================================
   calendarViewRoutes.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Defines all API routes for the calendar view feature. Mounted in
     server.js under /api/calendar-view, so all paths here are relative
     to that prefix.

     Full route map:
       GET  /api/calendar-view  — Available YYYYMM months for the month selector
       POST /api/calendar-view  — Activities for a selected month range

   SECURITY MODEL:
     • Both routes should be protected by JWT authentication middleware to
       ensure only authenticated users can access calendar data.
     • The GET route uses no user input in database queries — eliminates
       injection risk for the month list fetch.
     • The POST route accepts user-provided month values in the request body —
       the controller must validate that all provided values are valid YYYYMM
       integers and sanitise them before use in any database query.
     • POST is used intentionally for the activities fetch rather than GET
       with query parameters — this keeps selected month values out of the
       URL, preventing them from appearing in server logs, browser history,
       or referrer headers.
     • Both routes are read-only — no writes or mutations are permitted.

   DEPENDENCIES:
     • express                  — Router instance
     • calendarViewController   — Available months and activities fetch handlers
   ============================================================================= */

import express from "express";
import {
  getAvailableMonths,   // GET  / — Returns list of available YYYYMM months
  getActivitiesByMonth  // POST / — Returns activities for the selected month range
} from "../controllers/calendarViewController.js";

const router = express.Router();

/* -----------------------------------------------------------------------------
   GET /api/calendar-view
   -----------------------------------------------------------------------------
   Returns the list of available YYYYMM month values that have activity data.
   Used by the Calendar View UI to populate the month selector, ensuring users
   can only select months that have actual data in the database.

   SECURITY:
   • Requires a valid JWT token — unauthenticated requests must be rejected.
   • No user input is used in the database query — injection risk is eliminated.
   • Controller must validate and sanitise all YYYYMM values before returning
     them to prevent malformed data reaching the frontend month selector.
----------------------------------------------------------------------------- */
router.get("/", getAvailableMonths);

/* -----------------------------------------------------------------------------
   POST /api/calendar-view
   -----------------------------------------------------------------------------
   Returns all activities for the selected month range. The request body
   contains the chosen YYYYMM values and an optional emp_id for "Just Mine"
   filtering. Drives the Calendar View's activity grid display.

   SECURITY:
   • Requires a valid JWT token — unauthenticated requests must be rejected.
   • Controller must validate that all provided YYYYMM values are valid
     integers in the correct format before using them in database queries.
   • emp_id, if provided, must be validated against the authenticated user
     to prevent one user from fetching another user's activities.
   • POST is used intentionally to keep selected month values and emp_id
     out of the URL — prevents exposure in server logs, browser history,
     and referrer headers.
----------------------------------------------------------------------------- */
router.post("/", getActivitiesByMonth);

export default router;