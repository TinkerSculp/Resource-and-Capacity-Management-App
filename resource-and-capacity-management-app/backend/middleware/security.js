/* =============================================================================
   security.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Express middleware that attaches a set of security-focused HTTP response
     headers to every outgoing response. Applied globally in server.js before
     all route handlers so every API response is covered regardless of which
     route is hit.

   WHY RESPONSE HEADERS MATTER:
     Security headers instruct the browser on how to handle the response,
     restricting behaviours that could be exploited by attackers even if the
     application code itself is correct. They are a standard layer of defence
     against common web vulnerabilities.

   HEADERS APPLIED:
     • X-Frame-Options          — Blocks clickjacking attacks
     • X-Content-Type-Options   — Blocks MIME sniffing attacks
     • Referrer-Policy          — Limits referrer data sent to third parties
     • Permissions-Policy       — Disables sensitive browser APIs

   SECURITY MODEL:
     • Applied before all routes in server.js — no response can bypass these
       headers regardless of which endpoint is called.
     • Headers are set on the response object directly using setHeader(),
       which overwrites any previously set value for the same header, ensuring
       these values cannot be overridden by earlier middleware.
     • These headers complement the security headers already set in next.config.js
       on the frontend — both layers apply to their respective response surfaces.

   DEPENDENCIES:
     • Applied in server.js as: app.use(securityHeaders)
   ============================================================================= */

/* -----------------------------------------------------------------------------
   MIDDLEWARE: securityHeaders
   -----------------------------------------------------------------------------
   Sets security HTTP headers on every outgoing response.

   PARAM:  req  {Request}  — Express request object (unused but required).
   PARAM:  res  {Response} — Express response object. Headers are set here.
   PARAM:  next {Function} — Express next() function. Called after headers are set.
----------------------------------------------------------------------------- */
export default function securityHeaders(req, res, next) {

  /* ---------------------------------------------------------------------------
     X-Frame-Options: DENY
     ---------------------------------------------------------------------------
     Prevents this page from being embedded in an <iframe>, <frame>, or
     <object> on any other origin. Blocks clickjacking attacks where an
     attacker overlays a transparent iframe over a legitimate page to trick
     users into clicking hidden buttons or links.
  --------------------------------------------------------------------------- */
  res.setHeader("X-Frame-Options", "DENY");

  /* ---------------------------------------------------------------------------
     X-Content-Type-Options: nosniff
     ---------------------------------------------------------------------------
     Prevents the browser from MIME-sniffing a response away from the
     declared Content-Type. Without this, a browser might interpret a text
     file as executable JavaScript if it contains script-like content,
     enabling content injection attacks.
  --------------------------------------------------------------------------- */
  res.setHeader("X-Content-Type-Options", "nosniff");

  /* ---------------------------------------------------------------------------
     Referrer-Policy: strict-origin-when-cross-origin
     ---------------------------------------------------------------------------
     Controls how much referrer information is included when the user
     navigates away from this app:
       • Same-origin requests: full URL is sent as referrer
       • Cross-origin HTTPS → HTTPS: only the origin (no path) is sent
       • Cross-origin HTTPS → HTTP: no referrer is sent at all
     Prevents sensitive URL paths (e.g. /reset-password/token123) from
     leaking to third-party services via the Referer header.
  --------------------------------------------------------------------------- */
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  /* ---------------------------------------------------------------------------
     Permissions-Policy: camera=(), microphone=(), geolocation=()
     ---------------------------------------------------------------------------
     Explicitly disables access to sensitive browser hardware APIs for this
     origin. Empty parentheses mean the feature is blocked entirely — not
     even the page itself can request access.
       • camera=()      — No access to device camera
       • microphone=()  — No access to device microphone
       • geolocation=() — No access to device location
     Reduces the attack surface for XSS and malicious third-party scripts
     that might attempt to access these APIs if they were left unrestricted.
  --------------------------------------------------------------------------- */
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // All headers set — pass the request to the next middleware or route handler
  next();
}