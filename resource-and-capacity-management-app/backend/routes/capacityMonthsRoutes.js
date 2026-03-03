import express from "express";
import { getCapacityMonths } from "../controllers/capacityMonthsController.js";

const router = express.Router();

/**
 * ---------------------------------------------------------------------------
 * ROUTE: GET /capacity-summary/months
 * ---------------------------------------------------------------------------
 * SECURITY:
 * • Read‑only endpoint — no writes or mutations allowed.
 * • Should be protected by authentication middleware at the router level.
 * • No user input is used in DB queries — eliminates injection risk.
 * • Controller sanitizes and validates all DB values before returning them.
 *
 * PURPOSE:
 * • Returns the list of available YYYYMM capacity months.
 * • Used by the Capacity Summary dashboard to populate the month selector.
 * ---------------------------------------------------------------------------
 */
router.get("/", getCapacityMonths);

export default router;