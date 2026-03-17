/* ---------------------------------------------------------
   NEXT.JS CONFIGURATION (HARDENED + DOCUMENTED)
   ---------------------------------------------------------
   • Enables React Compiler for improved performance + safety
   • Injects strict security headers on every route
   • Mitigates clickjacking, MIME sniffing, and data leakage
   • Restricts browser APIs to reduce attack surface
--------------------------------------------------------- */

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* -------------------------------------------------------
     REACT COMPILER
     -------------------------------------------------------
     • Enables Next.js React Compiler for optimized rendering
     • Helps catch unsafe patterns during build
     • Improves performance without changing runtime behavior
  ------------------------------------------------------- */
  reactCompiler: true,

  experimental: {
  missingSuspenseWithCSRBailout: false,
},
devIndicators: {
  buildActivity: false,
},

  /* -------------------------------------------------------
     SECURITY HEADERS (APPLIED TO ALL ROUTES)
     -------------------------------------------------------
     • Protects against common web vulnerabilities
     • Ensures consistent security posture across the app
     • Runs server-side → cannot be bypassed by client code
  ------------------------------------------------------- */
  async headers() {
    return [
      {
        // Apply to every route in the application
        source: "/(.*)",

        headers: [
          /* ---------------------------------------------
             CLICKJACKING PROTECTION
             ---------------------------------------------
             • Prevents the site from being embedded in iframes
             • Blocks UI redress attacks
          --------------------------------------------- */
          { key: "X-Frame-Options", value: "DENY" },

          /* ---------------------------------------------
             MIME SNIFFING PROTECTION
             ---------------------------------------------
             • Forces browsers to respect declared Content-Type
             • Prevents malicious file interpretation
          --------------------------------------------- */
          { key: "X-Content-Type-Options", value: "nosniff" },

          /* ---------------------------------------------
             REFERRER POLICY
             ---------------------------------------------
             • Limits what information is sent in the Referer header
             • Protects user privacy when navigating off-site
          --------------------------------------------- */
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

          /* ---------------------------------------------
             PERMISSIONS POLICY (FORMERLY FEATURE POLICY)
             ---------------------------------------------
             • Explicitly disables sensitive browser APIs
             • Reduces attack surface for XSS and supply-chain attacks
             • Prevents unauthorized access to:
                 - Camera
                 - Microphone
                 - Geolocation
          --------------------------------------------- */
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;