"use client";

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
     appear on every page including /login and /reset-password. This wrapper
     suppresses it on auth routes, keeping the UI clean and preventing
     logged-out users from seeing navigation elements they cannot yet use.

   ROUTE MATCHING STRATEGY:
     startsWith() is used intentionally rather than exact equality — it covers
     any sub-paths under an auth prefix (e.g. /reset-password/abc123token)
     without needing to enumerate every possible variant. New auth routes
     should be added to hideHeaderRoutes as the app grows.

   SECURITY MODEL:
     • Auth pages are explicitly blocklisted — the Header never renders on
       these routes, preventing navigation UI from being visible before
       a user is authenticated.
     • This is a UI-layer guard only — it does not replace server-side route
       protection or JWT validation. Those are enforced separately via the
       protect() middleware on the backend and session checks in each page.
     • pathname is defensively normalised to "" if null or non-string —
       prevents crashes if Next.js returns an unexpected value during SSR
       or edge runtime execution.

   DEPENDENCIES:
     • usePathname — Next.js hook for reading the current route client-side
     • Header      — Global header component rendered on authenticated pages
   ============================================================================= */

import { usePathname } from "next/navigation";
import Header from "./Header";

/* =============================================================================
   COMPONENT: HeaderWrapper
   ============================================================================= */
export default function HeaderWrapper() {

  /* ---------------------------------------------------------------------------
     HOOK: usePathname
     Returns the current URL pathname as a string (e.g. "/dashboard").
     Requires "use client" — this hook is client-side only in Next.js App Router.
  --------------------------------------------------------------------------- */
  const pathname = usePathname();

  /* ---------------------------------------------------------------------------
     CONSTANT: hideHeaderRoutes
     ---------------------------------------------------------------------------
     Route prefixes on which the Header should NOT render. All are auth-related
     pages where the user is not yet authenticated and navigation would be
     confusing or premature.

     startsWith() covers sub-paths automatically — add new auth routes here
     as the app grows.
  --------------------------------------------------------------------------- */
  const hideHeaderRoutes = [
    "/login",           // Main login page
    "/forgot-password", // Password reset request page
    "/reset-password",  // Reset confirmation page — startsWith covers sub-paths
    "/admin",           // Admin page
  ];

  /* ---------------------------------------------------------------------------
     SAFETY: Normalise pathname
     Defensively guard against null or non-string — prevents TypeError from
     startsWith() during SSR or edge runtime where pathname may be unexpected.
  --------------------------------------------------------------------------- */
  const safePath = typeof pathname === "string" ? pathname : "";

  /* ---------------------------------------------------------------------------
     LOGIC: Determine whether to suppress the Header
     Array.some() short-circuits on the first match — efficient as the
     blocklist grows.
  --------------------------------------------------------------------------- */
  const shouldHideHeader = hideHeaderRoutes.some(route => safePath.startsWith(route));

  /* ===========================================================================
     RENDER
     Returns null on auth pages — no wrapper div or placeholder, so the layout
     collapses cleanly with no extra spacing or DOM nodes.
  =========================================================================== */
  return !shouldHideHeader ? <Header /> : null;
}
