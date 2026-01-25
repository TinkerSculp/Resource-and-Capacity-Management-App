/* ---------------------------------------------------------
   DEFAULT MODAL FALLBACK
   ---------------------------------------------------------
   PURPOSE:
   - Serves as the default renderer for the @modal parallel
     route segment when no modal is active.

   HOW IT WORKS:
   - Next.js injects a `modal` component into the layout only
     when a modal route (e.g., Create Resource, Edit Resource)
     is being rendered.
   - When no modal route is active, this component is used as
     the fallback for the @modal slot.

   DESIGN NOTES:
   - Prevents Next.js from throwing errors about a missing
     default route for the parallel segment.
   - Ensures the layout always has a valid React node.
   - Returns children unchanged:
       • No wrappers
       • No styling
       • No layout interference
   - Keeps modal behavior predictable and isolated.
--------------------------------------------------------- */
export default function DefaultModal({ children }) {
  return children;
}
