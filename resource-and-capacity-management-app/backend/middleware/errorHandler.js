/* =============================================================================
   errorHandler.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Centralised Express error handling middleware. Catches all errors thrown
     or passed to next(err) anywhere in the application and returns a
     consistent, safe JSON error response to the client.

     Must be registered LAST in server.js — Express identifies error-handling
     middleware by its four-argument signature (err, req, res, next) and only
     invokes it when an error has been thrown or forwarded via next(err).

   HOW ERRORS REACH HERE:
     • Synchronous throws in route handlers are caught automatically by Express
     • Async errors are forwarded via asyncHandler which calls next(err)
     • Manually thrown errors: next(new Error("Something failed"))
     • Errors with custom status codes:
         const err = new Error("Not found");
         err.statusCode = 404;
         next(err);

   SECURITY MODEL:
     • Stack traces are only included in the response in development mode
       (NODE_ENV === "development"). In production, the stack field is omitted
       entirely — stack traces can reveal internal file paths, library versions,
       and code structure that would aid an attacker.
     • err.message is returned to the client — controllers should only throw
       errors with safe, user-facing messages. Internal database errors or
       sensitive system messages must be caught and wrapped before reaching
       this handler.
     • Falls back to a generic "Server error" message if err.message is not
       set, preventing undefined or null values from reaching the response.
     • Falls back to HTTP 500 if err.statusCode is not set, ensuring all
       unhandled errors return a valid HTTP status code.
     • The full error is logged server-side via console.error for debugging
       and monitoring — the full detail stays on the server, not in the
       client response.

   DEPENDENCIES:
     • Used in server.js as: app.use(errorHandler)
     • Works in conjunction with asyncHandler to catch async route errors
   ============================================================================= */

/* -----------------------------------------------------------------------------
   MIDDLEWARE: errorHandler
   -----------------------------------------------------------------------------
   Four-argument Express error handling middleware. The fourth argument (next)
   must be present in the signature even if unused — Express uses the arity
   of the function to identify it as an error handler.

   PARAM:  err  {Error}    — The error object thrown or passed to next(err).
   PARAM:  req  {Request}  — Express request object (unused but required).
   PARAM:  res  {Response} — Express response object. Used to send the error response.
   PARAM:  next {Function} — Express next() function (unused but required by Express).

   SECURITY:
   • Stack trace is conditionally included — development only, never production.
   • err.message should contain only safe, user-facing text — controllers are
     responsible for ensuring sensitive system details are not propagated here.
----------------------------------------------------------------------------- */
export const errorHandler = (err, req, res, next) => {

  // Log the full error server-side for debugging and monitoring.
  // Full detail (including stack trace) is intentionally kept server-side only
  // and never included in the client response in production.
  console.error("Error:", err);

  // Use the error's custom status code if set, otherwise default to 500.
  // Controllers can attach a statusCode to errors for semantic HTTP responses
  // (e.g. 400 Bad Request, 401 Unauthorized, 404 Not Found).
  const status = err.statusCode || 500;

  res.status(status).json({
    // Return the error message if available, or a safe generic fallback.
    // Controllers must ensure err.message contains only safe, client-facing text.
    message: err.message || "Server error",

    // Stack trace included in development for debugging convenience.
    // Explicitly set to undefined in production so the field is omitted from
    // the JSON response entirely — prevents leaking internal code structure.
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
};