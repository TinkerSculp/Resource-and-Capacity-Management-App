/* =============================================================================
   httpsRedirect.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Express middleware that enforces HTTPS in production by redirecting any
     incoming HTTP request to its HTTPS equivalent before it reaches any route
     handler. Applied globally in server.js before all route middleware.

   HOW IT WORKS:
     Railway (and most cloud platforms) terminate TLS at their load balancer
     and forward requests to the application over plain HTTP internally.
     The original protocol used by the client is preserved in the
     X-Forwarded-Proto header set by the load balancer. This middleware reads
     that header to determine whether the original request was HTTP or HTTPS,
     and redirects if necessary.

   SECURITY MODEL:
     • Only active in production (NODE_ENV === "production") — allows normal
       HTTP in local development without requiring a local SSL certificate.
     • Reads X-Forwarded-Proto rather than checking the raw connection
       protocol, because Railway's internal routing always uses HTTP regardless
       of what the client originally used.
     • Redirects to the same host and path with https:// prefix, preserving
       the full URL so the client lands on the correct page after redirect.
     • Prevents credentials, JWT tokens, and sensitive data from ever being
       transmitted over an unencrypted HTTP connection in production.
     • Does nothing (calls next()) if the request is already HTTPS or if the
       app is not running in production — no performance impact in development.

   DEPENDENCIES:
     • Applied in server.js as: app.use(httpsRedirect)
     • Relies on Railway setting the X-Forwarded-Proto header correctly
   ============================================================================= */

/* -----------------------------------------------------------------------------
   MIDDLEWARE: httpsRedirect
   -----------------------------------------------------------------------------
   Checks whether the original client request was made over HTTP in production
   and redirects to the HTTPS equivalent if so.

   PARAM:  req  {Request}  — Express request object. Reads host, url, and headers.
   PARAM:  res  {Response} — Express response object. Used to send the redirect.
   PARAM:  next {Function} — Express next() function. Called if no redirect needed.

   SECURITY:
   • X-Forwarded-Proto is set by Railway's load balancer — it cannot be
     spoofed by the client in a properly configured Railway deployment.
   • Uses a 302 (temporary) redirect rather than 301 (permanent) to avoid
     browsers caching the redirect and breaking local development if
     NODE_ENV is ever misconfigured.
----------------------------------------------------------------------------- */
export default function httpsRedirect(req, res, next) {

  // Only enforce HTTPS in production — allows plain HTTP in local development
  const isProduction = process.env.NODE_ENV === "production";

  // Read the original client protocol from the load balancer header.
  // Railway sets this to "http" or "https" based on how the client connected.
  const forwardedProto = req.headers["x-forwarded-proto"];

  if (isProduction && forwardedProto === "http") {
    // Redirect to the HTTPS version of the same URL, preserving host and path.
    // req.headers.host contains the domain, req.url contains the path + query string.
    return res.redirect("https://" + req.headers.host + req.url);
  }

  // Request is already HTTPS, not in production, or proto header is absent —
  // pass through to the next middleware without modification
  next();
}