/* ---------------------------------------------------------
   LAYOUT: create_edit_Initiatives
   ---------------------------------------------------------
   PURPOSE:
   - Manages two parallel route segments in Next.js:
       • children → main Initiatives page
       • modal    → @modal parallel route slot

   HOW IT WORKS:
   - When a modal route is active (Add / Edit Initiative),
     Next.js injects the modal component into the `modal` prop.
   - The main page always stays rendered underneath.
   - The modal overlays the page without replacing it.
   - Navigation between modal and page feels seamless.

   DESIGN NOTES:
   - No wrappers or containers are added here.
   - Prevents interference with:
       • z-index stacking
       • pointer events
       • scroll behavior
--------------------------------------------------------- */
export default function Layout({ children, modal }) {
  return (
    <>
      {children}   {/* Main Initiatives page */}
      {modal}      {/* Modal overlay slot */}
    </>
  );
}