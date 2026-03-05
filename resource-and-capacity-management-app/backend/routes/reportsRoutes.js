/* =============================================================================
   reportsRoutes.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Defines the three routes for the Capacity Report page:
       GET /api/reports            → Activity allocation summary (filterable)
       GET /api/reports/filters    → Dropdown option lists for activity filters
       GET /api/reports/capacity   → Per-employee allocation totals

   ROUTE ORDER:
     /filters and /capacity must be defined before / to prevent Express from
     attempting to match "filters" or "capacity" as a dynamic segment on a
     parameterised route. Since no params are used here, order is safe — but
     kept specific-first as a best practice.

   SECURITY MODEL:
     • All query parameter validation and sanitisation is handled inside
       each controller — see reportsController.js for full details.
     • JWT authentication middleware should be applied at the router level
       in server.js (e.g. app.use("/api/reports", verifyToken, reportsRouter))
       rather than per-route here — keeps auth enforcement centralised.

   DEPENDENCIES:
     • reportsController.js — getActivitySummary, getActivityFilters,
                               getEmployeeCapacity
   ============================================================================= */

import express from "express";
import {
  getActivitySummary,
  getActivityFilters,
  getEmployeeCapacity
} from "../controllers/reportsController.js";

const router = express.Router();

// GET /api/reports/filters
// Returns dropdown option lists: leaders, requestors, requestor_vp, requesting_dept
// Defined before / to prevent "filters" being misread as a dynamic segment
router.get("/filters", getActivityFilters);

// GET /api/reports/capacity
// Returns per-employee allocation totals across a configurable month window
// Defined before / for the same reason as /filters above
router.get("/capacity", getEmployeeCapacity);

// GET /api/reports
// Returns activity allocation summary, optionally filtered by category/leader/dept etc.
router.get("/", getActivitySummary);

export default router;