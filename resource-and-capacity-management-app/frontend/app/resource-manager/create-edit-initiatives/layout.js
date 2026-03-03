/**
 * ---------------------------------------------------------------------------
 * LAYOUT: create-edit-initiatives
 * ---------------------------------------------------------------------------
 * PURPOSE:
 * This layout manages the parallel route structure for the Initiatives module.
 *
 * Next.js 13+ supports "parallel routes", allowing multiple UI segments to
 * render simultaneously. This layout defines:
 *
 *   • children → The main Initiatives page (always mounted)
 *   • modal    → The @modal parallel route slot (conditionally mounted)
 *
 * BEHAVIOR:
 * When a modal route is active (e.g., Add Initiative, Edit Initiative),
 * Next.js injects the modal component into the `modal` prop while keeping
 * the main page rendered underneath. This enables:
 *
 *   • Non-destructive navigation (page state is preserved)
 *   • Smooth modal overlays without full page transitions
 *   • Predictable z-index and scroll behavior
 *
 * DESIGN PRINCIPLES:
 *   • No wrappers or layout containers are added here.
 *   • Keeps modal rendering isolated and predictable.
 *   • Avoids interfering with:
 *       - stacking context
 *       - pointer events
 *       - scroll locking
 *
 * SECURITY:
 *   • This file contains **no business logic** and **no data access**.
 *   • It does not read from localStorage, cookies, or API routes.
 *   • It does not expose or manipulate authentication state.
 *   • All security enforcement (JWT, RBAC, route protection) occurs in:
 *       - API route handlers
 *       - server middleware
 *       - protected client components
 *
 *   • Because this layout simply returns UI segments, it cannot leak:
 *       - tokens
 *       - user identity
 *       - backend data
 *       - privileged state
 *
 * MAINTAINABILITY:
 *   • This layout should remain minimal.
 *   • Any UI logic belongs in the modal/page components themselves.
 * ---------------------------------------------------------------------------
 */

export default function Layout({ children, modal }) {
  return (
    <>
      {children}   {/* Main Initiatives page */}
      {modal}      {/* Modal overlay slot */}
    </>
  );
}