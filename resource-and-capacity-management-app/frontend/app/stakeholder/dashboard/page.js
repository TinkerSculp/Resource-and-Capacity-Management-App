'use client';

/* =============================================================================
   StakeholderDashboardPage.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Dashboard landing page for Stakeholder users (acc_type_id === 2).
     Displays the shared DashboardSummary cards (Active, On Hold, Backlog counts
     scoped to initiatives where the stakeholder is the requestor or requestor_vp)
     and a 2×2 tile grid linking to the four pages available to this role.

   HOW IT WORKS:
     1. On mount, validates the session from localStorage
     2. If valid, sets the user and renders the dashboard
     3. DashboardSummary handles its own data fetching — this component only
        provides the layout shell

   TILE NAVIGATION:
     Capacity Summary → /capacity
     Initiatives      → /stakeholder/view-initiatives
     Assignments      → /stakeholder/assignments
     Calendar         → /calendar

   SECURITY MODEL:
     • Both user and token are checked before rendering — missing either
       clears storage and redirects to /login.
     • startTransition wraps the setUser call to defer the state update until
       after the current render completes, preventing hydration mismatches.
     • No sensitive data is rendered — only tile labels and icons from the
       static tiles array are displayed.

   RESPONSIVENESS:
     • 2×2 grid width is calc(66.666% + gap/2) — matches the resource manager
       and team member dashboard tile sizing for visual consistency.
     • clamp() on padding and gap — smooth fluid scaling from mobile to desktop.
     • Tile labels use clamp() font size — readable on all screen sizes.

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

export default function StakeholderDashboardPage() {
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

    // Deferred state update — prevents hydration mismatch on first render
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
     TILE DEFINITIONS
     Static array — label, icon, and href per tile.
     All hrefs are hardcoded paths — no user input reaches router.push().
  --------------------------------------------------------------------------- */
  const tiles = [
    {
      label: 'Capacity Summary',
      icon: <DashboardTileIcon defaultSrc="/capacitysummary.svg" darkSrc="/WhiteCapacitySummary.svg" alt="Capacity summary icon" />,
      href: '/capacity'
    },
    { label: 'Initiatives',      icon: <DashboardTileIcon defaultSrc="/Initiatives.svg" darkSrc="/WhiteInitiatives.svg" alt="Initiatives icon"  />, href: '/stakeholder/view-initiatives' },
    { label: 'Assignments',      icon: <DashboardTileIcon defaultSrc="/Assignments.svg" darkSrc="/WhiteAssignments.svg" alt="Assignments icon" />, href: '/stakeholder/assignments' },
    { label: 'Calendar',         icon: <DashboardTileIcon defaultSrc="/Calendar.svg" darkSrc="/WhiteCalendar.svg" alt="Calendar icon"  />, href: '/calendar' },
  ];

  /* ===========================================================================
     RENDER
  =========================================================================== */
  return (
    <div className="w-full max-w-full mx-auto -mt-4 space-y-6 px-4">

      {/* DASHBOARD SUMMARY CARDS
          DashboardSummary handles its own session read and data fetch.
          Counts are scoped to initiatives where the stakeholder is requestor
          or requestor_vp, by the backend summaryController when filter=mine. */}
      <div className="w-full">
        <DashboardSummary />
      </div>

      {/* DIVIDER */}
      <div className="border-t-2 border-gray-900 dark:border-slate-600 w-full" />

      {/* 2×2 TILE GRID
          Width is calc(66.666% + gap/2) — matches the resource manager and team
          member dashboards so all three role dashboards are visually consistent.
          clamp() on gap and padding provides fluid scaling. */}
      <div
        className="grid grid-cols-2 gap-[clamp(1.2rem,1.8vw,2.4rem)] mx-auto"
        style={{
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          width: 'calc(66.666% + clamp(1.2rem,1.8vw,2.4rem) / 2)'
        }}
      >
        {tiles.map((tile, i) => (
          <div
            key={i}
            onClick={() => tile.href && router.push(tile.href)} // Hardcoded hrefs only
            className={`
              bg-white rounded-lg shadow-sm dark:shadow-black/30 text-center border-4 border-gray-400 dark:bg-slate-900 dark:border-slate-700
              p-[clamp(0.8rem,1.6vw,2.4rem)]
              hover:shadow-md hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30
              cursor-pointer transition w-full
            `}
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
  );
}