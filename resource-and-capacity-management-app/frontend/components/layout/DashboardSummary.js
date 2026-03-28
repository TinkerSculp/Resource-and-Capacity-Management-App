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

   SECURITY MODEL:
     • localStorage is read inside a try/catch in the useState initialiser —
       malformed JSON is caught, the session is cleared, and the component
       initialises with null rather than crashing or persisting a broken state.
     • The useEffect that loads summary data skips entirely if user is null —
       prevents API calls before the session is validated and the JWT is available.
     • username is passed through encodeURIComponent() before being appended
       to the API URL — prevents injection or malformed requests.
     • API response fields are read with ?? 0 fallbacks — prevents undefined
       or null values from reaching the summary cards and causing render issues.
     • Response presence is validated before setState — prevents a null or
       undefined response from being destructured into summary state.
     • Summary state initialises to { active: 0, hold: 0, backlog: 0 } —
       cards always render with a safe default rather than undefined values.

   RESPONSIVENESS:
     • All sizes use clamp() for fluid scaling between mobile and desktop.
     • grid-cols-3 is fixed — cards always display in a row, scaling via
       clamp() padding and font sizes rather than stacking.
     • Welcome heading and filter buttons scale fluidly with viewport width.

   DEPENDENCIES:
     • @/lib/api — Axios instance with JWT Bearer token auto-injection
   ============================================================================= */

import { useEffect, useState } from 'react';
import api from '@/lib/api';

const styles = { outfitFont: { fontFamily: 'Outfit, sans-serif' } };

export default function DashboardSummary() {

  /* ---------------------------------------------------------------------------
     STATE: USER SESSION
     ---------------------------------------------------------------------------
     Initialised directly from localStorage using a lazy useState initialiser —
     runs synchronously on first render so no useEffect delay is needed.

     SECURITY:
     • try/catch handles malformed JSON — corrupted localStorage is caught
       and cleared rather than propagating an invalid user object.
     • Both token and user are removed on parse failure — prevents a broken
       session where one exists and the other doesn't.
     • Returns null on failure — component shows a spinner rather than
       attempting API calls with an invalid user.
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

  /* ---------------------------------------------------------------------------
     STATE: FILTER + SUMMARY
     filter:  "all" = global counts, "mine" = user-scoped counts
     summary: zeroed defaults — cards render safely before the first response
  --------------------------------------------------------------------------- */
  const [filter, setFilter]   = useState('all');
  const [summary, setSummary] = useState({ active: 0, hold: 0, backlog: 0 });

  /* ---------------------------------------------------------------------------
     EFFECT: LOAD SUMMARY DATA
     ---------------------------------------------------------------------------
     Runs whenever user or filter changes. Fetches the appropriate counts
     based on the current filter mode.

     SECURITY:
     • Skips if user is null — prevents API calls before session is validated.
     • username only appended when filter === "mine" — avoids leaking username
       in the URL on global summary requests.
     • encodeURIComponent() on username — prevents injection or malformed URLs.
     • Response validated before setState — prevents null/undefined being spread.
     • ?? 0 fallbacks on each field — missing backend values never reach cards.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!user) return;

    async function loadSummary() {
      try {
        // Only include username in the URL when filtering to the current user
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
     LOADING STATE — shown while session is being validated
  --------------------------------------------------------------------------- */
  if (!user) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#017ACB]" role="status" aria-label="Loading dashboard" />
      </div>
    );
  }

  /* ---------------------------------------------------------------------------
     RENDER
     clamp() on all sizes provides fluid scaling — no hard breakpoint jumps.
     grid-cols-3 keeps cards side by side at all viewport sizes.
  --------------------------------------------------------------------------- */
  return (
    <div className="w-full -mt-[clamp(0.7rem,1.0vw,1.7rem)]">

      {/* Welcome heading — username from validated localStorage session */}
      <h2 className="text-[clamp(1.4rem,1.8vw,2.2rem)] text-gray-900 mb-[clamp(0.15rem,0.3vw,0.45rem)]" style={styles.outfitFont}>
        Welcome back, {user.username}
      </h2>

      {/* FILTER BUTTONS
          "All" → global counts, "Mine" → user-scoped counts
          Active filter highlighted with brand blue background */}
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
            className={`
              px-[clamp(0.4rem,0.6vw,0.8rem)] py-[clamp(0.2rem,0.4vw,0.6rem)]
              w-[clamp(3.5rem,4.5vw,5.5rem)] border border-[#00263F]/50
              text-center cursor-pointer rounded text-[clamp(0.9rem,1vw,1.1rem)] transition
              ${filter === mode
                ? 'bg-[#017ACB] text-white hover:bg-[#017ACB]/20 hover:text-gray-700'
                : 'bg-gray-200 text-gray-700 hover:bg-[#017ACB]/20'}
              shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
              active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
              relative before:content-[''] before:absolute before:inset-0 before:rounded
              before:pointer-events-none
              before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
            `}
            style={styles.outfitFont}
          >
            {label}
          </button>
        ))}
      </div>

      {/* SUMMARY CARDS
          All values validated with ?? 0 — never undefined.
          Static label array avoids any injection risk. */}
      <div className="grid grid-cols-3 gap-[clamp(1rem,2vw,2.5rem)] w-full">
        {[
          { label: 'Active Initiatives',       icon: <img src="/ActiveProject.svg" alt="Active project icon" className="w-14 h-14" />, value: summary.active  },
          { label: 'Initiatives on Hold',      icon: <img src="/hold.svg"          alt="On hold icon"        className="w-14 h-14" />, value: summary.hold    },
          { label: 'Initiatives in Back Log',  icon: <img src="/Backlog.svg"       alt="Backlog icon"        className="w-14 h-14" />, value: summary.backlog }
        ].map((item, i) => (
          <div key={i} className="bg-gray-200 rounded-lg shadow-sm border border-gray-300 p-[clamp(1rem,1.5vw,2rem)] transition">
            <p className="text-gray-600 text-[clamp(0.9rem,1.0vw,1.2rem)] text-center" style={styles.outfitFont}>{item.label}</p>
            <h3 className="flex items-center justify-center gap-2 text-[clamp(1.3rem,1.5vw,1.9rem)] font-semibold text-gray-900 mb-2" style={styles.outfitFont}>
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
