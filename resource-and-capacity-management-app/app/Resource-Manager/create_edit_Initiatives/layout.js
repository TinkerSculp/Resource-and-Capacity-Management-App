/**
 * ---------------------------------------------------------
 * LAYOUT: create_edit_Initiatives
 * ---------------------------------------------------------
 * This layout manages two parallel route segments:
 *
 * 1. `children` → The main Initiatives page
 * 2. `modal`    → The @modal parallel route slot
 *
 * When a modal route is active (e.g., AddInitiative or Edit),
 * Next.js injects the modal component into the `modal` prop.
 *
 * This layout ensures:
 * - The main page always renders underneath
 * - The modal overlays the page without replacing it
 * - Navigation between modal and page feels seamless
 *
 * No wrappers or containers are added here to avoid
 * interfering with z-index, pointer events, or scroll behavior.
 */
export default function Layout({ children, modal }) {
  return (
    <>
      {children}   {/* Main Initiatives page */}
      {modal}      {/* Modal overlay slot */}
    </>
  );
}