/**
 * ---------------------------------------------------------------------------
 * DEFAULT MODAL FALLBACK  —  @modal parallel route segment
 * ---------------------------------------------------------------------------
 * PURPOSE:
 * Provides the required default renderer for the `@modal` parallel route slot
 * when no modal is active. Next.js requires every parallel segment to define
 * a default component; otherwise, navigation into or out of the segment can
 * produce runtime errors.
 *
 * BEHAVIOR:
 * - When a modal route (e.g., Add Initiative, Edit Initiative) is active,
 *   Next.js injects the modal component into the `modal` prop of the parent
 *   layout.
 * - When no modal route is active, this fallback component is rendered.
 *
 * DESIGN PRINCIPLES:
 * - Returns `children` exactly as-is.
 * - No wrappers, no styling, no layout interference.
 * - Ensures predictable modal behavior and prevents accidental stacking,
 *   scroll locking, or pointer-event conflicts.
 *
 * SECURITY:
 * - Contains **zero** business logic and **no** data access.
 * - Does not read from localStorage, cookies, or API routes.
 * - Does not expose or manipulate authentication state.
 * - All auth enforcement remains in:
 *     • API route handlers
 *     • server middleware
 *     • protected client components
 *
 * MAINTAINABILITY:
 * - Keep this file minimal.
 * - Any modal UI logic belongs in the modal components themselves.
 * ---------------------------------------------------------------------------
 */

export default function DefaultModal({ children }) {
  return children;
}