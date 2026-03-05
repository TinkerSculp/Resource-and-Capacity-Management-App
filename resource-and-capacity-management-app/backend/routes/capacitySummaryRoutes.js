/* =============================================================================
   capacitySummaryRoutes.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Defines the API route for fetching capacity summary data. Mounted in
     server.js under /api/capacity-summary, so the full endpoint is:

       GET /api/capacity-summary

   SECURITY MODEL:
     • This route should be protected by JWT authentication middleware to
       ensure only authenticated users can access capacity summary data.
     • Capacity data aggregates sensitive workforce planning information
       (employee hours, allocation percentages, utilisation rates) — it must
       never be publicly accessible.
     • Any query parameters used to configure the summary window (e.g. month
       range, department filter) must be validated and sanitised in the
       controller before being used in database aggregation queries.
     • The controller should enforce role-based scoping — a Team Member should
       only see capacity data relevant to them, while a Resource Manager may
       view the full organisational capacity picture.
     • This is a read-only endpoint — no writes or mutations are permitted.
     • The response should only contain aggregated, display-safe metrics —
       never raw database documents or individual employee sensitive data.

   DEPENDENCIES:
     • express                    — Router instance
     • capacitySummaryController  — Capacity summary fetch handler
   ============================================================================= */

import express from "express";
import {
  getCapacitySummary // GET / — Fetch aggregated capacity summary for the dashboard
} from "../controllers/capacitySummaryController.js";

const router = express.Router();

/* -----------------------------------------------------------------------------
   GET /api/capacity-summary
   -----------------------------------------------------------------------------
   Returns a capacity summary for a configurable month window (default 6 months).
   Used by the Capacity Summary dashboard to populate charts and tables showing
   employee availability vs allocation across the organisation.

   SECURITY:
   • Requires a valid JWT token — unauthenticated requests must be rejected.
   • Controller must validate and sanitise all query parameters (e.g. month
     range, department) before use in database aggregation queries.
   • Controller must enforce role-based scoping to ensure users only receive
     capacity data appropriate to their access level.
   • Response must only include aggregated display-safe metrics — never raw
     employee documents or sensitive individual capacity records.
----------------------------------------------------------------------------- */
router.get("/", getCapacitySummary);

export default router;