// /* ---------------------------------------------------------
//    AUTHENTICATION: LOGIN REQUEST
//    ---------------------------------------------------------
//    • Sends user credentials to the backend for verification
//    • Returns the authenticated user + token on success
//    • Centralizes login logic for consistency and reuse
// --------------------------------------------------------- */

// import api from "./api";

// /**
//  * Attempt to authenticate a user with username + password.
//  * ---------------------------------------------------------
//  * SECURITY NOTES:
//  * • Credentials are sent over HTTPS in production (Railway).
//  * • Never store the raw password — only send it to the API.
//  * • Caller is responsible for securely storing the returned token.
//  */
// export async function login(username, password) {
//   try {
//     // POST credentials to backend auth endpoint
//     const res = await api.post("/auth/login", { username, password });

//     // Return parsed response (user object + JWT token)
//     return res.data;

//   } catch (err) {
//     // -----------------------------------------------------
//     // ERROR HANDLING
//     // -----------------------------------------------------
//     // • If backend returns a structured error, expose it
//     // • Otherwise fall back to the raw error object
//     // • Prevents UI crashes due to undefined error shapes
//     // -----------------------------------------------------
//     throw err.response?.data || err;
//   }
// }

/* ---------------------------------------------------------
   AXIOS API CLIENT (CENTRALIZED HTTP CONFIG)
   ---------------------------------------------------------
   • Creates a single Axios instance for all API requests
   • Injects authentication tokens into outbound requests
   • Ensures consistent base URL and credential handling
   • baseURL reads from NEXT_PUBLIC_API_URL in production
     and falls back to localhost:3001 in local development
--------------------------------------------------------- */

import axios from "axios";

const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api`,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;