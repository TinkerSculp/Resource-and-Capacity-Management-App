'use client';
export const dynamic = 'force-dynamic';
/* =============================================================================
   TeamMemberDashboardPage.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Dashboard landing page for Team Member users (acc_type_id === 3).
     Displays the shared DashboardSummary cards (Active, On Hold, Backlog counts
     scoped to the team member's current-month allocations) and a 2×2 tile grid
     linking to the four pages available to this role.

   HOW IT WORKS:
     1. On mount, validates the session from localStorage
     2. If valid, sets the user and renders the dashboard
     3. DashboardSummary handles its own data fetching — this component only
        provides the layout shell

   TILE NAVIGATION:
     Capacity Summary → /capacity
     Initiatives      → /team-member/view-initiatives
     Assignments      → /team-member/assignments
     Calendar         → /calendar

   SECURITY MODEL:
     • Both user and token are checked before rendering — missing either
       clears storage and redirects to /login.
     • startTransition wraps the setUser call to defer the state update until
       after the current render completes, preventing hydration mismatches
       between server-rendered HTML and client state.
     • No sensitive data is rendered — only the tile labels and icons from
       the static tiles array are displayed.

   RESPONSIVENESS:
     • 2×2 grid width is calc(66.666% + gap/2) — matches the resource manager
       dashboard tile size and keeps the grid centred at all viewport sizes.
     • clamp() on padding and gap — smooth fluid scaling from mobile to desktop.
     • tile labels use clamp() font size — readable on all screen sizes.

   DEPENDENCIES:
     • DashboardSummary — Shared summary cards component
     • next/navigation  — useRouter for tile click navigation
     • next/image       — Optimised tile icons (used directly via Image)
   ============================================================================= */

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import DashboardSummary from '@/components/layout/DashboardSummary';

const styles = { outfitFont: { fontFamily: 'Outfit, sans-serif' } };

export default function TeamMemberDashboardPage() {
  const [user, setUser]         = useState(null);
  const router                  = useRouter();
  const [, startTransition]     = useTransition();

  /* ---------------------------------------------------------------------------
     EFFECT: SESSION VALIDATION
     Validates that both user and token exist in localStorage.
     startTransition defers the setUser update to avoid hydration mismatches.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token  = localStorage.getItem('token');

    if (!stored || !token) {
      // Clear both to prevent a partial session where one exists without the other
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
      <div className="h-[600px] flex items-center justify-center">
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
    { label: 'Capacity Summary', icon: <Image src="/capacitysummary.svg" alt="Capacity summary icon" width={96} height={96} />, href: '/capacity' },
    { label: 'Initiatives',      icon: <Image src="/Initiatives.svg"     alt="Initiatives icon"      width={96} height={96} />, href: '/team-member/view-initiatives' },
    { label: 'Assignments',      icon: <Image src="/Assignments.svg"     alt="Assignments icon"      width={96} height={96} />, href: '/team-member/assignments' },
    { label: 'Calendar',         icon: <Image src="/Calendar.svg"        alt="Calendar icon"         width={96} height={96} />, href: '/calendar' },
  ];

  /* ===========================================================================
     RENDER
  =========================================================================== */
  return (
    <div className="w-full max-w-full mx-auto -mt-4 space-y-6 px-4">

      {/* DASHBOARD SUMMARY CARDS
          DashboardSummary handles its own session read and data fetch.
          Counts are scoped to the team member's current-month allocations
          by the backend summaryController when filter=mine is passed. */}
      <div className="w-full">
        <DashboardSummary />
      </div>

      {/* DIVIDER */}
      <div className="border-t-2 border-gray-900 w-full" />

      {/* 2×2 TILE GRID
          Width is calc(66.666% + gap/2) — matches the resource manager dashboard
          tile sizing so both role dashboards look visually consistent.
          clamp() on gap and padding provides fluid scaling between viewport sizes. */}
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
            onClick={() => tile.href && router.push(tile.href)} // Hardcoded hrefs — no user input
            className={`
              bg-white rounded-lg shadow-sm border text-center border-4 border-gray-400
              p-[clamp(0.8rem,1.6vw,2.4rem)]
              hover:shadow-md hover:bg-[#017ACB]/20
              cursor-pointer transition w-full
            `}
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