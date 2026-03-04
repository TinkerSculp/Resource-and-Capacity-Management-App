/* =============================================================================
   server.js
   -----------------------------------------------------------------------------
   PURPOSE:
     The main Express application entry point. Responsible for:
       • Loading environment variables before any other module runs
       • Connecting to the MongoDB database
       • Registering all global middleware in the correct order
       • Mounting all API route handlers under the /api prefix
       • Starting the HTTP server only after a successful DB connection

   STARTUP ORDER (CRITICAL):
     1. loadEnv.js    — Must run first so all process.env values are available
     2. connectDB()   — Database must be connected before accepting requests
     3. app.listen()  — Server only starts if DB connection succeeds

   SECURITY MODEL:
     • x-powered-by header is disabled to prevent Express fingerprinting.
     • securityHeaders middleware sets X-Frame-Options, X-Content-Type-Options,
       Referrer-Policy, and Permissions-Policy on every response.
     • httpsRedirect middleware enforces HTTPS in production by redirecting
       any HTTP requests before they reach route handlers.
     • CORS is restricted to the whitelisted origin defined in corsOptions —
       requests from unknown origins are rejected before hitting any route.
     • cookieParser enables secure cookie handling for session management.
     • All routes are prefixed with /api to clearly separate API endpoints
       from any static file serving or future frontend integration.
     • 404 responses return JSON (not HTML) to prevent information leakage
       about the server stack or file structure.
     • The global errorHandler is registered last so it catches any error
       thrown by any middleware or route handler above it.
     • The server fails fast (process.exit(1)) if the DB connection fails,
       preventing a running server with no database from silently serving
       broken responses.

   DEPENDENCIES:
     • express       — Web framework and routing
     • cors          — Cross-origin request filtering
     • cookie-parser — Cookie parsing for session/auth cookies
     • ./config/db   — MongoDB connection setup
     • ./middleware/ — Security, HTTPS, CORS, and error handling
     • ./routes/     — All API route modules
   ============================================================================= */

import "./loadEnv.js"; // Load .env variables FIRST — must precede all other imports

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { connectDB } from "./config/db.js";

/* -----------------------------------------------------------------------------
   MIDDLEWARE IMPORTS
   -----------------------------------------------------------------------------
   Each middleware is imported from its own module for separation of concerns.
   They are applied in a specific order below — see Global Middleware section.
----------------------------------------------------------------------------- */
import securityHeaders from "./middleware/security.js";       // Sets security response headers
import httpsRedirect from "./middleware/httpsRedirect.js";     // Enforces HTTPS in production
import corsOptions from "./middleware/corsOptions.js";         // Whitelisted CORS origins
import { errorHandler } from "./middleware/errorHandler.js";   // Centralised error handler

/* -----------------------------------------------------------------------------
   ROUTE IMPORTS
   -----------------------------------------------------------------------------
   All API route modules. Each is mounted under a specific /api/* prefix below.
   Commented-out routes are planned but not yet implemented.
----------------------------------------------------------------------------- */
import authRoutes from "./routes/authRoutes.js";                       // POST /api/auth/login etc.
import profileRoutes from "./routes/profileRoutes.js";                 // GET/PUT /api/profile
import resourceRoutes from "./routes/resourceRoutes.js";               // GET/POST /api/resources
import summaryRoutes from "./routes/summaryRoutes.js";                 // GET /api/summary
import calendarViewRoutes from "./routes/calendarViewRoutes.js";       // GET/POST /api/calendar-view
import capacitySummaryRoutes from "./routes/capacitySummaryRoutes.js"; // GET /api/capacity-summary
import capacityMonthsRoutes from "./routes/capacityMonthsRoutes.js";   // GET /api/capacity-summary/months
import initiativeRoutes from "./routes/initiativeRoutes.js";           // GET/POST /api/initiatives
import assignmentRoutes from "./routes/assignmentRoutes.js";           // GET/POST /api/assignments-allocations
// import reportsRoutes from "./routes/reportsRoutes.js";              // Planned: /api/reports

/* -----------------------------------------------------------------------------
   APP INITIALISATION
   -----------------------------------------------------------------------------
   Create the Express application instance and resolve the server port.
   PORT is read from environment variables so Railway (and other platforms)
   can inject the correct port at runtime without code changes.
----------------------------------------------------------------------------- */
const app = express();
const port = process.env.PORT || 3001; // Default to 3001 for local development

