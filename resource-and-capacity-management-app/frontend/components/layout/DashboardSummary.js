'use client';

/* =============================================================================
   DashboardSummary.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Displays the dashboard summary cards showing counts of Active, On Hold,
     and Backlog initiatives. Supports two filter modes:
       • "all"  — Global counts across all assignments
       • "mine" — Counts scoped to the authenticated user's role

   HOW IT WORKS:
     1. User session is read from localStorage on first render (lazy initialiser)
     2. When user or filter changes, fetches summary counts from the backend
     3. Renders three cards (Active, On Hold, Backlog) with the fetched counts
     4. Filter buttons toggle between "All" and "Mine" views

   BUTTON COLOUR LOGIC:
     • Active filter   → Blue (#017ACB), hover fades to light blue tint
     • Inactive filter → Grey (gray-200 / slate-700 dark), hover fades to same blue tint

   DEPENDENCIES:
     • @/lib/api — Axios instance with JWT Bearer token auto-injection
   ============================================================================= */

import { useEffect, useState } from 'react';
import api from '@/lib/api';

const styles = { outfitFont: { fontFamily: 'Outfit, sans-serif' } };

/* =============================================================================
   TAB BUTTON CLASS BUILDER
   Active   = blue (#017ACB) — "you are here"
   Inactive = grey (gray-200 / slate-700 dark) — available to click
   Both states: hover fades to light blue tint (#017ACB/20) matching the
   filterTabClass pattern used across all other pages.
   ============================================================================= */
const tabClass = (isActive) => `
  w-20 px-4 py-2 rounded text-sm text-center
  border border-[#00263F]/50 dark:border-slate-500/60
  ${isActive
    ? 'bg-[#017ACB] text-white hover:bg-[#017ACB]/20 hover:text-gray-700 dark:hover:bg-[#017ACB]/30 dark:hover:text-slate-100'
    : 'bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-200 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 hover:text-gray-700 dark:hover:text-slate-100'
  }
  transition whitespace-nowrap
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  dark:active:shadow-[2px_2px_6px_rgba(0,0,0,0.45)]
  relative before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
  dark:before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.45)]
`;

/* -----------------------------------------------------------------------------
   FUNCTION: Summary Card Icon
   Renders an icon for the summary card, supporting dark mode.
----------------------------------------------------------------------------- */
function SummaryCardIcon({ defaultSrc, darkSrc, alt }) {
  return (
    <picture>
      <source srcSet={darkSrc} media="(prefers-color-scheme: dark)" />
      <img src={defaultSrc} alt={alt} className="w-14 h-14" />
    </picture>
  );
}

export default function DashboardSummary() {

  /* ---------------------------------------------------------------------------
     STATE: USER SESSION
     Lazy initialiser reads from localStorage synchronously on first render.
     try/catch handles malformed JSON — clears storage and returns null.
  --------------------------------------------------------------------------- */
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch (err) {
      console.error('LocalStorage parse error:', err);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      return null;
    }
  });

  const [filter, setFilter]   = useState('all');
  const [summary, setSummary] = useState({ active: 0, hold: 0, backlog: 0 });

  /* ---------------------------------------------------------------------------
     EFFECT: LOAD SUMMARY DATA
     Skips if user is null. username only appended when filter === "mine".
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!user) return;

    async function loadSummary() {
      try {
        const usernameParam = filter === 'mine'
          ? `&username=${encodeURIComponent(user.username)}`
          : '';
        const res = await api.get(`/summary?filter=${filter}${usernameParam}`);
        if (!res?.data) { console.warn('Summary response returned no data'); return; }
        setSummary({
          active:  res.data.active  ?? 0,
          hold:    res.data.hold    ?? 0,
          backlog: res.data.backlog ?? 0
        });
      } catch (err) {
        console.error('Summary fetch error:', err);
      }
    }

    loadSummary();
  }, [user, filter]);

  /* ---------------------------------------------------------------------------
     LOADING STATE
  --------------------------------------------------------------------------- */
  if (!user) {
    return (
      <div className="min-h-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#017ACB]" role="status" aria-label="Loading dashboard" />
      </div>
    );
  }

  /* ---------------------------------------------------------------------------
     RENDER
  --------------------------------------------------------------------------- */
  return (
    <div className="w-full -mt-[clamp(0.7rem,1.0vw,1.7rem)]">

      {/* Welcome heading */}
      <h2
        className="text-[clamp(1.4rem,1.8vw,2.2rem)] text-gray-900 dark:text-slate-100 mb-[clamp(0.15rem,0.3vw,0.45rem)]"
        style={styles.outfitFont}
      >
        Welcome back, {user.username}
      </h2>

      {/* ALL / MINE FILTER BUTTONS */}
      <div className="flex gap-2 mb-[clamp(0.6rem,1vw,1.2rem)]">
        {[
          { mode: 'all',  label: 'All',  ariaLabel: 'Show all initiatives' },
          { mode: 'mine', label: 'Mine', ariaLabel: 'Show my initiatives'  }
        ].map(({ mode, label, ariaLabel }) => (
          <button
            key={mode}
            onClick={() => setFilter(mode)}
            aria-pressed={filter === mode}
            aria-label={ariaLabel}
            className={tabClass(filter === mode)}
            style={styles.outfitFont}
          >
            {label}
          </button>
        ))}
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-3 gap-[clamp(1rem,2vw,2.5rem)] w-full">
        {[
          {
            label: 'Active Initiatives',
            icon: (
              <SummaryCardIcon
                defaultSrc="/ActiveProject.svg"
                darkSrc="/ActiveProject-light.svg"
                alt="Active project icon"
              />
            ),
            value: summary.active
          },
          {
            label: 'Initiatives on Hold',
            icon: (
              <SummaryCardIcon
                defaultSrc="/hold.svg"
                darkSrc="/hold-light.svg"
                alt="On hold icon"
              />
            ),
            value: summary.hold
          },
          {
            label: 'Initiatives in Back Log',
            icon: (
              <SummaryCardIcon
                defaultSrc="/Backlog.svg"
                darkSrc="/Backlog-light.svg"
                alt="Backlog icon"
              />
            ),
            value: summary.backlog
          }
        ].map((item, i) => (
          <div
            key={i}
            className="bg-gray-200 rounded-lg shadow-sm dark:shadow-black/30 border border-gray-300 dark:bg-slate-900 dark:border-slate-700 p-[clamp(1rem,1.5vw,2rem)] transition"
          >
            <p
              className="text-gray-600 dark:text-slate-300 text-[clamp(0.9rem,1.0vw,1.2rem)] text-center"
              style={styles.outfitFont}
            >
              {item.label}
            </p>
            <h3
              className="flex items-center justify-center gap-2 text-[clamp(1.3rem,1.5vw,1.9rem)] font-semibold text-gray-900 dark:text-slate-100 mb-2"
              style={styles.outfitFont}
            >
              <span className="flex items-center gap-1">
                {item.icon}
                <span className="inline-block w-2 text-center">{item.value}</span>
              </span>
            </h3>
          </div>
        ))}
      </div>

    </div>
  );
}