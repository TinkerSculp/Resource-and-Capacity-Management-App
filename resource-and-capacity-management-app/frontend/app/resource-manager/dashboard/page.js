// 'use client';

// import { useEffect, useState, useTransition } from 'react';
// import { useRouter } from 'next/navigation';
// import Image from 'next/image';
// import DashboardSummary from '@/components/layout/DashboardSummary';

// const styles = {
//   outfitFont: { fontFamily: 'Outfit, sans-serif' }
// };

// export default function DashboardPage() {
//   const [user, setUser] = useState(null);
//   const router = useRouter();
//   const [, startTransition] = useTransition();

//   /* ---------------------------------------------------------
//      SECURITY: CLIENT‑SIDE AUTH GUARD
//      ---------------------------------------------------------
//      • Ensures only authenticated users can access the dashboard
//      • Redirects immediately if no user session is found
//      • Prevents UI flash by blocking render until user is loaded
//   --------------------------------------------------------- */
//   useEffect(() => {
//     const stored = localStorage.getItem('user');
//     const token = localStorage.getItem('token');

//     // If either user OR token is missing → force logout
//     if (!stored || !token) {
//       localStorage.removeItem('user');
//       localStorage.removeItem('token');
//       router.push('/login');
//       return;
//     }

//     // Load user into state
//     startTransition(() => {
//       setUser(JSON.parse(stored));
//     });
//   }, [router]);

//   // Loading state while user session is being validated
//   if (!user) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="animate-spin h-10 w-10 border-b-2 border-blue-600 rounded-full"></div>
//       </div>
//     );
//   }

//   return (
//     /* ---------------------------------------------------------
//        PAGE CONTAINER (NOW EXPANDS FULL WIDTH)
//        ---------------------------------------------------------
//        • max-w-full allows the dashboard to stretch across
//          ultra‑wide monitors without restriction
//        • Same layout, same spacing — just more horizontal room
//     --------------------------------------------------------- */
//     <div className="w-full max-w-full mx-auto -mt-4 space-y-6 px-4">

//   <div className="w-full">
//     <DashboardSummary />
//   </div>

//   <div className="border-t-2 border-gray-900 w-full"></div>

//   <div
//     className="
//       grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
//       gap-[clamp(1.2rem,1.8vw,2.4rem)]
//       w-full
//     "
//   >
//     {[
//       { label: 'Capacity Summary', icon: <Image src="/capacitysummary.svg" alt="capacitysummary icon" width={96} height={96} />, href: '/capacity' },
//       { label: 'Resources', icon: <Image src="/Resources.svg" alt="resources icon" width={96} height={96} />, href: '/resource-manager/create-edit-resources' },
//       { label: 'Initiatives', icon: <Image src="/Initiatives.svg" alt="initiatives icon" width={96} height={96} />, href: '/resource-manager/create-edit-initiatives' },
//       { label: 'Assignments', icon: <Image src="/Assignments.svg" alt="assignment icon" width={96} height={96} />, href: '/resource-manager/assign-edit-allocation' },
//       { label: 'Calendar', icon: <Image src="/Calendar.svg" alt="calendar icon" width={96} height={96} />, href: '/calendar' },
//       { label: 'Reports', icon: <Image src="/Reports.svg" alt="reports icon" width={96} height={96} />, href: '/resource-manager/reports' },
//     ].map((tile, i) => (
//       <div
//         key={i}
//         onClick={() => router.push(tile.href)}
//         className="
//           bg-white rounded-lg shadow-sm border text-center border-4 border-gray-400
//           p-[clamp(0.8rem,1.6vw,2.4rem)]
//           hover:shadow-md hover:bg-[#017ACB]/20
//           cursor-pointer transition
//           w-full
//         "
//       >
//         <div className="flex flex-col items-center justify-center gap-1">
//           {tile.icon}

//           <h3
//             className="text-[clamp(1.1rem,1.4vw,1.6rem)] font-semibold text-gray-900"
//             style={styles.outfitFont}
//           >
//             {tile.label}
//           </h3>
//         </div>
//       </div>
//     ))}
//   </div>
// </div>
//   );
// }

'use client';

/* =============================================================================
   DashboardPage.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Main dashboard page for Resource Managers. Renders the DashboardSummary
     widget (active/hold/backlog counts) and a grid of navigation tiles linking
     to all major sections of the application.

   SECURITY MODEL:
     • localStorage is accessed inside try/catch — malformed JSON clears the
       session and redirects to /login rather than crashing or persisting a
       broken auth state.
     • Both token AND user must be present — a partial session (one missing)
       is treated as unauthenticated and the user is redirected immediately.
     • JSON.parse is only called after confirming stored is non-null.
     • Tile hrefs are static string literals — no user input reaches router.push().
     • startTransition batches the setState call to prevent layout thrash.

   RESPONSIVENESS:
     • grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 — 1 column on mobile,
       2 on tablet, 3 on desktop.
     • clamp() on gap, padding, and font sizes — fluid scaling at all widths.
     • px-4 sm:px-6 on outer container — comfortable edge padding on all sizes.

   DEPENDENCIES:
     • @/components/layout/DashboardSummary — summary cards widget
     • next/image     — optimised SVG icon rendering
     • next/navigation — useRouter for tile click navigation
   ============================================================================= */

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import DashboardSummary from '@/components/layout/DashboardSummary';

