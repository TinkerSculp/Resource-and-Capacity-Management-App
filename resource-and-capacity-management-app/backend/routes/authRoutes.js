/* =============================================================================
   authRoutes.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Defines all authentication-related API routes. Mounted in server.js under
     /api/auth, so all paths here are relative to that prefix.

     Full route map:
       POST /api/auth/login            — Authenticate user, return JWT token
       POST /api/auth/forgot-password  — Request a password reset link
       POST /api/auth/reset-password   — Apply a new password using reset token

   SECURITY MODEL:
     • These are the only routes in the application that are intentionally
       PUBLIC — they do not require a JWT token because the user is either
       not yet authenticated (login) or has lost access (password reset).
     • All three routes accept POST bodies — credentials and reset tokens are
       never passed as URL parameters or query strings, preventing them from
       appearing in server logs, browser history, or referrer headers.
     • Request body validation (username, password format, token presence) is
       handled inside each controller before any database operation runs.
     • The login controller is responsible for verifying credentials and
       calling generateToken() — the raw password is never stored or logged.
     • Password reset tokens must be validated and checked for expiry inside
       the resetPassword controller before any password change is applied.
     • Once bcrypt is implemented, the login controller will use
       bcrypt.compare() instead of plaintext comparison for credential checks.

   DEPENDENCIES:
     • express         — Router instance
     • authController  — Login, forgot password, and reset password handlers
   ============================================================================= */

import express from "express";
import {
  login,           // POST /login           — Verify credentials, return JWT
  forgotPassword,  // POST /forgot-password — Generate and send reset link
  resetPassword    // POST /reset-password  — Validate reset token, update password
} from "../controllers/authController.js";

const router = express.Router();

/* -----------------------------------------------------------------------------
   POST /api/auth/login
   -----------------------------------------------------------------------------
   Accepts username + password in the request body, verifies credentials
   against the database, and returns a signed JWT token on success.

   SECURITY:
   • Credentials are sent in the POST body — never in the URL.
   • Controller validates that both fields are present before querying the DB.
   • On success, returns only the JWT token and safe user fields — never the
     password or full database document.
   • Rate limiting should be applied to this endpoint in production to
     prevent brute-force attacks.
----------------------------------------------------------------------------- */
router.post("/login", login);

/* -----------------------------------------------------------------------------
   POST /api/auth/forgot-password
   -----------------------------------------------------------------------------
   Accepts a username or identifier in the request body, generates a
   time-limited password reset token, and sends it to the user.

   SECURITY:
   • Should return a generic success response regardless of whether the
     account exists, to prevent user enumeration attacks.
   • Reset tokens must be short-lived and single-use — invalidated after
     use or expiry in the controller.
----------------------------------------------------------------------------- */
router.post("/forgot-password", forgotPassword);

/* -----------------------------------------------------------------------------
   POST /api/auth/reset-password
   -----------------------------------------------------------------------------
   Accepts a reset token and new password in the request body, validates
   the token, and updates the user's password in the database.

   SECURITY:
   • Reset token must be validated and checked for expiry before any
     password change is applied.
   • Once bcrypt is implemented, the new password must be hashed before
     being written to the database — never stored in plaintext.
   • Token must be invalidated immediately after successful use to prevent
     replay attacks.
----------------------------------------------------------------------------- */
router.post("/reset-password", resetPassword);

export default router;