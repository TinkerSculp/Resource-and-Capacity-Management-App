/* =============================================================================
   profileRoutes.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Defines the API route for fetching a user's profile data. Mounted in
     server.js under /api/profile, so the full endpoint is:

       GET /api/profile?username=<username>

   SECURITY MODEL:
     • This route should be protected by JWT authentication middleware to
       ensure only authenticated users can fetch profile data.
     • The username is passed as a query parameter — the controller is
       responsible for validating its presence and sanitising it before
       using it in any database query.
     • The controller must ensure users can only fetch their own profile
       unless the requesting user has an elevated role (e.g. Resource Manager),
       preventing horizontal privilege escalation where one user fetches
       another user's data by guessing their username.
     • The response must never include sensitive fields such as the password
       hash — the controller must explicitly select only safe fields to return.
     • This is a read-only endpoint — no writes or mutations are permitted.

   DEPENDENCIES:
     • express            — Router instance
     • profileController  — Profile fetch handler
   ============================================================================= */

import express from "express";
import {
  getProfile // GET / — Fetch a user's profile by username query parameter
} from "../controllers/profileController.js";

const router = express.Router();

/* -----------------------------------------------------------------------------
   GET /api/profile?username=<username>
   -----------------------------------------------------------------------------
   Returns the profile data for the user matching the provided username
   query parameter. Used by the Profile page to display user details.

   SECURITY:
   • Requires a valid JWT token — unauthenticated requests must be rejected.
   • Controller must validate that the username query param is present and
     non-empty before querying the database.
   • Controller must ensure the requesting user is only able to access their
     own profile, or enforce role-based access for elevated users.
   • Response must exclude sensitive fields (password, tokens, internal IDs)
     — only display-safe profile fields should be returned.
----------------------------------------------------------------------------- */
router.get("/", getProfile);

export default router;