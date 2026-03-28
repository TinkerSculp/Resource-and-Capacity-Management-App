/* =============================================================================
   next.config.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Next.js configuration file for the Resource & Capacity Management Planner
     frontend. Configures:
       • React Compiler — improved rendering performance and build-time safety
       • Security headers — applied to every route server-side
       • Dev indicators  — suppressed to keep the dev environment clean
       • Suspense CSR bailout — disabled to prevent false positive warnings

   SECURITY HEADERS STRATEGY:
     Headers are injected at the Next.js server level via the headers() function.
     This means they are applied before any page code runs and cannot be
     bypassed by client-side JavaScript. They cover four common attack vectors:
       • Clickjacking   — X-Frame-Options prevents embedding in iframes
       • MIME sniffing  — X-Content-Type-Options prevents content-type spoofing
       • Referrer leaks — Referrer-Policy limits what is sent to third parties
       • Browser APIs   — Permissions-Policy disables camera, mic, geolocation

     NOTE: Content-Security-Policy (CSP) is handled separately in the Express
     backend's security.js middleware, which gives more granular control over
     API responses and keeps CSP configuration co-located with other security
     middleware.

   EXPERIMENTAL OPTIONS:
     • reactCompiler — Enables the Next.js React Compiler integration. Optimises
       rendering by automatically memoising components without manual useMemo/
       useCallback calls. Also catches unsafe patterns at build time.
     • missingSuspenseWithCSRBailout: false — Suppresses a Next.js warning that
       fires when Client Side Rendered content is not wrapped in a Suspense
       boundary. This is intentional — our loading states are handled manually
       per-component rather than via Suspense boundaries.

   DEPENDENCIES:
     • next — Next.js framework (reads this file at build and dev startup)
   ============================================================================= */

/** @type {import('next').NextConfig} */
const nextConfig = {

  /* ---------------------------------------------------------------------------
     REACT COMPILER
     ---------------------------------------------------------------------------
     Enables the experimental Next.js React Compiler integration.

     BENEFITS:
     • Automatic memoisation — equivalent to wrapping every component in
       React.memo and every value in useMemo/useCallback, without the boilerplate
     • Build-time safety checks — flags unsafe patterns (e.g. mutating props)
       during compilation rather than at runtime
     • No runtime behaviour changes — purely a compile-time optimisation
  --------------------------------------------------------------------------- */
  reactCompiler: true,

  /* ---------------------------------------------------------------------------
     EXPERIMENTAL OPTIONS
  --------------------------------------------------------------------------- */
  experimental: {
    // Suppress the CSR bailout warning — our components handle loading states
    // manually per-component rather than using Suspense boundaries
    missingSuspenseWithCSRBailout: false,
  },

  /* ---------------------------------------------------------------------------
     DEV INDICATORS
     Disable the build activity spinner in the bottom-right corner during
     development — reduces visual noise when working in the browser.
  --------------------------------------------------------------------------- */
  devIndicators: {
    buildActivity: false,
  },

  /* ---------------------------------------------------------------------------
     SECURITY HEADERS
     ---------------------------------------------------------------------------
     Applied to every route via source: "/(.*)" — no page is excluded.
     Headers are set server-side so they cannot be removed or bypassed by
     client-side code, browser extensions, or JavaScript injection.

     RETURNS: Array of { source, headers } objects — one entry covers all routes.
  --------------------------------------------------------------------------- */
  async headers() {
    return [
      {
        source: "/(.*)", // Matches every route in the application

        headers: [

          /* -----------------------------------------------------------------
             X-Frame-Options: DENY
             -----------------------------------------------------------------
             Prevents this site from being embedded in an <iframe> on any
             other origin. Blocks clickjacking attacks where an attacker
             overlays a transparent iframe on a legitimate page to trick users
             into clicking UI elements they cannot see.

             DENY is stricter than SAMEORIGIN — no embedding is permitted,
             even from the same domain.
          ----------------------------------------------------------------- */
          { key: "X-Frame-Options", value: "DENY" },

          /* -----------------------------------------------------------------
             X-Content-Type-Options: nosniff
             -----------------------------------------------------------------
             Instructs the browser to respect the declared Content-Type header
             and never try to "sniff" or guess the content type of a response.

             Without this, a browser might execute a JavaScript file served
             as text/plain, or treat an uploaded image as HTML — both of which
             can lead to XSS vulnerabilities.
          ----------------------------------------------------------------- */
          { key: "X-Content-Type-Options", value: "nosniff" },

          /* -----------------------------------------------------------------
             Referrer-Policy: strict-origin-when-cross-origin
             -----------------------------------------------------------------
             Controls what is included in the Referer header when the user
             navigates from this site to another.

             "strict-origin-when-cross-origin" means:
               • Same-origin requests: full URL is sent (path + query)
               • Cross-origin requests: only the origin is sent (no path)
               • Downgrade (HTTPS → HTTP): no Referer header is sent at all

             This prevents sensitive URL parameters (e.g. search terms,
             internal IDs) from leaking to third-party analytics or ad networks.
          ----------------------------------------------------------------- */
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

          /* -----------------------------------------------------------------
             Permissions-Policy
             -----------------------------------------------------------------
             Explicitly disables browser APIs that this application does not
             use. Even if a future XSS vulnerability or compromised dependency
             attempts to access these APIs, the browser will block the request.

             camera=()      — No access to the device camera
             microphone=()  — No access to the microphone
             geolocation=() — No access to GPS or location data
          ----------------------------------------------------------------- */
          {
            key:   "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },

        ],
      },
    ];
  },
};

export default nextConfig;