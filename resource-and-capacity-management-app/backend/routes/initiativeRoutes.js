import express from "express";
import {
  getAllInitiatives,
  getInitiativeById,
  getInitiativesByDept,
  updateInitiative,
  getInitiativeDropdowns,
  createInitiative
} from "../controllers/initiativeController.js";

const router = express.Router();

/**
 * ---------------------------------------------------------------------------
 * INITIATIVE ROUTES — SECURE API SURFACE
 * ---------------------------------------------------------------------------
 * SECURITY OVERVIEW:
 * • These routes expose CRUD operations for initiatives.
 * • Authentication + authorization MUST be enforced by:
 *      - global JWT middleware (e.g., verifyToken)
 *      - role-based access control (RBAC) in controllers or middleware
 * • This router intentionally contains **no business logic**.
 * • All validation, sanitization, and permission checks occur in controllers.
 *
 * IMPORTANT:
 * • Never trust client input — controllers must sanitize + validate.
 * • Never expose internal DB identifiers beyond what is required.
 * • Ensure all write operations (POST/PUT) require valid JWT + RBAC.
 * • GET routes should still validate user identity to prevent data leakage.
 * ---------------------------------------------------------------------------
 */

// List all initiatives (supports ?username, ?status=Completed, ?status=Cancelled)
// SECURITY:
// • Should require JWT to prevent unauthorized data scraping.
// • Controller must enforce user-level filtering (e.g., only see allowed initiatives).
router.get("/", getAllInitiatives);

// Dropdown metadata (owners, statuses, categories, etc.)
// SECURITY:
// • Read-only metadata — still should require authentication to prevent enumeration.
router.get("/dropdowns", getInitiativeDropdowns);

// Search initiatives by department or DM name
// SECURITY:
// • Must sanitize query params (dept name, VP name).
// • Prevents injection attacks in DB queries.
router.get("/dept/search", getInitiativesByDept);

// Create new initiative
// SECURITY:
// • MUST require JWT + RBAC (e.g., only Resource Managers).
// • Controller must validate payload fields and sanitize text inputs.
router.post("/", createInitiative);

// Update existing initiative
// SECURITY:
// • MUST require JWT + RBAC.
// • Controller must verify user has permission to update the specific initiative.
router.put("/", updateInitiative);

// Must be last — single initiative lookup
// SECURITY:
// • Should validate :id format to prevent malformed DB queries.
// • Should ensure user is authorized to view the requested initiative.
router.get("/:id", getInitiativeById);

export default router;