/* =============================================================================
   assignmentRoutes.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Defines all REST API routes for the allocations/assignments resource.
     Mounted in server.js under /api/assignments-allocations, so all paths
     here are relative to that prefix.

     Full route map:
       GET    /api/assignments-allocations/                        — All allocations
       GET    /api/assignments-allocations/meta/dropdowns          — Dropdown metadata
       GET    /api/assignments-allocations/employee/:empId/department — Employee dept
       GET    /api/assignments-allocations/employee/:empId          — Single employee
       GET    /api/assignments-allocations/employees/dm             — All DM employees
       GET    /api/assignments-allocations/projects                 — All projects
       POST   /api/assignments-allocations/reassign                 — Reassign allocation
       POST   /api/assignments-allocations/                         — Create allocation
       PUT    /api/assignments-allocations/:id/amount               — Edit amount only
       PUT    /api/assignments-allocations/:id                      — Full update
       DELETE /api/assignments-allocations/:id                      — Delete allocation
       GET    /api/assignments-allocations/:id                      — Single allocation

   SECURITY MODEL:
     • All routes are protected by the JWT protect() middleware applied inside
       each controller via asyncHandler — unauthenticated requests are rejected
       with a 401 before any handler logic runs.
     • Request bodies on POST/PUT routes are validated via Zod schemas inside
       the controllers before any database operation is performed.
     • :empId and :id are URL parameters passed to the controller — the
       controller is responsible for validating and sanitising these values
       before using them in database queries.
     • The /:id wildcard route is registered LAST intentionally — Express
       matches routes in registration order, so specific paths like
       /meta/dropdowns and /employees/dm must be registered before /:id
       to prevent them from being incorrectly captured as ID lookups.

   DEPENDENCIES:
     • express                  — Router instance
     • assignmentController.js  — All handler functions for this resource
   ============================================================================= */

import express from "express";
import {
  getAllAllocations,       // GET /          — Returns all allocation records
  getAllocationById,       // GET /:id       — Returns a single allocation by ID
  getDeptForEmployee,     // GET /employee/:empId/department — Returns dept for an employee
  getProjects,            // GET /projects  — Returns all available projects
  getEmployee,            // GET /employee/:empId — Returns a single employee record
  getDMEmployees,         // GET /employees/dm   — Returns all DM-role employees
  editAllocationAmount,   // PUT /:id/amount     — Updates allocation amount only
  deleteAllocation,       // DELETE /:id         — Deletes an allocation record
  updateAllocation,       // PUT /:id            — Full allocation record update
  getAllocationDropdowns,  // GET /meta/dropdowns — Returns dropdown metadata for the UI
  createAllocation,       // POST /              — Creates a new allocation record
  reassignAllocation      // POST /reassign      — Reassigns an allocation to a new owner
} from "../controllers/assignmentController.js";

const router = express.Router();

/* =============================================================================
   GET ROUTES
   ============================================================================= */

// Return all allocation records
// Used by the main allocations table view
router.get("/", getAllAllocations);

// Return dropdown metadata (leaders, requestors, categories, etc.)
// Registered before /:id to prevent Express matching "meta" as an ID
router.get("/meta/dropdowns", getAllocationDropdowns);

// Return the department for a specific employee by empId
// Used when pre-populating the department field in forms
router.get("/employee/:empId/department", getDeptForEmployee);

// Return a single employee record by empId
// Used for employee lookups in the assignment UI
router.get("/employee/:empId", getEmployee);

// Return all employees with a DM (Delivery Manager) role
// Used to populate the DM dropdown in assignment forms
router.get("/employees/dm", getDMEmployees);

// Return all available projects
// Used to populate the project dropdown in allocation forms
router.get("/projects", getProjects);

/* =============================================================================
   POST ROUTES
   ============================================================================= */

// Reassign an existing allocation to a new owner or project
// Registered before POST / to keep reassign logic clearly separated
router.post("/reassign", reassignAllocation);

// Create a new allocation record
// Request body is validated in the controller before DB write
router.post("/", createAllocation);

/* =============================================================================
   PUT ROUTES
   ============================================================================= */

// Update the allocation amount field only — partial update
// Registered before PUT /:id so Express doesn't match "amount" as an ID segment
router.put("/:id/amount", editAllocationAmount);

// Full update of an allocation record
// Replaces all editable fields with the provided request body
router.put("/:id", updateAllocation);

/* =============================================================================
   DELETE ROUTES
   ============================================================================= */

// Delete an allocation record by its MongoDB _id
// Controller validates the ID and checks the record exists before deletion
router.delete("/:id", deleteAllocation);

/* =============================================================================
   WILDCARD ROUTE — MUST BE LAST
   =============================================================================
   This /:id route must be registered after all other GET routes.
   Express matches routes in the order they are registered — placing this
   first would cause paths like /meta/dropdowns and /employees/dm to be
   incorrectly treated as ID parameters, breaking those endpoints.
   ============================================================================= */
router.get("/:id", getAllocationById);

export default router;