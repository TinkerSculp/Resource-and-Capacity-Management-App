/* =============================================================================
   capacityMonthsRoutes.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Defines the API route for fetching available capacity months. Mounted in
     server.js under /api/capacity-summary/months, so the full endpoint is:

       GET /api/capacity-summary/months

   SECURITY MODEL:
     • This route should be protected by JWT authentication middleware to
       ensure only authenticated users can access the available month list.
     • No user input is passed into database queries — the controller reads
       available months directly from the database, eliminating injection risk.
     • The controller must sanitise and validate all values retrieved from the
       database before returning them to the client, ensuring no malformed
       YYYYMM values or unexpected data reaches the frontend.
     • This is a read-only endpoint — no writes or mutations are permitted.

   DEPENDENCIES:
     • express                   — Router instance
     • capacityMonthsController  — Available months fetch handler
   ============================================================================= */

import express from "express";
import {
  getCapacityMonths // GET / — Fetch list of available YYYYMM capacity months
} from "../controllers/capacityMonthsController.js";

const router = express.Router();

/* -----------------------------------------------------------------------------
   GET /api/capacity-summary/months
   -----------------------------------------------------------------------------
   Returns the list of available YYYYMM month values that have capacity data.
   Used by the Capacity Summary dashboard to populate the month selector,
   ensuring users can only select months that have actual data in the database.

   SECURITY:
   • Requires a valid JWT token — unauthenticated requests must be rejected.
   • No user input is used in the database query — injection risk is eliminated.
   • Controller must validate and sanitise all YYYYMM values before returning
     them to prevent malformed data reaching the frontend month selector.
----------------------------------------------------------------------------- */
router.get("/", getCapacityMonths);

export default router;