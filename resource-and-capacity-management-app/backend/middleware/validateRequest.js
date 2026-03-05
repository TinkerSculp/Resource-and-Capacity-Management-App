/* =============================================================================
   validateRequest.js
   -----------------------------------------------------------------------------
   PURPOSE:
     A reusable Express middleware factory that validates incoming request
     bodies against a Zod schema before the request reaches any route handler.
     Returns a structured 400 error immediately if validation fails, preventing
     invalid or malicious data from ever reaching controller logic or the database.

   WHY THIS EXISTS:
     Without this middleware, route handlers would need to manually validate
     and sanitise every field in req.body before using it — leading to
     duplicated validation logic scattered across every controller. This
     factory centralises that responsibility into a single, reusable layer.

   HOW TO USE:
     Import the middleware and wrap a Zod schema:

       import { validateRequest } from "../middleware/validateRequest.js";
       import { z } from "zod";

       const createEmployeeSchema = z.object({
         emp_id:   z.number().int().positive(),
         username: z.string().min(1).max(50),
       });

       router.post("/employees", validateRequest(createEmployeeSchema), createEmployee);

     If validation passes, req.body is replaced with the parsed (and type-safe)
     Zod output before the next handler runs. If it fails, a 400 is returned
     immediately and the controller never executes.

   SECURITY MODEL:
     • Acts as the first line of defence against malformed or malicious request
       bodies — no invalid data can reach controller logic or database queries.
     • req.body is replaced with result.data (Zod's parsed output) rather than
       the raw input. This strips any extra fields not defined in the schema,
       preventing unexpected properties from being passed to the database.
     • Zod's safeParse() is used instead of parse() so validation failures are
       handled gracefully as structured errors rather than thrown exceptions.
     • Error details are returned via result.error.flatten() which produces a
       clean, structured error object safe to send to the client — it does not
       expose internal stack traces or database details.
     • Returns 400 (Bad Request) on failure — the correct HTTP status for
       client-side input errors.

   DEPENDENCIES:
     • zod — Schema validation library (schemas are defined per-route, not here)
   ============================================================================= */

/* -----------------------------------------------------------------------------
   FUNCTION: validateRequest
   -----------------------------------------------------------------------------
   A higher-order function (middleware factory) that takes a Zod schema and
   returns an Express middleware function that validates req.body against it.

   PARAM:  schema {ZodSchema} — A Zod schema defining the expected request body shape.
   RETURN: {Function}         — An Express middleware function (req, res, next).

   SECURITY:
   • On success, req.body is replaced with Zod's parsed output — extra fields
     not in the schema are automatically stripped, preventing over-posting attacks
     where a client sends additional fields to manipulate unintended DB columns.
   • On failure, returns a 400 with structured field-level errors — never
     exposes internal server state or stack traces to the client.
----------------------------------------------------------------------------- */
export const validateRequest = (schema) => (req, res, next) => {

  // Run Zod validation against the raw request body.
  // safeParse() returns { success, data } or { success, error } — never throws.
  const result = schema.safeParse(req.body);

  if (!result.success) {
    // Validation failed — return 400 with structured field-level error details.
    // flatten() converts Zod's error format into a clean { fieldErrors, formErrors }
    // object that is safe and useful to send back to the client.
    return res.status(400).json({
      message: "Validation failed",
      errors: result.error.flatten()
    });
  }

  // Validation passed — replace req.body with Zod's parsed output.
  // This strips any extra fields not defined in the schema (over-posting protection)
  // and ensures downstream handlers receive type-safe, validated data only.
  req.body = result.data;

  // Proceed to the next middleware or route handler
  next();
};