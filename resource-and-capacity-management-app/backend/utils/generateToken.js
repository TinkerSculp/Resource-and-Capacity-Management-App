/* =============================================================================
   generateToken.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Generates a signed JSON Web Token (JWT) for an authenticated user.
     Called after a successful login to produce the token that the client
     stores and attaches to subsequent API requests via the Authorization
     header.

   HOW JWT AUTHENTICATION WORKS IN THIS APP:
     1. User logs in via POST /api/auth/login with username + password
     2. Backend verifies credentials and calls generateToken(user)
     3. The signed token is returned to the client
     4. Client stores the token (localStorage) and sends it as:
            Authorization: Bearer <token>
     5. The protect() middleware in /middleware/auth.js verifies the token
        on every protected route before the handler runs

   SECURITY MODEL:
     • The JWT payload contains only the minimum required fields (id, emp_id, username).
       Sensitive data such as passwords or full user objects are never embedded
       in the token payload.
     • The token is signed with JWT_SECRET loaded from environment variables —
       never hardcoded. If JWT_SECRET is exposed, rotate it immediately and
       all existing tokens will be invalidated automatically.
     • The 5-day expiry limits the window of exposure if a token is stolen.
       After expiry the client must re-authenticate to obtain a new token.
     • Tokens are verified (not just decoded) by the protect() middleware
       using the same JWT_SECRET, ensuring tampered tokens are rejected.
     • HTTPS (enforced in production via httpsRedirect middleware) ensures
       tokens cannot be intercepted in transit.

   DEPENDENCIES:
     • jsonwebtoken — Industry-standard JWT signing and verification library
   ============================================================================= */

import jwt from "jsonwebtoken";

/* -----------------------------------------------------------------------------
   FUNCTION: generateToken
   -----------------------------------------------------------------------------
   Signs and returns a JWT for the given user object.

   PARAM:  user {Object} — The authenticated user document from MongoDB.
                           Must contain _id, emp_id, and account.username fields.
   RETURN: {string}      — A signed JWT string valid for 7 days.

   SECURITY:
   • Only _id, emp_id, and username are included in the payload — the minimum
     needed for the backend to identify the user and scope requests correctly.
   • Never include passwords, full user objects, or sensitive fields in the
     payload — JWT payloads are base64-encoded, not encrypted, and can be
     decoded by anyone who holds the token.
   • JWT_SECRET must be a long, random string. If it is ever exposed or
     committed to version control, rotate it immediately — all active
     sessions will be invalidated and users will need to log in again.
----------------------------------------------------------------------------- */
export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,              // MongoDB document ID — used to identify the user on protected routes
      emp_id: user.emp_id,       // Employee ID — used to scope API queries to the correct employee
      username: user.account.username // Account username — available to the frontend without an extra API call
    },
    process.env.JWT_SECRET, // Signing secret — loaded from .env, never hardcoded
    { expiresIn: "5d" }     // Token expires after 1 dayd — client must re-authenticate after
  );
};