/* =============================================================================
   resourceRoutes.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Defines all REST API routes for the resources module, covering employee
     management, capacity tracking, departments, and managers. Mounted in
     server.js under /api/resources, so all paths here are relative to that prefix.

     Full route map:
       GET    /api/resources/employees                        — All employees
       GET    /api/resources/employees/:emp_id                — Single employee
       POST   /api/resources/employees                        — Create employee
       PUT    /api/resources/employees/:emp_id                — Full employee update
       PATCH  /api/resources/employees/:emp_id/status         — Status update only
       GET    /api/resources/employees/:emp_id/capacity       — Employee capacity
       PUT    /api/resources/employees/:emp_id/capacity       — Update capacity
       GET    /api/resources/departments                      — All departments
       GET    /api/resources/managers                         — All managers

   SECURITY MODEL:
     • All routes should be protected by JWT authentication middleware to
       ensure only authenticated users can access or modify resource data.
     • Write operations (POST, PUT, PATCH) must enforce role-based access
       control (RBAC) in the controller — only Resource Managers should be
       able to create, update, or modify employee records.
     • :emp_id URL parameters are passed to the controller which is
       responsible for validating the format and confirming the record exists
       before performing any read or write operation.
     • PATCH is used intentionally for status updates — it signals a partial
       update (status field only) rather than a full record replacement,
       following REST best practices and reducing the risk of accidental
       data overwrites.
     • The controller must never return sensitive fields such as passwords
       in any employee response — only display-safe fields should be included.

   DEPENDENCIES:
     • express              — Router instance
     • resourceController   — All handler functions for this resource
   ============================================================================= */

import express from "express";
import {
  getAllEmployees,        // GET  /employees               — Returns all employee records
  getEmployeeById,       // GET  /employees/:emp_id        — Returns a single employee
  createEmployee,        // POST /employees                — Creates a new employee record
  updateEmployee,        // PUT  /employees/:emp_id        — Full employee record update
  updateEmployeeStatus,  // PATCH /employees/:emp_id/status — Status field update only
  getEmployeeCapacity,   // GET  /employees/:emp_id/capacity — Returns capacity data
  updateEmployeeCapacity,// PUT  /employees/:emp_id/capacity — Updates capacity data
  getAllDepartments,      // GET  /departments              — Returns all departments
  getAllManagers          // GET  /managers                 — Returns all managers
} from "../controllers/resourceController.js";

const router = express.Router();

/* =============================================================================
   EMPLOYEE ROUTES
   ============================================================================= */

/* -----------------------------------------------------------------------------
   GET /api/resources/employees
   -----------------------------------------------------------------------------
   Returns all employee records. Used by the resource management dashboard
   to display the full employee list.

   SECURITY:
   • Requires JWT — prevents unauthenticated data scraping of all employees.
   • Controller should support filtering (e.g. by department, status) via
     query params, which must be sanitised before use in DB queries.
----------------------------------------------------------------------------- */
router.get("/employees", getAllEmployees);

/* -----------------------------------------------------------------------------
   GET /api/resources/employees/:emp_id
   -----------------------------------------------------------------------------
   Returns a single employee record by their employee ID.

   SECURITY:
   • :emp_id must be validated in the controller before querying the DB.
   • Controller should return 404 if no matching record is found, rather
     than exposing whether the ID format was invalid.
----------------------------------------------------------------------------- */
router.get("/employees/:emp_id", getEmployeeById);

/* -----------------------------------------------------------------------------
   POST /api/resources/employees
   -----------------------------------------------------------------------------
   Creates a new employee record. Used by Resource Managers to onboard
   new employees into the system.

   SECURITY:
   • MUST require JWT + RBAC — only Resource Managers should create employees.
   • Controller must validate all required fields and sanitise text inputs
     before writing to the database.
----------------------------------------------------------------------------- */
router.post("/employees", createEmployee);

/* -----------------------------------------------------------------------------
   PUT /api/resources/employees/:emp_id
   -----------------------------------------------------------------------------
   Performs a full update of an employee record. Replaces all editable
   fields with the values provided in the request body.

   SECURITY:
   • MUST require JWT + RBAC — only Resource Managers should update employees.
   • Controller must validate :emp_id and confirm the record exists before
     applying any changes.
----------------------------------------------------------------------------- */
router.put("/employees/:emp_id", updateEmployee);

/* -----------------------------------------------------------------------------
   PATCH /api/resources/employees/:emp_id/status
   -----------------------------------------------------------------------------
   Partial update — modifies the employee's status field only (e.g. active,
   inactive, on leave). PATCH is used intentionally to signal a targeted
   field update rather than a full record replacement.

   SECURITY:
   • MUST require JWT + RBAC — status changes affect access and visibility.
   • Controller must validate the status value against an allowed list to
     prevent arbitrary values being written to the database.
----------------------------------------------------------------------------- */
router.patch("/employees/:emp_id/status", updateEmployeeStatus);

/* =============================================================================
   CAPACITY ROUTES
   ============================================================================= */

/* -----------------------------------------------------------------------------
   GET /api/resources/employees/:emp_id/capacity
   -----------------------------------------------------------------------------
   Returns the capacity data for a specific employee. Used by the capacity
   planning views to show available vs allocated hours.

   SECURITY:
   • Requires JWT — capacity data is sensitive workforce planning information.
   • Controller must validate :emp_id before querying.
----------------------------------------------------------------------------- */
router.get("/employees/:emp_id/capacity", getEmployeeCapacity);

/* -----------------------------------------------------------------------------
   PUT /api/resources/employees/:emp_id/capacity
   -----------------------------------------------------------------------------
   Updates the capacity record for a specific employee.

   SECURITY:
   • MUST require JWT + RBAC — only Resource Managers should adjust capacity.
   • Controller must validate capacity values are within acceptable ranges
     before writing to the database.
----------------------------------------------------------------------------- */
router.put("/employees/:emp_id/capacity", updateEmployeeCapacity);

/* =============================================================================
   DEPARTMENT + MANAGER ROUTES
   ============================================================================= */

/* -----------------------------------------------------------------------------
   GET /api/resources/departments
   -----------------------------------------------------------------------------
   Returns all department records. Used to populate department dropdowns
   throughout the application.

   SECURITY:
   • Read-only — still requires JWT to prevent unauthenticated enumeration
     of internal organisational structure.
----------------------------------------------------------------------------- */
router.get("/departments", getAllDepartments);

/* -----------------------------------------------------------------------------
   GET /api/resources/managers
   -----------------------------------------------------------------------------
   Returns all manager records. Used to populate manager dropdowns in
   employee and initiative forms.

   SECURITY:
   • Read-only — requires JWT to prevent enumeration of internal personnel.
----------------------------------------------------------------------------- */
router.get("/managers", getAllManagers);

export default router;