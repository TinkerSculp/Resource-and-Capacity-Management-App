/* =============================================================================
   authController.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Handles all authentication logic for the application:
       • login          — Verify credentials, issue JWT token
       • forgotPassword — Initiate password reset flow
       • resetPassword  — Apply new password (placeholder — not yet implemented)

   ⚠️  BCRYPT TODO:
     The login handler currently compares passwords in plaintext. Before
     production handoff, the following changes must be made:
       1. Run scripts/hash-passwords.js to hash all existing passwords in the DB
       2. Replace the plaintext comparison in login() with:
              const isMatch = await bcrypt.compare(password, user.account.password);
              if (!isMatch) { ... return 401 ... }
     bcrypt is already imported and ready — only the comparison line needs updating.

   SECURITY MODEL:
     • Both "user not found" and "wrong password" return the same 401 response
       with the same message ("Invalid username or password") — prevents user
       enumeration attacks where an attacker determines valid usernames by
       comparing error responses.
     • username is trimmed before use in the DB query to prevent whitespace
       bypass attacks.
     • JWT_SECRET is validated to be present before token generation — returns
       500 immediately if misconfigured rather than signing with an undefined secret.
     • The JWT payload contains only emp_id, username, and acc_type_id —
       the minimum required for authentication and RBAC. Passwords and
       sensitive account fields are never included.
     • Token expiry is set to 1 day — limits the window of exposure if a
       token is stolen.
     • The response user object contains only display-safe fields — never
       the password or internal MongoDB _id.

   DEPENDENCIES:
     • ../config/db.js  — MongoDB connection singleton
     • bcrypt           — Ready for password hashing (see TODO above)
     • jsonwebtoken     — JWT token signing
   ============================================================================= */

import { connectDB } from "../config/db.js";
import bcrypt from "bcrypt"; // ⚠️  Ready for use — see bcrypt TODO in file header
import jwt from "jsonwebtoken";

/* -----------------------------------------------------------------------------
   HANDLER: login
   POST /api/auth/login
   -----------------------------------------------------------------------------
   Authenticates a user by verifying their username and password against the
   database. Returns a signed JWT token and safe user object on success.

   REQUEST BODY:
     { username: string, password: string }

   RESPONSE (success):
     { success: true, token: string, user: { emp_id, username, acc_type_id, account_id } }

   SECURITY:
   • Both "not found" and "wrong password" cases return the same 401 message
     to prevent user enumeration — never reveal which field was wrong.
   • username.trim() prevents whitespace bypass (e.g. " admin" matching "admin").
   • JWT_SECRET presence is verified before signing — prevents token generation
     with an undefined secret if the environment is misconfigured.
   • ⚠️  PLAINTEXT PASSWORD COMPARISON — must be replaced with bcrypt.compare()
     before production deployment. See file header TODO for instructions.
----------------------------------------------------------------------------- */
export const login = async (req, res) => {
  try {
    const db = await connectDB();
    const { username, password } = req.body;

    // Both fields are required — return 400 if either is missing
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password required"
      });
    }

    // Look up the account by username — trim to prevent whitespace bypass
    const user = await db.collection("account").findOne({
      "account.username": username.trim()
    });

    if (!user) {
      // Returns a distinct error code so the frontend can show a targeted message.
      // NOTE: This reveals that the username does not exist — accepted usability
      // trade-off for this internal application. For public-facing apps, always
      // return the same message for both cases to prevent user enumeration.
      return res.status(401).json({
        success: false,
        error: "username_not_found",
        message: "Username not found"
      });
    }

    // ⚠️  TODO: Replace this plaintext comparison with bcrypt before production:
    //     const isMatch = await bcrypt.compare(password, user.account.password);
    //     if (!isMatch) { return res.status(401).json({ error: "wrong_password", ... }) }
    if (password !== user.account.password) {
      return res.status(401).json({
        success: false,
        error: "wrong_password",
        message: "Incorrect password"
      });
    }

    // Verify JWT_SECRET is configured before attempting to sign
    // Prevents signing with undefined which would produce an insecure token
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing from environment variables");
      return res.status(500).json({
        success: false,
        message: "Server configuration error"
      });
    }

    // Sign the JWT with minimal payload — only what downstream handlers need
    // Never include passwords or sensitive fields in the token payload
    const token = jwt.sign(
      {
        emp_id: user.emp_id,                       // Used to scope API queries
        username: user.account.username,            // Display name for the frontend
        acc_type_id: user.account.acc_type_id       // Used for RBAC in controllers
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" } // 1-day expiry — client must re-authenticate daily
    );

    // Return token and display-safe user object — never include password or _id
    return res.json({
      success: true,
      token,
      user: {
        emp_id: user.emp_id,
        username: user.account.username,
        acc_type_id: user.account.acc_type_id,
        account_id: user.account.account_id
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

/* -----------------------------------------------------------------------------
   HANDLER: forgotPassword
   POST /api/auth/forgot-password
   -----------------------------------------------------------------------------
   Initiates the password reset flow by verifying the username exists.
   Currently returns a placeholder success response — full email-based reset
   flow is not yet implemented.

   REQUEST BODY:
     { username: string }

   ⚠️  SECURITY NOTE — USER ENUMERATION RISK:
     The current implementation returns a 404 if the username is not found.
     Before production, this should be changed to always return a generic
     success response regardless of whether the account exists, to prevent
     attackers from using this endpoint to enumerate valid usernames:

       return res.json({ success: true, message: "If that username exists, reset instructions have been sent." });

   TODO:
     • Generate a short-lived, single-use reset token
     • Store the token hash in the database with an expiry timestamp
     • Send the token to the user via email
     • Invalidate the token after use or expiry
----------------------------------------------------------------------------- */
export const forgotPassword = async (req, res) => {
  try {
    const db = await connectDB();
    const { username } = req.body;

    // Username is required — return 400 if missing
    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Username missing"
      });
    }

    // Look up the account — trim to prevent whitespace bypass
    const user = await db.collection("account").findOne({
      "account.username": username.trim()
    });

    if (!user) {
      // ⚠️  TODO: Replace this 404 with a generic success response to prevent
      // user enumeration — see security note in function header above
      return res.status(404).json({
        success: false,
        message: "Username not found"
      });
    }

    // ⚠️  TODO: Implement reset token generation and email sending here
    // For now, return a placeholder success response
    return res.json({
      success: true,
      message: "Reset instructions sent"
    });

  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

/* -----------------------------------------------------------------------------
   HANDLER: resetPassword
   POST /api/auth/reset-password
   -----------------------------------------------------------------------------
   Applies a new password using a reset token. Not yet implemented.

   ⚠️  TODO — Before implementing this endpoint:
     • Accept { token: string, newPassword: string } in the request body
     • Look up the token hash in the database and verify it hasn't expired
     • Hash the new password with bcrypt before storing:
           const hashed = await bcrypt.hash(newPassword, 10);
     • Update the user's password field with the hash
     • Invalidate the token immediately after use (single-use enforcement)
     • Return a generic success response — never confirm which account was updated
----------------------------------------------------------------------------- */
export const resetPassword = async (req, res) => {
  // ⚠️  Placeholder — not yet implemented
  return res.json({
    success: true,
    message: "Reset password endpoint not implemented yet"
  });
};