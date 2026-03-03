import express from "express";
import { getCapacitySummary } from "../controllers/capacitySummaryController.js";

const router = express.Router();

/**
 * ---------------------------------------------------------------------------
 * ROUTE: GET /capacity-summary
 * ---------------------------------------------------------------------------
 * SECURITY:
 * • Read‑only endpoint — no writes or mutations allowed.
 * • Should be protected by authentication middleware at the router level.
 * • No user input is passed directly into DB queries — controller validates
 *   and sanitizes all query parameters before use.
 * • Ensures only aggregated, non‑sensitive data is returned.
 *
 * PURPOSE:
 * • Returns a 6‑month (or custom window) capacity summary.
 * • Used by the Capacity Summary dashboard for charts + tables.
 * ---------------------------------------------------------------------------
 */
router.get("/", getCapacitySummary);

export default router;