/* -----------------------------------------------------------------------------
   STYLES — centralised font-family object
----------------------------------------------------------------------------- */
const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' }
};

export default function DashboardPage() {
  const [user, setUser]     = useState(null);
  const router              = useRouter();
  const [, startTransition] = useTransition();

  /* ---------------------------------------------------------------------------
     EFFECT: SESSION VALIDATION + AUTH GUARD
     ---------------------------------------------------------------------------
     Runs once on mount. Validates that both token and user exist in localStorage
     before allowing the dashboard to render.

     SECURITY:
     • try/catch wraps all localStorage access — malformed JSON clears the
       session rather than allowing a corrupt object into component state.
     • Both token AND user are required — if either is missing the session is
       cleared and the user is redirected to /login.
     • JSON.parse only runs after confirming stored is non-null.
     • startTransition wraps setState — prevents layout thrash on slower devices
       by batching the update at lower priority.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      const token  = localStorage.getItem('token');

      // Both must be present — partial session is treated as unauthenticated
      if (!stored || !token) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }

      // Batch state update — prevents layout thrash on slower devices
      startTransition(() => {
        setUser(JSON.parse(stored));
      });

    } catch (err) {
      // JSON.parse failed — localStorage value is malformed, clear and redirect
      console.error('Session validation error:', err);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      router.push('/login');
    }
  }, [router]);

  /* ---------------------------------------------------------------------------
     LOADING STATE
     Shown while session validation is in progress. Prevents dashboard content
     from flashing before the user object is confirmed and set.
  --------------------------------------------------------------------------- */
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="animate-spin h-10 w-10 border-b-2 border-[#017ACB] rounded-full"
          role="status"
          aria-label="Loading dashboard"
        />
      </div>
    );
  }

  /* ---------------------------------------------------------------------------
     NAVIGATION TILES
     Static array — hrefs are string literals, no user input involved.
     Icons use next/image with explicit width/height for layout stability.
  --------------------------------------------------------------------------- */
  const tiles = [
    { label: 'Capacity Summary', src: '/capacitysummary.svg', alt: 'Capacity summary icon', href: '/capacity' },
    { label: 'Resources',        src: '/Resources.svg',       alt: 'Resources icon',         href: '/resource-manager/create-edit-resources' },
    { label: 'Initiatives',      src: '/Initiatives.svg',     alt: 'Initiatives icon',       href: '/resource-manager/create-edit-initiatives' },
    { label: 'Assignments',      src: '/Assignments.svg',     alt: 'Assignments icon',       href: '/resource-manager/assign-edit-allocation' },
    { label: 'Calendar',         src: '/Calendar.svg',        alt: 'Calendar icon',          href: '/calendar' },
    { label: 'Reports',          src: '/Reports.svg',         alt: 'Reports icon',           href: '/resource-manager/reports' },
  ];

  /* ---------------------------------------------------------------------------
     RENDER
     ---------------------------------------------------------------------------
     RESPONSIVENESS:
     • Outer container: px-4 sm:px-6 — tighter on mobile, wider on desktop.
     • Tile grid: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 — stacks on mobile,
       2-col on tablet, 3-col on desktop.
     • clamp() on gap, padding, and font size — fluid scaling at all widths.
     • Tiles are keyboard accessible via role="button" + onKeyDown.
  --------------------------------------------------------------------------- */
  return (
    <div className="w-full max-w-full mx-auto -mt-4 space-y-6 px-4 sm:px-6">

      {/* Summary widget — renders active/hold/backlog counts */}
      <div className="w-full">
        <DashboardSummary />
      </div>

      {/* Divider between summary and tile grid */}
      <div className="border-t-2 border-gray-900 w-full" />

      {/* ----------------------------------------------------------------- */}
      {/* NAVIGATION TILE GRID                                               */}
      {/* 1 column on mobile → 2 on sm → 3 on lg                           */}
      {/* clamp() on gap — fluid spacing between tiles at all breakpoints   */}
      {/* ----------------------------------------------------------------- */}
      <div
        className="
          grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
          gap-[clamp(1.2rem,1.8vw,2.4rem)]
          w-full pb-6
        "
      >
        {tiles.map((tile, i) => (
          <div
            key={i}
            onClick={() => router.push(tile.href)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && router.push(tile.href)}
            aria-label={`Navigate to ${tile.label}`}
            className="
              bg-white rounded-lg shadow-sm border-4 border-gray-400
              text-center cursor-pointer transition w-full
              p-[clamp(0.8rem,1.6vw,2.4rem)]
              hover:shadow-md hover:bg-[#017ACB]/20 hover:border-[#017ACB]
            "
          >
            <div className="flex flex-col items-center justify-center gap-1">
              {/* Static src — no user-controlled values reach next/image */}
              <Image
                src={tile.src}
                alt={tile.alt}
                width={96}
                height={96}
                className="w-16 h-16 sm:w-24 sm:h-24" // Slightly smaller on mobile
              />

              <h3
                className="text-[clamp(1.1rem,1.4vw,1.6rem)] font-semibold text-gray-900"
                style={styles.outfitFont}
              >
                {tile.label}
              </h3>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}