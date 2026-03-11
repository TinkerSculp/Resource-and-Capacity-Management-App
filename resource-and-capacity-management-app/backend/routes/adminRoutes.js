// /* =============================================================================
//    adminRoutes.js
//    -----------------------------------------------------------------------------
//    PURPOSE:
//      Registers all admin API routes under /api/admin.
//      All routes are protected by:
//        1. protect — verifies the JWT is valid and attaches req.user
//        2. requireAdmin      — inside each controller, checks acc_type_id === 4

//    ROUTES:
//      GET  /api/admin/dropdowns      — departments, employees, account types
//      GET  /api/admin/next-emp-id    — next available emp_id
//      GET  /api/admin/accounts       — list all accounts (display-safe)
//      POST /api/admin/accounts       — create a new account

//    USAGE (in your main app.js / server.js):
//      import adminRoutes from "./routes/adminRoutes.js";
//      app.use("/api/admin", adminRoutes);
//    ============================================================================= */

// import express from "express";
// import { protect } from "../middleware/auth.js";
// import {
//   getDropdowns,
//   getNextEmpId,
//   createAccount,
//   getAccounts,
// } from "../controllers/adminController.js";

// const router = express.Router();

// // All admin routes require a valid JWT
// router.use(protect);

// router.get("/dropdowns",   getDropdowns);
// router.get("/next-emp-id", getNextEmpId);
// router.get("/accounts",    getAccounts);
// router.post("/accounts",   createAccount);

// export default router;

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
} from "../controllers/adminController.js";

const router = express.Router();

router.use(protect);

router.get("/dropdowns",        getDropdowns);
router.get("/next-emp-id",      getNextEmpId);
router.get("/accounts",         getAccounts);
router.post("/accounts",        createAccount);
router.put("/accounts/:empId",  editAccount);

export default router;
