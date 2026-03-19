/* =============================================================================
   adminRoutes.js
   -----------------------------------------------------------------------------
   ROUTES:
     GET  /api/admin/dropdowns          — departments, employees, account types
     GET  /api/admin/next-emp-id        — next available emp_id
     GET  /api/admin/accounts           — list all accounts (display-safe)
     POST /api/admin/accounts           — create a new account
     PUT  /api/admin/accounts/:empId    — edit existing account + employee fields

   All routes protected by protect middleware (JWT verification).
   Admin role check (acc_type_id === 4) is performed inside each controller
   via DB lookup — JWT payload only contains { id, emp_id }.
   ============================================================================= */

import express from "express";
import { protect } from "../middleware/auth.js";
import {
  getDropdowns,
  getNextEmpId,
  createAccount,
  editAccount,
  getAccounts,
  migratePasswords,
} from "../controllers/adminController.js";

const router = express.Router();

router.use(protect);

router.get("/dropdowns",        getDropdowns);
router.get("/next-emp-id",      getNextEmpId);
router.get("/accounts",         getAccounts);
router.post("/accounts",        createAccount);
router.put("/accounts/:empId",  editAccount);

// One-time password migration — call once after deploying bcrypt, then safe to ignore
router.post('/migrate-passwords', protect, migratePasswords);

export default router;
