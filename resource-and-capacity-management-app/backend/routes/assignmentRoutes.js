import express from "express";
import {
  getAllAllocations,
  getAllocationById,
  getDeptForEmployee,
  getProjects,
  getEmployee,
  getDMEmployees,
  editAllocationAmount,
  deleteAllocation,
  updateAllocation,
  getAllocationDropdowns,
  createAllocation,
  reassignAllocation   // ⭐ ADDED
} from "../controllers/assignmentController.js";

const router = express.Router();

/* ---------------------------------------------------------
   ALLOCATIONS — REST ROUTES
   (All handlers wrapped with asyncHandler inside controllers)
--------------------------------------------------------- */

// List all allocations
router.get("/", getAllAllocations);

// Dropdown metadata (leaders, requestors, categories, etc.)
router.get("/meta/dropdowns", getAllocationDropdowns);

// Employee department lookup
router.get("/employee/:empId/department", getDeptForEmployee);

// Single employee lookup
router.get("/employee/:empId", getEmployee);

// All DM employees
router.get("/employees/dm", getDMEmployees);

// All projects
router.get("/projects", getProjects);

// ⭐ NEW — Reassign allocation (Edit modal save)
router.post("/reassign", reassignAllocation);

// Create new allocation
router.post("/", createAllocation);

// Update allocation amount only
router.put("/:id/amount", editAllocationAmount);

// Update full allocation record
router.put("/:id", updateAllocation);

// Delete allocation
router.delete("/:id", deleteAllocation);

// Must be last — fallback for single allocation lookup
router.get("/:id", getAllocationById);

export default router;