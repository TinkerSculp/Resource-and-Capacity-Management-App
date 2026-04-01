/* =============================================================================
   auth.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Express middleware that enforces JWT authentication on protected routes.
     Must be applied to any route that requires the user to be logged in.
     Extracts and verifies the Bearer token from the Authorization header,
     and attaches the decoded user payload to req.user for downstream handlers.

   HOW IT WORKS:
     1. Reads the Authorization header from the incoming request
     2. Extracts the token from the "Bearer <token>" format
     3. Verifies the token signature and expiry using JWT_SECRET
     4. Attaches the decoded payload ({ id, emp_id }) to req.user
     5. Calls next() to pass the request to the route handler

   HOW TO USE:
     Import and apply to any route or router that requires authentication:

       import { protect } from "../middleware/protect.js";

       // Single route
       router.get("/profile", protect, getProfile);

       // Entire router
       router.use(protect);

   SECURITY MODEL:
     • Tokens are verified (not just decoded) using jwt.verify() with the
       JWT_SECRET from environment variables. A tampered or forged token will
       fail verification and return a 401 immediately.
     • Both missing tokens and invalid/expired tokens return a 401 response —
       the generic "Invalid token" message intentionally avoids revealing
       whether the token was missing, expired, or tampered with.
     • The decoded payload is attached to req.user, making the authenticated
       user's id and emp_id available to all downstream route handlers without
       requiring additional database lookups.
     • JWT_SECRET must never be hardcoded — it is always loaded from
       environment variables. If it is ever exposed, rotate it immediately;
       all existing tokens will be invalidated automatically.
     • Token expiry (1 day, set in authController.js) is enforced automatically
       by jwt.verify() — expired tokens are rejected with a 401.
     • HTTPS enforcement (via httpsRedirect middleware) ensures tokens cannot
       be intercepted in transit.

   DEPENDENCIES:
     • jsonwebtoken — JWT verification library
   ============================================================================= */

import jwt from "jsonwebtoken";

/* -----------------------------------------------------------------------------
   MIDDLEWARE: protect
   -----------------------------------------------------------------------------
   Verifies the JWT Bearer token on the incoming request. Attaches the decoded
   user payload to req.user on success, or returns a 401 on any failure.

   PARAM:  req  {Request}  — Express request object. Reads Authorization header.
   PARAM:  res  {Response} — Express response object. Used to send 401 on failure.
   PARAM:  next {Function} — Express next() function. Called on successful auth.

   SECURITY:
   • Uses jwt.verify() — not jwt.decode(). verify() checks both the signature
     and expiry; decode() only base64-decodes the payload without any security
     checks and must never be used for authentication.
   • All failures (missing token, expired token, tampered token) return the
     same 401 response to prevent attackers from distinguishing between cases.
----------------------------------------------------------------------------- */
export const protect = (req, res, next) => {

  // Extract the token from the Authorization header.
  // Expected format: "Authorization: Bearer <token>"
  // Optional chaining handles missing header gracefully without throwing.
  const token = req.headers.authorization?.split(" ")[1];

  // No token present — reject immediately before any verification attempt
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "No token provided"
    });
  }

  try {
    // Verify the token signature and expiry against JWT_SECRET.
    // Throws JsonWebTokenError if the signature is invalid.
    // Throws TokenExpiredError if the token has passed its expiry date.
    // Both are caught below and returned as a generic 401.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the decoded payload to req.user so downstream handlers can
    // access the authenticated user's id and emp_id without a DB lookup.
    // Payload shape: { id, emp_id, iat, exp }
    req.user = decoded;

    // Authentication passed — proceed to the route handler
    next();

  } catch (error) {
    // Token is invalid, expired, or tampered with.
    // Return a generic 401 — intentionally does not distinguish between
    // expired vs tampered to avoid leaking information to attackers.
    return res.status(401).json({
      success: false,
      message: "Invalid token"
    });
  }
};
