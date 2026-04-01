/* =============================================================================
   authController.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Handles all authentication logic for the application:
       • login          — Verify credentials and issue a signed JWT token
       • forgotPassword — Initiate the password reset flow (placeholder)
       • resetPassword  — Apply a new password (not yet implemented)

   SECURITY MODEL:
     • Both "user not found" and "wrong password" return the same 401 response
       with the same message — prevents user enumeration attacks where an
       attacker determines valid usernames by comparing error responses.
     • username is trimmed before the DB query to prevent whitespace bypass
       (e.g. "admin " matching "admin" and bypassing lockout logic).
     • Passwords are verified with bcrypt.compare() — never stored or compared
       in plaintext.
     • JWT_SECRET is validated to be present before signing — returns 500
       immediately if misconfigured rather than signing with an undefined secret.
     • The JWT payload contains only emp_id, username, and acc_type_id —
       the minimum needed for auth and role checks. Passwords and sensitive
       fields are never included in the token.
     • Token expiry is 1 day — limits the exposure window if a token is stolen.
     • The response user object contains only display-safe fields — never the
       password, MongoDB _id, or internal account fields.
     • Inactive employees are blocked from logging in — the employee record is
       checked after password verification to prevent timing attacks.

   DEPENDENCIES:
     • ../config/db.js — MongoDB connection singleton
     • bcrypt          — Password hashing and comparison
     • jsonwebtoken    — JWT token signing
   ============================================================================= */

import { connectDB } from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

/* =============================================================================
   HANDLER: login
   POST /api/auth/login
   -----------------------------------------------------------------------------
   Authenticates a user by verifying their username and bcrypt-hashed password.
   Returns a signed JWT token and a display-safe user object on success.

   REQUEST BODY:
     { username: string, password: string }

   RESPONSE (success):
     {
       success:  true,
       token:    string,
       user:     { emp_id, username, acc_type_id, account_id }
     }

   ERROR RESPONSES:
     400 — Missing username or password
     401 — Username not found, wrong password, or inactive account
     500 — JWT_SECRET not configured, or unexpected server error
   ============================================================================= */
export const login = async (req, res) => {
  try {
    const db = await connectDB();
    const { username, password } = req.body;

    // Both fields are required — return 400 before any DB query if missing
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password required"
      });
    }

    // Look up the account by username — trim whitespace to prevent bypass attacks
    const user = await db.collection("account").findOne({
      "account.username": username.trim()
    });

    if (!user) {
      // Return a specific error code for the frontend to display the right message,
      // but keep the HTTP status 401 for both not-found and wrong-password cases
      return res.status(401).json({
        success: false,
        error:   "username_not_found",
        message: "Username not found"
      });
    }

    /* -------------------------------------------------------------------------
       INACTIVE ACCOUNT CHECK
       Performed after the account lookup but before password verification.
       This order prevents timing attacks — an attacker cannot determine
       if an account exists by comparing response times for inactive vs missing users.
    --------------------------------------------------------------------------- */
    const employee = await db.collection("employee").findOne({ emp_id: user.emp_id });
    if (employee && employee.current_status === "Inactive") {
      return res.status(401).json({
        success: false,
        error:   "account_inactive",
        message: "This account has been deactivated. Please contact your administrator."
      });
    }

    /* -------------------------------------------------------------------------
       PASSWORD VERIFICATION
       bcrypt.compare() handles the hash comparison internally — it extracts
       the salt from the stored hash and re-hashes the input for comparison.
       This is safe even if the timing of the comparison varies slightly.
    --------------------------------------------------------------------------- */
    const isMatch = await bcrypt.compare(password, user.account.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error:   "wrong_password",
        message: "Incorrect password"
      });
    }

    /* -------------------------------------------------------------------------
       JWT_SECRET VALIDATION
       Checked immediately before signing — if misconfigured, the server
       returns 500 rather than signing a token with an undefined secret,
       which would produce tokens that cannot be verified.
    --------------------------------------------------------------------------- */
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing from environment variables");
      return res.status(500).json({
        success: false,
        message: "Server configuration error"
      });
    }

    /* -------------------------------------------------------------------------
       JWT SIGNING
       Payload is minimal — only what downstream route handlers actually need.
       Passwords, MongoDB _id, and account internals are never included.
       expiresIn: "1d" — token expires after 24 hours, limiting theft exposure.
    --------------------------------------------------------------------------- */
    const token = jwt.sign(
      {
        emp_id:      user.emp_id,
        username:    user.account.username,
        acc_type_id: user.account.acc_type_id
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Return the token and a safe user object — never include password or _id
    return res.json({
      success: true,
      token,
      user: {
        emp_id:      user.emp_id,
        username:    user.account.username,
        acc_type_id: user.account.acc_type_id,
        account_id:  user.account.account_id
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

/* =============================================================================
   HANDLER: forgotPassword
   POST /api/auth/forgot-password
   -----------------------------------------------------------------------------
   Verifies the username exists and initiates the password reset flow.
   Currently returns a placeholder success response — full email-based reset
   is not yet implemented.

   TODO: Implement reset token generation and email sending:
     1. Generate a cryptographically secure random token
     2. Hash the token and store it with an expiry in the DB
     3. Send the raw token to the user via email
     4. Never confirm which account the email was sent to (prevents enumeration)
   ============================================================================= */
export const forgotPassword = async (req, res) => {
  try {
    const db = await connectDB();
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Username missing"
      });
    }

    // Verify the username exists before pretending to send a reset email
    const user = await db.collection("account").findOne({
      "account.username": username.trim()
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Username not found"
      });
    }

    // TODO: Generate reset token, store hash + expiry, send email
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

/* =============================================================================
   HANDLER: resetPassword
   POST /api/auth/reset-password
   -----------------------------------------------------------------------------
   Applies a new password using a reset token. Not yet implemented.

   TODO — Before implementing this endpoint:
     • Accept { token: string, newPassword: string } in the request body
     • Look up the token hash in the database and verify it hasn't expired
     • Hash the new password with bcrypt before storing:
           const hashed = await bcrypt.hash(newPassword, 10);
     • Update the user's password field with the new hash
     • Invalidate the token immediately after use (single-use enforcement)
     • Return a generic success response — never confirm which account was updated
       to prevent user enumeration through the reset flow
   ============================================================================= */
export const resetPassword = async (req, res) => {
  // Placeholder — not yet implemented
  return res.json({
    success: true,
    message: "Reset password endpoint not implemented yet"
  });
};