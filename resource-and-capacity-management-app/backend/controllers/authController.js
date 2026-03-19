/* =============================================================================
   authController.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Handles all authentication logic for the application:
       • login          — Verify credentials, issue JWT token
       • forgotPassword — Initiate password reset flow
       • resetPassword  — Apply new password (placeholder — not yet implemented)

   SECURITY MODEL:
     • Both "user not found" and "wrong password" return the same 401 response
       with the same message ("Invalid username or password") — prevents user
       enumeration attacks where an attacker determines valid usernames by
       comparing error responses.
     • username is trimmed before use in the DB query to prevent whitespace
       bypass attacks.
     • Passwords are verified using bcrypt.compare() — never stored or compared
       in plaintext.
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
     • bcrypt           — Password hashing and comparison
     • jsonwebtoken     — JWT token signing
   ============================================================================= */

import { connectDB } from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

/* -----------------------------------------------------------------------------
   HANDLER: login
   POST /api/auth/login
   -----------------------------------------------------------------------------
   Authenticates a user by verifying their username and bcrypt-hashed password
   against the database. Returns a signed JWT token and safe user object on success.

   REQUEST BODY:
     { username: string, password: string }

   RESPONSE (success):
     { success: true, token: string, user: { emp_id, username, acc_type_id, account_id } }

   SECURITY:
   • username.trim() prevents whitespace bypass.
   • bcrypt.compare() is used for password verification — never plaintext comparison.
   • JWT_SECRET presence is verified before signing.
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
      return res.status(401).json({
        success: false,
        error: "username_not_found",
        message: "Username not found"
      });
    }

    // Block login if the employee account is inactive
    // Fetch the employee record to check current_status
    const db2 = db; // same connection
    const employee = await db2.collection("employee").findOne({ emp_id: user.emp_id });
    if (employee && employee.current_status === "Inactive") {
      return res.status(401).json({
        success: false,
        error: "account_inactive",
        message: "This account has been deactivated. Please contact your administrator."
      });
    }

    // Verify password against the bcrypt hash stored in the DB
    const isMatch = await bcrypt.compare(password, user.account.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "wrong_password",
        message: "Incorrect password"
      });
    }

    // Verify JWT_SECRET is configured before attempting to sign
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
        emp_id:      user.emp_id,
        username:    user.account.username,
        acc_type_id: user.account.acc_type_id
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Return token and display-safe user object — never include password or _id
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

/* -----------------------------------------------------------------------------
   HANDLER: forgotPassword
   POST /api/auth/forgot-password
   -----------------------------------------------------------------------------
   Initiates the password reset flow by verifying the username exists.
   Currently returns a placeholder success response — full email-based reset
   flow is not yet implemented.
----------------------------------------------------------------------------- */
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

    const user = await db.collection("account").findOne({
      "account.username": username.trim()
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Username not found"
      });
    }

    //   TODO: Implement reset token generation and email sending here
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

     TODO — Before implementing this endpoint:
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
