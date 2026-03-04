/* =============================================================================
   asyncHandler.js
   -----------------------------------------------------------------------------
   PURPOSE:
     A higher-order utility function that wraps async Express route handlers
     and automatically forwards any unhandled promise rejections to Express's
     next() error pipeline.

   WHY THIS EXISTS:
     Express does not natively catch errors thrown inside async route handlers.
     Without this wrapper, an unhandled promise rejection in a route would
     silently hang the request or crash the process rather than returning a
     clean error response.

     Instead of wrapping every route in a try/catch manually:

       app.get('/example', async (req, res, next) => {
         try {
           const data = await someAsyncOperation();
           res.json(data);
         } catch (err) {
           next(err); // Must be remembered on every single route
         }
       });

     This utility reduces that to a single clean wrapper:

       app.get('/example', asyncHandler(async (req, res) => {
         const data = await someAsyncOperation();
         res.json(data);
       }));

   SECURITY:
     • Ensures no async error is ever silently swallowed — all rejections
       are forwarded to the centralised errorHandler in /middleware/errorHandler.js
       which formats and returns a consistent, safe error response.
     • Prevents unhandled promise rejections from crashing the Node.js process
       in production, which would cause downtime.
     • By centralising error forwarding here, individual route handlers never
       need to remember to call next(err) — reducing the risk of a developer
       accidentally omitting error handling on a sensitive route.
   ============================================================================= */

/* -----------------------------------------------------------------------------
   FUNCTION: asyncHandler
   -----------------------------------------------------------------------------
   Wraps an async Express route handler function and returns a new function
   that catches any rejection and passes it to Express's next() middleware.

   PARAM:  fn   {Function} — An async Express route handler (req, res, next)
   RETURN: {Function}      — A wrapped handler that forwards errors to next()

   HOW IT WORKS:
     Promise.resolve() normalises the return value of fn() so this works
     correctly whether fn is async (returns a Promise) or synchronous
     (returns a plain value) — making the wrapper safe to use on any handler.
----------------------------------------------------------------------------- */
export const asyncHandler = (fn) => (req, res, next) => {
  // Execute the route handler and catch any rejection, forwarding it to
  // Express's error handling middleware via next(err)
  Promise.resolve(fn(req, res, next)).catch(next);
};