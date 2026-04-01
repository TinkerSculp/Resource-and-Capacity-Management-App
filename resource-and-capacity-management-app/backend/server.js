/* =============================================================================
   server.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Entry point for the Express backend. Responsible for:
       1. Loading environment variables (must happen first)
       2. Configuring middleware (security, CORS, body parsing)
       3. Mounting all API route handlers
       4. Connecting to MongoDB
       5. Starting the HTTP server

   STARTUP ORDER — CRITICAL:
     loadEnv.js MUST be imported before any other module that reads from
     process.env. If any module reads an env var at import time (e.g. to
     initialise a constant), it will get undefined if loadEnv hasn't run yet.
     The import order in this file enforces this guarantee.

   MIDDLEWARE ORDER — IMPORTANT:
     Middleware is applied in the order it is registered. The order here is:
       1. securityHeaders  — Set HTTP security headers on every response
       2. httpsRedirect    — Redirect HTTP → HTTPS in production
       3. cors             — Handle CORS before any route logic runs
       4. express.json()   — Parse JSON request bodies
       5. cookieParser()   — Parse cookies (used for session tokens)
     Routes are mounted after all middleware so every request passes through
     the full middleware stack before reaching a handler.

   ERROR HANDLING:
     The global errorHandler middleware is registered last — Express identifies
     error-handling middleware by its 4-argument signature (err, req, res, next).
     It must be after all routes so it can catch errors forwarded by any handler.
     The 404 catch-all is registered just before it so unmatched routes also
     produce a consistent JSON error rather than Express's default HTML 404.

   STARTUP FAILURE:
     If connectDB() fails, the server exits with process.exit(1) rather than
     starting without a database. This prevents the app from running in a
     broken state where all DB-dependent routes would fail silently.

   SECURITY MODEL:
     • x-powered-by is disabled — prevents Express version fingerprinting.
     • securityHeaders sets Content-Security-Policy, X-Frame-Options, etc.
     • httpsRedirect enforces HTTPS in production environments.
     • CORS is configured via corsOptions — only the frontend origin is allowed.
     • All routes require JWT authentication via protect middleware in their
       respective route files — see each routeFile.js for details.

   DEPENDENCIES:
     • express       — HTTP server framework
     • cors          — Cross-Origin Resource Sharing
     • cookie-parser — Cookie parsing middleware
     • ./config/db.js — MongoDB connection singleton
   ============================================================================= */

import "./loadEnv.js"; // ← MUST be first — loads .env before any other import reads process.env

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { connectDB } from "./config/db.js";

/* -----------------------------------------------------------------------------
   MIDDLEWARE IMPORTS
   Each middleware module is a single-responsibility unit:
     • security.js      — Sets HTTP security headers (CSP, HSTS, X-Frame-Options)
     • httpsRedirect.js — Redirects HTTP → HTTPS in production
     • corsOptions.js   — CORS configuration scoped to the frontend origin
     • errorHandler.js  — Global error handler (must be last middleware)
----------------------------------------------------------------------------- */
import securityHeaders from "./middleware/security.js";
import httpsRedirect from "./middleware/httpsRedirect.js";
import corsOptions from "./middleware/corsOptions.js";
import { errorHandler } from "./middleware/errorHandler.js";

/* -----------------------------------------------------------------------------
   ROUTE IMPORTS
   Each route file maps a URL prefix to a set of handlers in its controller.
   JWT protection is applied inside each route file via the protect middleware —
   not here, so individual routes can opt out if needed (e.g. /api/auth/login).
----------------------------------------------------------------------------- */
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import resourceRoutes from "./routes/resourceRoutes.js";
import summaryRoutes from "./routes/summaryRoutes.js";
import calendarViewRoutes from "./routes/calendarViewRoutes.js";
import capacitySummaryRoutes from "./routes/capacitySummaryRoutes.js";
import capacityMonthsRoutes from "./routes/capacityMonthsRoutes.js";
import initiativeRoutes from "./routes/initiativeRoutes.js";
import assignmentRoutes from "./routes/assignmentRoutes.js";
import reportsRoutes from "./routes/reportsRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

/* =============================================================================
   APP INITIALISATION
   ============================================================================= */
const app  = express();
const port = process.env.PORT || 3001; // Railway sets PORT automatically in production

/* =============================================================================
   MIDDLEWARE STACK
   Registered in order — each request passes through this stack top-to-bottom
   before reaching a route handler.
   ============================================================================= */

// Disable the X-Powered-By header — prevents Express version fingerprinting
app.disable("x-powered-by");

// Set HTTP security headers on every response (CSP, HSTS, X-Frame-Options, etc.)
app.use(securityHeaders);

// Redirect HTTP → HTTPS in production — no-op in local development
app.use(httpsRedirect);

// Apply CORS policy — only the configured frontend origin is allowed
app.use(cors(corsOptions));

// Parse JSON request bodies — makes req.body available to all handlers
app.use(express.json());

// Parse cookies — used for session management and JWT cookie storage
app.use(cookieParser());

/* =============================================================================
   HEALTH CHECK ENDPOINT
   -----------------------------------------------------------------------------
   GET /api/health
   Unauthenticated — used by Railway and monitoring tools to verify the server
   is running. Returns a timestamp so staleness can be detected.
   ============================================================================= */
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/* =============================================================================
   ROUTE MOUNTING
   -----------------------------------------------------------------------------
   Each route prefix maps to a router that handles all sub-routes for that
   resource. JWT authentication is enforced inside each router file.

   NOTE: /api/capacity-summary/months must be mounted BEFORE /api/capacity-summary
   because Express matches routes in registration order — if capacity-summary
   were first, requests to /months would be handled by the wrong router.
   ============================================================================= */
app.use("/api/auth",                    authRoutes);
app.use("/api/profile",                 profileRoutes);
app.use("/api/resources",               resourceRoutes);
app.use("/api/summary",                 summaryRoutes);
app.use("/api/calendar-view",           calendarViewRoutes);
app.use("/api/capacity-summary/months", capacityMonthsRoutes);  // ← Must be before /capacity-summary
app.use("/api/capacity-summary",        capacitySummaryRoutes);
app.use("/api/initiatives",             initiativeRoutes);
app.use("/api/assignments-allocations", assignmentRoutes);
app.use("/api/reports",                 reportsRoutes);
app.use("/api/admin",                   adminRoutes);
app.use("/api/ai",                      aiRoutes);

/* =============================================================================
   404 CATCH-ALL
   -----------------------------------------------------------------------------
   Catches any request that didn't match a registered route and returns a
   consistent JSON 404 response. Placed after all routes so it only fires
   for genuinely unmatched paths. Must be before the global error handler.
   ============================================================================= */
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

/* =============================================================================
   GLOBAL ERROR HANDLER
   -----------------------------------------------------------------------------
   Catches any error forwarded via next(err) from route handlers or middleware.
   Must be the LAST middleware registered — Express identifies error handlers
   by the 4-argument signature (err, req, res, next).
   ============================================================================= */
app.use(errorHandler);

/* =============================================================================
   DATABASE CONNECTION + SERVER START
   -----------------------------------------------------------------------------
   connectDB() must succeed before the server starts accepting requests.
   If it fails (wrong URI, network issue, bad credentials), the process exits
   with code 1 — Railway will restart the container automatically.
   ============================================================================= */
connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`🚀 Backend running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to connect to MongoDB — server will not start:", err);
    process.exit(1); // Exit cleanly — Railway restarts on non-zero exit codes
  });