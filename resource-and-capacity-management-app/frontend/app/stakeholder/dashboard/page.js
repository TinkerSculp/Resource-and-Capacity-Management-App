'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import DashboardSummary from '@/components/layout/DashboardSummary';

const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' }
};

export default function StakeholderDashboard() {
  const [user, setUser] = useState(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  /* ---------------------------------------------------------
     SECURITY: CLIENT‑SIDE AUTH GUARD
  --------------------------------------------------------- */
  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!stored || !token) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      router.push('/login');
      return;
    }

    startTransition(() => {
      setUser(JSON.parse(stored));
    });
  }, [router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-b-2 border-brandBlue rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full mx-auto mt-2 space-y-12 px-4">

      {/* DASHBOARD SUMMARY */}
      <div className="w-full">
        <DashboardSummary />
      </div>

      {/* NAVIGATION TILES */}
      <div
        className="
          grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2
          gap-[clamp(1.5rem,2vw,3rem)]
          w-full
        "
      >
        {[
          { label: 'Capacity Summary', icon: <Image src="/capacitysummary.svg" alt="capacity icon" width={96} height={96} />, href: '/capacity' },
          { label: 'Initiatives', icon: <Image src="/Initiatives.svg" alt="initiatives icon" width={96} height={96} />, href: '/stakeholder/view-initiatives' },
          { label: 'Assignments', icon: <Image src="/Assignments.svg" alt="assignments icon" width={96} height={96} />, href: null },
          { label: 'Calendar', icon: <Image src="/Calendar.svg" alt="calendar icon" width={96} height={96} />, href: '/calendar' },
        ].map((tile, i) => (
          <div
            key={i}
            onClick={() => tile.href && router.push(tile.href)}
            className="
              bg-white rounded-lg shadow-sm border text-center border-gray-400
              p-[clamp(1.5rem,2.2vw,3rem)]
              hover:shadow-md hover:bg-[#017ACB]/20
              cursor-pointer transition
              w-full
            "
          >
            <div className="flex flex-col items-center justify-center gap-1">
              {tile.icon}

              <h3
                className="text-[clamp(1.2rem,1.4vw,1.6rem)] font-semibold text-gray-900"
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