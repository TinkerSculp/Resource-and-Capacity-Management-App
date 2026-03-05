/* =============================================================================
   initiativeRoutes.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Defines all REST API routes for the initiatives resource. Mounted in
     server.js under /api/initiatives, so all paths here are relative to
     that prefix.

     Full route map:
       GET  /api/initiatives                   — All initiatives (filterable)
       GET  /api/initiatives/dropdowns         — Dropdown metadata
       GET  /api/initiatives/dept/search       — Search by department or DM
       POST /api/initiatives                   — Create new initiative
       PUT  /api/initiatives                   — Update existing initiative
       GET  /api/initiatives/:id               — Single initiative lookup

   SECURITY MODEL:
     • This router intentionally contains no business logic — all validation,
       sanitisation, and permission checks are handled inside controllers.
     • All routes should be protected by JWT authentication middleware —
       unauthenticated requests must be rejected before reaching any handler.
     • Write operations (POST, PUT) must enforce role-based access control
       (RBAC) in the controller — only Resource Managers should be able to
       create or update initiatives.
     • GET routes must still validate user identity to prevent unauthorised
       data scraping or leakage of sensitive initiative details.
     • Query parameters used for filtering (username, status, dept) must be
       sanitised in the controller before use in database queries to prevent
       injection attacks.
     • Internal DB identifiers must never be exposed beyond what is strictly
       required by the frontend.
     • The /:id wildcard route is registered LAST — Express matches routes in
       registration order, so /dropdowns and /dept/search must come before
       /:id to prevent them being incorrectly treated as ID lookups.

   DEPENDENCIES:
     • express                — Router instance
     • initiativeController   — All handler functions for this resource
   ============================================================================= */

import express from "express";
import {
  getAllInitiatives,      // GET  /              — Returns all initiatives (filterable by username, status)
  getInitiativeById,     // GET  /:id            — Returns a single initiative by ID
  getInitiativesByDept,  // GET  /dept/search    — Returns initiatives filtered by dept or DM name
  updateInitiative,      // PUT  /               — Updates an existing initiative record
  getInitiativeDropdowns,// GET  /dropdowns      — Returns dropdown metadata for the UI
  createInitiative       // POST /               — Creates a new initiative record
} from "../controllers/initiativeController.js";

const router = express.Router();

/* =============================================================================
   GET ROUTES
   ============================================================================= */

/* -----------------------------------------------------------------------------
   GET /api/initiatives
   -----------------------------------------------------------------------------
   Returns all initiative records. Supports optional query parameters:
     ?username=<username>       — Filter by initiative owner
     ?status=Completed          — Filter by status
     ?status=Cancelled          — Filter by status

   SECURITY:
   • Requires JWT — prevents unauthenticated scraping of all initiative data.
   • Controller must enforce user-level filtering so users only see initiatives
     they are permitted to view based on their role.
   • Query parameters must be sanitised before use in database queries.
----------------------------------------------------------------------------- */
router.get("/", getAllInitiatives);

/* -----------------------------------------------------------------------------
   GET /api/initiatives/dropdowns
   -----------------------------------------------------------------------------
   Returns dropdown metadata used to populate form selects in the UI
   (e.g. owners, statuses, categories, departments).
   Registered before /:id to prevent Express matching "dropdowns" as an ID.

   SECURITY:
   • Read-only — still requires JWT to prevent enumeration of internal
     organisational metadata by unauthenticated users.
----------------------------------------------------------------------------- */
router.get("/dropdowns", getInitiativeDropdowns);

/* -----------------------------------------------------------------------------
   GET /api/initiatives/dept/search
   -----------------------------------------------------------------------------
   Returns initiatives filtered by department name or DM (Delivery Manager)
   name, passed as query parameters.
   Registered before /:id to prevent Express matching "dept" as an ID.

   SECURITY:
   • Query params (dept name, DM name) must be sanitised in the controller
     before use in database queries to prevent injection attacks.
   • Requires JWT — department-level data is sensitive organisational information.
----------------------------------------------------------------------------- */
router.get("/dept/search", getInitiativesByDept);

/* =============================================================================
   POST ROUTES
   ============================================================================= */

/* -----------------------------------------------------------------------------
   POST /api/initiatives
   -----------------------------------------------------------------------------
   Creates a new initiative record. Used by Resource Managers to add new
   initiatives to the system.

   SECURITY:
   • MUST require JWT + RBAC — only Resource Managers should create initiatives.
   • Controller must validate all required payload fields and sanitise all
     text inputs before writing to the database.
----------------------------------------------------------------------------- */
router.post("/", createInitiative);

/* =============================================================================
   PUT ROUTES
   ============================================================================= */

/* -----------------------------------------------------------------------------
   PUT /api/initiatives
   -----------------------------------------------------------------------------
   Updates an existing initiative record. The initiative to update is
   identified via the request body rather than a URL parameter.

   SECURITY:
   • MUST require JWT + RBAC — only Resource Managers should update initiatives.
   • Controller must verify the requesting user has permission to update
     the specific initiative before applying any changes.
   • All input fields must be validated and sanitised before the DB write.
----------------------------------------------------------------------------- */
router.put("/", updateInitiative);

/* =============================================================================
   WILDCARD ROUTE — MUST BE LAST
   =============================================================================
   This /:id route must be registered after all other GET routes.
   Express matches routes in the order they are registered — placing this
   first would cause paths like /dropdowns and /dept/search to be incorrectly
   treated as ID parameters, breaking those endpoints.
   ============================================================================= */

/* -----------------------------------------------------------------------------
   GET /api/initiatives/:id
   -----------------------------------------------------------------------------
   Returns a single initiative record by its MongoDB _id.

   SECURITY:
   • :id must be validated in the controller to ensure it is a valid MongoDB
     ObjectId format — prevents malformed queries reaching the database.
   • Controller must confirm the requesting user is authorised to view the
     specific initiative before returning it.
----------------------------------------------------------------------------- */
router.get("/:id", getInitiativeById);

export default router;