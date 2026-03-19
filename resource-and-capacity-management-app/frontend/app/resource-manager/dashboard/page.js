'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import DashboardSummary from '@/components/layout/DashboardSummary';
import DashboardTileIcon from '@/components/layout/DashboardTileIcon';

const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' }
};

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  /* ---------------------------------------------------------
     SECURITY: CLIENT‑SIDE AUTH GUARD
     ---------------------------------------------------------
     • Ensures only authenticated users can access the dashboard
     • Redirects immediately if no user session is found
     • Prevents UI flash by blocking render until user is loaded
  --------------------------------------------------------- */
  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    // If either user OR token is missing → force logout
    if (!stored || !token) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      router.push('/login');
      return;
    }

    // Load user into state
    startTransition(() => {
      setUser(JSON.parse(stored));
    });
  }, [router]);

  // Loading state while user session is being validated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-b-2 border-blue-600 rounded-full"></div>
      </div>
    );
  }

  return (
    /* ---------------------------------------------------------
       PAGE CONTAINER (NOW EXPANDS FULL WIDTH)
       ---------------------------------------------------------
       • max-w-full allows the dashboard to stretch across
         ultra‑wide monitors without restriction
       • Same layout, same spacing — just more horizontal room
    --------------------------------------------------------- */
    <div className="w-full max-w-full mx-auto -mt-4 space-y-6 px-4">

  <div className="w-full">
    <DashboardSummary />
  </div>

  <div className="border-t-2 border-gray-900 dark:border-slate-600 w-full"></div>

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
  );
}