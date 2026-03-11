/* =============================================================================
   HeaderWrapper.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Acts as a smart gatekeeper for the global Header component. Reads the
     current route and conditionally renders the Header only on pages where
     it is appropriate — hiding it on authentication-related pages where
     showing navigation UI would be premature or misleading.

   WHY THIS EXISTS:
     The Header is mounted in the root layout, meaning it would otherwise
     appear on every single page including /login and /reset-password. This
     wrapper intercepts that and suppresses it on auth routes, keeping the
     UI clean and preventing logged-out users from seeing navigation elements
     they cannot yet use.

   SECURITY MODEL:
     • Auth pages (/login, /forgot-password, /reset-password) are explicitly
       blocklisted — the Header will never render on these routes, preventing
       any navigation UI from being visible before a user is authenticated.
     • startsWith() matching is used intentionally: it covers any sub-routes
       under an auth path (e.g. /reset-password/confirm) without needing to
       enumerate every possible variant.
     • pathname is defensively normalised to an empty string if null or
       non-string — prevents crashes if Next.js returns an unexpected value
       during SSR or edge runtime execution.
     • This is a UI-layer guard only. It does not replace server-side route
       protection or JWT validation — those are enforced separately via the
       protect() middleware on the backend and session checks in each page.

   DEPENDENCIES:
     • usePathname  — Next.js hook for reading the current route client-side
     • Header       — Global header component rendered on authenticated pages
   ============================================================================= */

"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";

/* =============================================================================
   COMPONENT: HeaderWrapper
   ============================================================================= */
export default function HeaderWrapper() {

  /* ---------------------------------------------------------------------------
     HOOK: usePathname
     ---------------------------------------------------------------------------
     Returns the current URL pathname as a string (e.g. "/dashboard").
     Used to determine whether the current page is an auth route where
     the Header should be suppressed.

     NOTE: This hook is client-side only — the "use client" directive at the
     top of this file is required for it to work correctly in Next.js App Router.
  --------------------------------------------------------------------------- */
  const pathname = usePathname();

  /* ---------------------------------------------------------------------------
     CONSTANT: hideHeaderRoutes
     ---------------------------------------------------------------------------
     Explicit list of route prefixes on which the Header should NOT render.
     These are all authentication-related pages where:
       • The user is not yet authenticated
       • Showing navigation UI would be confusing or premature
       • Exposing the profile/dashboard links could mislead the user

     SECURITY NOTE:
     • startsWith() is used so that any sub-paths under these routes
       (e.g. /reset-password/abc123token) are also covered automatically.
     • New auth routes should be added here as the app grows to ensure
       they are also protected from premature header rendering.
  --------------------------------------------------------------------------- */
  const hideHeaderRoutes = [
    "/login",           // Main login page
    "/forgot-password", // Password reset request page
    "/reset-password",  // Password reset confirmation page (covers sub-paths)
    "/admin",           //Admin page
  ];

  /* ---------------------------------------------------------------------------
     SAFETY: Normalise pathname
     ---------------------------------------------------------------------------
     usePathname() should always return a string in normal usage, but we
     defensively guard against null or unexpected types here. If pathname is
     not a valid string, we fall back to an empty string so that startsWith()
     calls below never throw a TypeError.

     This is especially important during SSR or edge runtime where Next.js
     internals may behave differently than in standard client rendering.
  --------------------------------------------------------------------------- */
  const safePath = typeof pathname === "string" ? pathname : "";

  /* ---------------------------------------------------------------------------
     LOGIC: Determine whether to hide the Header
     ---------------------------------------------------------------------------
     Returns true if the current path starts with any of the blocked routes.
     Uses Array.some() to short-circuit as soon as the first match is found,
     keeping this check efficient even as the blocklist grows.
  --------------------------------------------------------------------------- */
  const shouldHideHeader = hideHeaderRoutes.some((route) =>
    safePath.startsWith(route)
  );

  /* ===========================================================================
     RENDER
     ===========================================================================
     Renders the global Header component on all non-auth pages.
     Returns null on auth pages — no wrapper div or placeholder is rendered,
     so the layout collapses cleanly with no extra spacing or DOM nodes.
  =========================================================================== */
  return !shouldHideHeader ? <Header /> : null;
}
