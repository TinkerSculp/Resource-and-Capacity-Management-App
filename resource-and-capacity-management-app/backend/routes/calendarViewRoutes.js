import express from "express";
import {
  getAvailableMonths,
  getActivitiesByMonth
} from "../controllers/calendarViewController.js";

const router = express.Router();

/**
 * ---------------------------------------------------------------------------
 * ROUTE: GET /calendar-view
 * ---------------------------------------------------------------------------
 * SECURITY:
 * • Read‑only endpoint — no writes or mutations allowed.
 * • Should be protected by authentication middleware at the router level.
 * • No user input is used in DB queries — eliminates injection risk.
 *
 * PURPOSE:
 * • Returns the list of available YYYYMM values for the calendar view.
 * • Used to populate the month selector in the Calendar UI.
 * ---------------------------------------------------------------------------
 */
router.get("/", getAvailableMonths);

/**
 * ---------------------------------------------------------------------------
 * ROUTE: POST /calendar-view
 * ---------------------------------------------------------------------------
 * SECURITY:
 * • Accepts user‑provided month input — must be validated in controller.
 * • Controller must sanitize and verify YYYYMM before using it in DB queries.
 * • POST used intentionally to avoid exposing selected month in URL.
 *
 * PURPOSE:
 * • Returns all activities for a selected month.
 * • Drives the Calendar View’s activity grid.
 * ---------------------------------------------------------------------------
 */
router.post("/", getActivitiesByMonth);

export default router;