/* =============================================================================
   GLOBAL MIDDLEWARE
   =============================================================================
   Middleware is registered in a deliberate order — each layer processes the
   request before passing it to the next. Order matters significantly here:

     1. x-powered-by disabled  — Remove Express signature before any response
     2. securityHeaders         — Attach security headers to every response
     3. httpsRedirect           — Redirect HTTP → HTTPS before any logic runs
     4. cors                    — Reject disallowed origins before route handlers
     5. express.json()          — Parse JSON request bodies
     6. cookieParser()          — Parse cookies for session/auth handling
   ============================================================================= */

// Remove the X-Powered-By: Express header from all responses.
// Prevents attackers from easily identifying the server framework.
app.disable("x-powered-by");

// Apply security headers (X-Frame-Options, nosniff, Referrer-Policy, etc.)
// to every outgoing response before route handlers execute.
app.use(securityHeaders);

// In production, redirect any HTTP request to HTTPS before it reaches routes.
// Relies on the X-Forwarded-Proto header set by Railway's load balancer.
app.use(httpsRedirect);

// Enforce CORS policy — only requests from the whitelisted FRONTEND_URL
// origin are allowed. All other origins receive a CORS error response.
app.use(cors(corsOptions));

// Parse incoming JSON request bodies and make them available on req.body.
// Requests with malformed JSON will receive a 400 error automatically.
app.use(express.json());

// Parse Cookie header and populate req.cookies.
// Required for any route that reads or sets HTTP cookies.
app.use(cookieParser());

/* =============================================================================
   HEALTH CHECK ENDPOINT
   =============================================================================
   A simple unauthenticated endpoint used by Railway and monitoring tools
   to confirm the server is running and responsive.

   SECURITY:
   • Returns only status and timestamp — no internal state or stack info.
   • Does not require authentication so uptime monitors can call it freely.
   ============================================================================= */
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(), // ISO format for consistent parsing
  });
});

/* =============================================================================
   API ROUTES
   =============================================================================
   All routes are mounted under the /api prefix to clearly namespace the API
   and separate it from any future static file serving or frontend routes.

   SECURITY:
   • Protected routes enforce JWT authentication via the protect() middleware
     inside each route module — not applied globally here to allow public
     routes like /api/auth/login to remain accessible.
   • Route modules validate request bodies using Zod schemas via the
     validateRequest() middleware before any handler logic runs.
   ============================================================================= */
app.use("/api/auth", authRoutes);                                  // Authentication (login, logout)
app.use("/api/profile", profileRoutes);                            // User profile management
app.use("/api/resources", resourceRoutes);                         // Resource management
app.use("/api/summary", summaryRoutes);                            // Summary data views
app.use("/api/calendar-view", calendarViewRoutes);                 // Calendar view data
app.use("/api/capacity-summary", capacitySummaryRoutes);           // Capacity summary data
app.use("/api/capacity-summary/months", capacityMonthsRoutes);     // Capacity month selectors
app.use("/api/initiatives", initiativeRoutes);                     // Initiative management
app.use("/api/assignments-allocations", assignmentRoutes);         // Assignment + allocation data
// app.use("/api/reports", reportsRoutes);                         // Planned: reporting module

/* =============================================================================
   404 HANDLER
   =============================================================================
   Catches any request that did not match a registered route above.
   Returns a consistent JSON response rather than Express's default HTML 404,
   which could expose stack or framework information to the client.
   ============================================================================= */
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

/* =============================================================================
   GLOBAL ERROR HANDLER
   =============================================================================
   Must be registered LAST — Express identifies error-handling middleware by
   its four-argument signature (err, req, res, next). Any error thrown or
   passed to next(err) anywhere in the app flows here.

   Delegates to the centralised errorHandler in /middleware/errorHandler.js
   which formats the response and conditionally exposes stack traces in
   development only.
   ============================================================================= */
app.use(errorHandler);

/* =============================================================================
   SERVER STARTUP
   =============================================================================
   The server only starts listening after a successful database connection.
   If connectDB() fails, the process exits immediately with code 1 (fail fast),
   preventing a running server with no database from silently serving errors.

   SECURITY:
   • process.exit(1) on DB failure prevents the app from accepting requests
     in a broken state where all DB-dependent routes would fail unpredictably.
   ============================================================================= */
connectDB()
  .then(() => {
    // Database connected — safe to start accepting requests
    app.listen(port, () => {
      console.log(`🚀 Backend running on port ${port}`);
    });
  })
  .catch((err) => {
    // Database connection failed — log and exit immediately
    console.error("❌ Failed to start server:", err);
    process.exit(1); // Non-zero exit code signals failure to the host platform
  });