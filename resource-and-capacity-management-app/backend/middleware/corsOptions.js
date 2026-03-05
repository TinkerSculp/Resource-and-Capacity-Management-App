/* =============================================================================
   corsOptions.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Configures and exports the CORS (Cross-Origin Resource Sharing) policy
     for the Express application. Applied globally in server.js via the cors()
     middleware to control which frontend origins are permitted to make
     requests to the backend API.

   HOW CORS WORKS HERE:
     The browser sends an Origin header with every cross-origin request.
     The cors() middleware checks that origin against this config and either
     allows the request or rejects it with a CORS error before it reaches
     any route handler.

   SECURITY MODEL:
     • Only the single origin defined in FRONTEND_URL is permitted to make
       cross-origin requests. All other origins are rejected by the browser
       before any API logic runs.
     • If FRONTEND_URL is not set, origin is set to false — CORS is fully
       disabled and all cross-origin requests are rejected. This is a safe
       default that prevents accidental open access in misconfigured environments.
     • credentials: true allows the browser to include cookies and
       Authorization headers in cross-origin requests, which is required
       for JWT token and cookie-based authentication to work correctly.
     • FRONTEND_URL must be set to the exact origin of the frontend
       (e.g. https://yourapp.up.railway.app) with no trailing slash —
       any mismatch will cause CORS rejections in production.
     • In local development, set FRONTEND_URL=http://localhost:3000 (or
       whatever port the frontend runs on) in the backend .env file.

   DEPENDENCIES:
     • cors npm package — Applied in server.js as app.use(cors(corsOptions))
   ============================================================================= */

/* -----------------------------------------------------------------------------
   ALLOWED ORIGIN
   -----------------------------------------------------------------------------
   Read from environment variables — never hardcoded in source.

   SECURITY:
   • FRONTEND_URL must be the exact origin string including protocol and port
     if applicable (e.g. https://yourapp.up.railway.app).
   • Falls back to null if not set, which disables CORS entirely via the
     origin: false configuration below — a safe default.
----------------------------------------------------------------------------- */
const allowedOrigin = process.env.FRONTEND_URL || null;

/* -----------------------------------------------------------------------------
   CORS OPTIONS
   -----------------------------------------------------------------------------
   origin:
     • Set to the FRONTEND_URL string if provided — only that exact origin
       is allowed to make cross-origin requests to this API.
     • Set to false if FRONTEND_URL is not set — disables CORS entirely,
       rejecting all cross-origin requests in misconfigured environments.

   credentials:
     • Must be true for JWT Bearer tokens sent via the Authorization header
       and any cookie-based session handling to work in cross-origin requests.
     • When credentials: true is set, the origin must be an explicit value
       (not a wildcard *) — this is enforced by the browser automatically.
----------------------------------------------------------------------------- */
const corsOptions = {
  origin: allowedOrigin ? allowedOrigin : false, // Restrict to whitelisted origin only
  credentials: true                              // Required for JWT + cookie auth headers
};

export default corsOptions;