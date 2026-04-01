'use client';

/* =============================================================================
   DashboardPage.jsx  (Resource Manager Dashboard)
   -----------------------------------------------------------------------------
   PURPOSE:
     Dashboard landing page for Resource Manager users (acc_type_id === 1).
     Displays the shared DashboardSummary cards (Active, On Hold, Backlog counts
     scoped to assignments the manager leads) and a 3×2 tile grid linking to
     the six pages available to this role.

   HOW IT WORKS:
     1. On mount, validates the session from localStorage
     2. If valid, sets the user and renders the dashboard
     3. DashboardSummary handles its own data fetching — this component only
        provides the layout shell

   TILE NAVIGATION:
     Capacity Summary → /capacity
     Resources        → /resource-manager/create-edit-resources
     Initiatives      → /resource-manager/create-edit-initiatives
     Assignments      → /resource-manager/assign-edit-allocation
     Calendar         → /calendar
     Reports          → /resource-manager/reports

   SECURITY MODEL:
     • Both user and token are checked before rendering — missing either
       clears storage and redirects to /login.
     • startTransition wraps the setUser call to prevent hydration mismatches.
     • All tile hrefs are hardcoded paths — no user input reaches router.push().

   RESPONSIVENESS:
     • 3×2 grid uses grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 — one column on
       mobile, two on tablet, three on desktop.
     • clamp() on padding and gap — fluid scaling across all screen sizes.
     • Tile labels use clamp() font size — readable on all screen sizes.
     • max-w-full — fills the full available width on wide monitors.

   DEPENDENCIES:
     • DashboardSummary — Shared summary cards component
     • next/navigation   — useRouter for tile click navigation
     • next/image        — Optimised tile icons
   ============================================================================= */

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import DashboardSummary from '@/components/layout/DashboardSummary';
import DashboardTileIcon from '@/components/layout/DashboardTileIcon';

const styles = { outfitFont: { fontFamily: 'Outfit, sans-serif' } };

export default function DashboardPage() {
  const [user, setUser]     = useState(null);
  const router              = useRouter();
  const [, startTransition] = useTransition();

  /* ---------------------------------------------------------------------------
     EFFECT: SESSION VALIDATION
     Validates that both user and token exist in localStorage.
     startTransition defers setUser to avoid hydration mismatches on first render.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token  = localStorage.getItem('token');

    if (!stored || !token) {
      // Clear both — prevents a partial session where one exists without the other
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      router.push('/login');
      return;
    }

    // Deferred update — prevents hydration mismatch between server and client render
    startTransition(() => {
      setUser(JSON.parse(stored));
    });
  }, [router]);

  /* ---------------------------------------------------------------------------
     LOADING STATE — shown while session is being validated
  --------------------------------------------------------------------------- */
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-b-2 border-blue-600 rounded-full" role="status" />
      </div>
    );
  }

  /* ---------------------------------------------------------------------------
     TILE DEFINITIONS — all hrefs are hardcoded, no user input reaches router.push()
  --------------------------------------------------------------------------- */
  const tiles = [
    { label: 'Capacity Summary', icon: <Image src="/capacitysummary.svg" alt="Capacity summary icon" width={96} height={96} />, href: '/capacity' },
    { label: 'Resources',        icon: <Image src="/Resources.svg"       alt="Resources icon"        width={96} height={96} />, href: '/resource-manager/create-edit-resources' },
    { label: 'Initiatives',      icon: <Image src="/Initiatives.svg"     alt="Initiatives icon"      width={96} height={96} />, href: '/resource-manager/create-edit-initiatives' },
    { label: 'Assignments',      icon: <Image src="/Assignments.svg"     alt="Assignments icon"      width={96} height={96} />, href: '/resource-manager/assign-edit-allocation' },
    { label: 'Calendar',         icon: <Image src="/Calendar.svg"        alt="Calendar icon"         width={96} height={96} />, href: '/calendar' },
    { label: 'Reports',          icon: <Image src="/Reports.svg"         alt="Reports icon"          width={96} height={96} />, href: '/resource-manager/reports' },
  ];

  /* ===========================================================================
     RENDER
  =========================================================================== */
  return (
    <div className="w-full max-w-full mx-auto -mt-4 space-y-6 px-4">

      {/* DASHBOARD SUMMARY CARDS
          DashboardSummary handles its own session read and data fetch.
          Counts are scoped to assignments where leader === the manager's emp_name,
          by the backend summaryController when filter=mine is passed. */}
      <div className="w-full">
        <DashboardSummary />
      </div>

      {/* DIVIDER */}
      <div className="border-t-2 border-gray-900 dark:border-slate-600 w-full" />

  <div
    className="
      grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
      gap-[clamp(1.2rem,1.8vw,2.4rem)]
      w-full
    "
  >
    {[
      { label: 'Capacity Summary', icon: <DashboardTileIcon defaultSrc="/capacitysummary.svg" darkSrc="/WhiteCapacitySummary.svg" alt="capacitysummary icon" />, href: '/capacity'},
      { label: 'Resources', icon: <DashboardTileIcon defaultSrc="/Resources.svg" darkSrc="/WhiteResources.svg" alt="resources icon" />, href: '/resource-manager/create-edit-resources' },
      { label: 'Initiatives', icon: <DashboardTileIcon defaultSrc="/Initiatives.svg" darkSrc="/WhiteInitiatives.svg" alt="initiatives icon" />, href: '/resource-manager/create-edit-initiatives' },
      { label: 'Assignments', icon: <DashboardTileIcon defaultSrc="/Assignments.svg" darkSrc="/WhiteAssignments.svg" alt="assignment icon" />, href: '/resource-manager/assign-edit-allocation' },
      { label: 'Calendar', icon: <DashboardTileIcon defaultSrc="/Calendar.svg" darkSrc="/WhiteCalendar.svg" alt="calendar icon" />, href: '/calendar' },
      { label: 'Reports', icon: <DashboardTileIcon defaultSrc="/reports.svg" darkSrc="/WhiteReports.svg" alt="reports icon" />, href: '/resource-manager/reports' },
    ].map((tile, i) => (
      <div
        key={i}
        onClick={() => router.push(tile.href)}
        className="
          bg-white rounded-lg shadow-sm dark:shadow-black/30 text-center border-4 border-gray-400 dark:bg-slate-900 dark:border-slate-700
          p-[clamp(0.8rem,1.6vw,2.4rem)]
          hover:shadow-md hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30
          cursor-pointer transition
          w-full
        "
      >
        <div className="flex flex-col items-center justify-center gap-1">
          {tile.icon}

          <h3
            className="text-[clamp(1.1rem,1.4vw,1.6rem)] font-semibold text-gray-900 dark:text-slate-100"
            style={styles.outfitFont}
          >
            {tile.label}
          </h3>
        </div>
      </div>
    ))}
  </div>
</div>
      {/* 3×2 TILE GRID
          grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 — responsive stacking.
          clamp() on gap and padding provides fluid scaling across all viewports. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[clamp(1.2rem,1.8vw,2.4rem)] w-full">
        {tiles.map((tile, i) => (
          <div
            key={i}
            onClick={() => router.push(tile.href)} // Hardcoded hrefs only — no user input
            className="
              bg-white rounded-lg shadow-sm border text-center border-4 border-gray-400
              p-[clamp(0.8rem,1.6vw,2.4rem)]
              hover:shadow-md hover:bg-[#017ACB]/20
              cursor-pointer transition w-full
            "
          >
            <div className="flex flex-col items-center justify-center gap-1">
              {tile.icon}
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
