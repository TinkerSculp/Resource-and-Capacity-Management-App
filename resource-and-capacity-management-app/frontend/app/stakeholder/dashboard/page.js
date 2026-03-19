'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import DashboardSummary from '@/components/layout/DashboardSummary';
import DashboardTileIcon from '@/components/layout/DashboardTileIcon';

const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' }
};

export default function StakeholderDashboardPage() {
  const [user, setUser] = useState(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token  = localStorage.getItem('token');

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
        <div className="animate-spin h-10 w-10 border-b-2 border-blue-600 rounded-full"></div>
      </div>
    );
  }

  const tiles = [
    {
      label: 'Capacity Summary',
      icon: <DashboardTileIcon defaultSrc="/capacitysummary.svg" darkSrc="/WhiteCapacitySummary.svg" alt="capacitysummary icon" />,
      href: '/capacity'
    },
    { label: 'Initiatives',      icon: <DashboardTileIcon defaultSrc="/Initiatives.svg" darkSrc="/WhiteInitiatives.svg" alt="initiatives icon" />, href: '/stakeholder/view-initiatives' },
    { label: 'Assignments',      icon: <DashboardTileIcon defaultSrc="/Assignments.svg" darkSrc="/WhiteAssignments.svg" alt="assignment icon" />, href: '/stakeholder/assignments' },
    { label: 'Calendar',         icon: <DashboardTileIcon defaultSrc="/Calendar.svg" darkSrc="/WhiteCalendar.svg" alt="calendar icon" />, href: '/calendar' },
  ];

  return (
    <div className="w-full max-w-full mx-auto -mt-4 space-y-6 px-4">

      <div className="w-full">
        <DashboardSummary />
      </div>

      <div className="border-t-2 border-gray-900 dark:border-slate-600 w-full"></div>

      {/* 2x2 grid — tiles same size as resource manager, centred */}
      <div className="grid grid-cols-2 gap-[clamp(1.2rem,1.8vw,2.4rem)] mx-auto" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', width: 'calc(66.666% + clamp(1.2rem,1.8vw,2.4rem) / 2)' }}>
        {tiles.map((tile, i) => (
          <div
            key={i}
            onClick={() => tile.href && router.push(tile.href)}
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
