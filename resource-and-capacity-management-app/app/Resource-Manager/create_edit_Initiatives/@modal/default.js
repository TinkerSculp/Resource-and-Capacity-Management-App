/**
 * ---------------------------------------------------------
 * DEFAULT MODAL FALLBACK
 * ---------------------------------------------------------
 * This component is used by the @modal parallel route segment
 * when no modal is active.
 *
 * How it works:
 * - Next.js injects `modal` into the layout only when a modal
 *   route (e.g., AddInitiative or Edit) is being rendered.
 * - When no modal route is active, this file is used as the
 *   default renderer for the @modal slot.
 *
 * Purpose:
 * - Prevents Next.js from throwing errors about a missing
 *   default route for the parallel segment.
 * - Ensures the layout always has a valid React node.
 *
 * Behavior:
 * - Simply returns its children unchanged.
 * - Does NOT wrap, style, or modify anything.
 * - Keeps modal logic clean and predictable.
 */
export default function DefaultModal({ children }) {
  return children;
}