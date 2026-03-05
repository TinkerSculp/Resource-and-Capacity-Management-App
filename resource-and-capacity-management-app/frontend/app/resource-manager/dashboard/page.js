'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import DashboardSummary from '@/components/layout/DashboardSummary';

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

  <div className="border-t-2 border-gray-900 w-full"></div>

  <div
    className="
      grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
      gap-[clamp(1.2rem,1.8vw,2.4rem)]
      w-full
    "
  >
    {[
      { label: 'Capacity Summary', icon: <Image src="/capacitysummary.svg" alt="capacitysummary icon" width={96} height={96} />, href: '/capacity' },
      { label: 'Resources', icon: <Image src="/Resources.svg" alt="resources icon" width={96} height={96} />, href: '/resource-manager/create-edit-resources' },
      { label: 'Initiatives', icon: <Image src="/Initiatives.svg" alt="initiatives icon" width={96} height={96} />, href: '/resource-manager/create-edit-initiatives' },
      { label: 'Assignments', icon: <Image src="/Assignments.svg" alt="assignment icon" width={96} height={96} />, href: '/resource-manager/assign-edit-allocation' },
      { label: 'Calendar', icon: <Image src="/Calendar.svg" alt="calendar icon" width={96} height={96} />, href: '/calendar' },
      { label: 'Reports', icon: <Image src="/Reports.svg" alt="reports icon" width={96} height={96} />, href: '/resource-manager/reports' },
    ].map((tile, i) => (
      <div
        key={i}
        onClick={() => router.push(tile.href)}
        className="
          bg-white rounded-lg shadow-sm border text-center border-4 border-gray-400
          p-[clamp(0.8rem,1.6vw,2.4rem)]
          hover:shadow-md hover:bg-[#017ACB]/20
          cursor-pointer transition
          w-full
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