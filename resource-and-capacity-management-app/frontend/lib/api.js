/* =============================================================================
   api.js  (src/lib/api.js)
   -----------------------------------------------------------------------------
   PURPOSE:
     Creates and exports a single shared Axios instance used for every API
     request in the frontend. Centralising this here means:
       • The backend base URL is configured in one place — changing it only
         requires updating the NEXT_PUBLIC_API_URL environment variable
       • JWT token injection happens automatically on every outgoing request —
         no handler needs to manually attach the Authorization header
       • withCredentials is set consistently — cookies are sent with every
         request without needing to set it per-call

   HOW IT WORKS:
     1. An Axios instance is created with the backend base URL and credentials
     2. A request interceptor reads the JWT from localStorage and attaches it
        to the Authorization header of every outgoing request
     3. The instance is exported as the default export — imported as `api`
        throughout the app and used like: api.get(), api.post(), etc.

   ENVIRONMENT VARIABLE:
     NEXT_PUBLIC_API_URL — Set in .env.local for development and in the Railway
     frontend service env vars for production. Must include the full origin
     (e.g. https://your-backend.railway.app). Falls back to localhost:3001 for
     local development if the variable is not set.

   SECURITY MODEL:
     • The JWT token is read from localStorage on every request — if the token
       is cleared (e.g. on logout or session expiry), subsequent requests will
       be sent without an Authorization header and the backend will return 401.
     • Tokens are sent as Bearer tokens in the Authorization header — not in
       the URL or as a cookie, which aligns with the backend's JWT middleware.
     • withCredentials: true allows cookies to be sent cross-origin if the
       backend uses cookie-based auth in the future — no downside to enabling it.
     • The base URL is loaded from an environment variable — never hardcoded.

   USAGE:
     import api from "@/lib/api";
     const res = await api.get("/resources/employees");
     const res = await api.post("/initiatives", payload);

   DEPENDENCIES:
     • axios — HTTP client
   ============================================================================= */

import axios from "axios";

/* =============================================================================
   AXIOS INSTANCE
   -----------------------------------------------------------------------------
   baseURL is constructed from NEXT_PUBLIC_API_URL with the /api suffix so
   all api.get("/path") calls automatically resolve to the correct backend
   endpoint without needing to include /api in every call site.

   The localhost:3001 fallback ensures local development works even if
   NEXT_PUBLIC_API_URL is not set in .env.local.
   ============================================================================= */
const api = axios.create({
  baseURL:         `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}`,
  withCredentials: true, // Send cookies cross-origin — required if backend uses cookie auth
});

/* =============================================================================
   REQUEST INTERCEPTOR — JWT TOKEN INJECTION
   -----------------------------------------------------------------------------
   Runs before every outgoing request. Reads the JWT from localStorage and
   attaches it as a Bearer token in the Authorization header.

   WHY AN INTERCEPTOR INSTEAD OF PER-CALL HEADERS:
     Without this interceptor, every api.get() / api.post() call would need
     to manually retrieve the token and set the header. The interceptor handles
     this in one place — handlers stay clean and token logic is never duplicated.

   EDGE CASES:
     • If localStorage is empty (logged out, session cleared), no Authorization
       header is attached — the backend will return 401 as expected.
     • localStorage is only available in the browser — this runs client-side
       only, which is correct for a Next.js app using 'use client' components.
   ============================================================================= */
api.interceptors.request.use((config) => {
  // Read the JWT token stored by the login handler — null if not logged in
  const token = localStorage.getItem("token");

  if (token) {
    // Attach as Bearer token — matches the format the backend's protect middleware expects
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Must return config — without this the interceptor would block all requests
  return config;
});

export default api;
