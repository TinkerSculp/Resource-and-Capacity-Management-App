/* =============================================================================
   summaryRoutes.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Defines the API route for fetching summary dashboard data. Mounted in
     server.js under /api/summary, so the full endpoint is:

       GET /api/summary

   SECURITY MODEL:
     • This route should be protected by JWT authentication middleware to
       ensure only authenticated users can access summary data.
     • Summary data may aggregate sensitive workforce information (headcount,
       capacity, allocations) — it must never be publicly accessible.
     • Any query parameters used to filter the summary (e.g. by department,
       date range, or user) must be validated and sanitised in the controller
       before being used in database queries.
     • The controller should enforce role-based scoping — for example, a Team
       Member should only see summary data relevant to them, while a Resource
       Manager may see the full organisational summary.
     • This is a read-only endpoint — no writes or mutations are permitted.

   DEPENDENCIES:
     • express             — Router instance
     • summaryController   — Summary data fetch handler
   ============================================================================= */

import express from "express";
import {
  getSummary // GET / — Fetch aggregated summary data for the dashboard
} from "../controllers/summaryController.js";

const router = express.Router();

/* -----------------------------------------------------------------------------
   GET /api/summary
   -----------------------------------------------------------------------------
   Returns aggregated summary data used to populate the main dashboard.
   May include metrics such as total employees, capacity utilisation,
   active initiatives, and allocation totals depending on the user's role.

   SECURITY:
   • Requires a valid JWT token — unauthenticated requests must be rejected.
   • Controller must enforce role-based scoping to ensure users only receive
     summary data appropriate to their access level.
   • Any query parameters (filters, date ranges) must be sanitised in the
     controller before use in database aggregation queries.
   • Response should never include raw database documents or sensitive fields —
     only pre-aggregated, display-safe metrics should be returned.
----------------------------------------------------------------------------- */
router.get("/", getSummary);

export default router;