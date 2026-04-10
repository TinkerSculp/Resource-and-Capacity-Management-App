'use client';

/* =============================================================================
   CalendarView.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Displays employee activities grouped by month in a responsive grid layout.
     Supports 1–3 month views with filtering by "All" (all employees) or
     "Just Mine" (scoped to the authenticated user's role).

   HOW IT WORKS:
     1. On mount, validates the user session from localStorage
     2. Fetches the list of available YYYYMM months from the backend
     3. Auto-selects the current month (or closest available)
     4. When months or filter mode changes, fetches activities from the backend
     5. Renders a grid of month columns, each containing activities by category

   MONTH SELECTION RULES (enforced by toggleMonth):
     • Selection is always contiguous — no gaps allowed
     • Maximum 3 months can be selected at once
     • Middle months cannot be deselected — only the first or last
     • Clicking a non-adjacent month resets selection to just that month
     • Attempting an invalid action triggers a CSS shake animation

   FILTER BUTTON COLOUR LOGIC:
     • Inactive (unselected) = Blue (#017ACB) — inviting the user to click
     • Active (selected)     = Grey           — shows the current selection
     Both buttons are the same full width so they never shift size.

   SECURITY MODEL:
     • JWT token is injected into every API request via the Axios interceptor
       in @/lib/api.js — no manual token handling needed here.
     • User session is validated on mount — missing or malformed localStorage
       data forces an immediate redirect to /login.
     • emp_id is only included in the POST body when filterMode === 'mine'.
     • All data rendered in the UI comes from validated backend responses.

   DEPENDENCIES:
     • @/lib/api       — Axios instance with JWT Bearer token auto-injection
     • next/navigation — useRouter for back-navigation and login redirects
   ============================================================================= */

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

/* -----------------------------------------------------------------------------
   STYLES — centralised font applied consistently across all text elements.
----------------------------------------------------------------------------- */
const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' }
};

/* -----------------------------------------------------------------------------
   SHARED BUTTON CLASSES — neumorphic, matches all other pages in the app.
----------------------------------------------------------------------------- */
const btnClass = `
  px-4 py-2 rounded text-sm
  bg-[#017ACB] text-white
  border border-[#00263F]/50 dark:border-slate-500/60
  hover:bg-[#017ACB]/20 hover:text-gray-700
  dark:hover:bg-[#017ACB]/30 dark:hover:text-slate-100
  transition-colors
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  dark:active:shadow-[2px_2px_6px_rgba(0,0,0,0.45)]
  relative
  before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
  dark:before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.45)]
`;

const btnDarkClass = `
  px-4 py-2 rounded text-sm
  bg-[#003A5C] text-white
  border border-black/50 dark:border-slate-500/60
  dark:bg-[#0A5F8A] dark:text-white
  hover:bg-[#017ACB]/20 hover:text-gray-700
  dark:hover:bg-[#017ACB]/30 dark:hover:text-slate-100
  transition-colors
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  dark:active:shadow-[2px_2px_6px_rgba(0,0,0,0.45)]
  relative
  before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
  dark:before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.45)]
`;

/* -----------------------------------------------------------------------------
   FILTER TAB CLASS BUILDER
   -----------------------------------------------------------------------------
   isActive = true  (currently selected filter)
     → Blue (#017ACB) bg, white text — "you are here"

   isActive = false (the other option, not selected)
     → Grey bg, dark text — available to click to switch

   Both buttons are w-full so they stay the same size regardless of state.
----------------------------------------------------------------------------- */
const filterTabClass = (isActive) => `
  w-full px-4 py-2 rounded text-sm
  border border-[#00263F]/50 dark:border-slate-500/60
  ${isActive
    ? 'bg-[#017ACB] text-white hover:bg-[#017ACB]/20 hover:text-gray-700 dark:hover:bg-[#017ACB]/30 dark:hover:text-slate-100'
    : 'bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-200 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 hover:text-gray-700 dark:hover:text-slate-100'
  }
  transition-colors
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  dark:active:shadow-[2px_2px_6px_rgba(0,0,0,0.45)]
  relative
  before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
  dark:before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.45)]
`;

/* -----------------------------------------------------------------------------
   UTILITY: monthToIndex
   -----------------------------------------------------------------------------
   Converts a YYYYMM integer into a flat linear month index for arithmetic.
   Avoids JS Date edge cases when comparing adjacent months across year boundaries.
   EXAMPLE: 202503 → (2025 * 12) + 3 = 24303
----------------------------------------------------------------------------- */
const monthToIndex = (yyyymm) => {
  const year  = Math.floor(yyyymm / 100);
  const month = yyyymm % 100;
  return year * 12 + month;
};

/* =============================================================================
   COMPONENT: CalendarView
   ============================================================================= */
export default function CalendarView() {
  const router = useRouter();

  /* ---------------------------------------------------------------------------
     REF: selectorRef
     Attached to the floating selector panel so clicks outside it can be
     detected and the panel closed automatically.
  --------------------------------------------------------------------------- */
  const selectorRef = useRef(null);

  /* ---------------------------------------------------------------------------
     STATE
     user                — Authenticated user object parsed from localStorage
     availableMonths     — Full month list returned by GET /calendar-view
     selectedMonths      — YYYYMM values currently selected (1–3, contiguous)
     activitiesByMonth   — Activities grouped by month from POST /calendar-view
     filterMode          — 'all' = all employees, 'mine' = current user only
     showSelector        — Controls visibility of the floating month/filter panel
     shake               — Triggers CSS shake animation on invalid month selection
     loading flags       — Prevent rendering before data is ready
  --------------------------------------------------------------------------- */
  const [user, setUser]                           = useState(null);
  const [availableMonths, setAvailableMonths]     = useState([]);
  const [selectedMonths, setSelectedMonths]       = useState([]);
  const [activitiesByMonth, setActivitiesByMonth] = useState([]);
  const [filterMode, setFilterMode]               = useState('all');
  const [showSelector, setShowSelector]           = useState(false);
  const [shake, setShake]                         = useState(false);

  const [loadingUser, setLoadingUser]         = useState(true);
  const [loadingMonths, setLoadingMonths]     = useState(true);
  const [loadingCalendar, setLoadingCalendar] = useState(true);

  /* ---------------------------------------------------------------------------
     EFFECT: Close selector panel on outside click
     Attaches a mousedown listener only while the selector is open.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target)) {
        setShowSelector(false);
      }
    };

    if (showSelector) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSelector]);

  /* ---------------------------------------------------------------------------
     EFFECT: Load and validate user session from localStorage
     Clears storage and redirects to /login on any failure.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');

      if (!stored) {
        router.push('/login');
        return;
      }

      const parsed = JSON.parse(stored);

      if (!parsed?.emp_id) {
        console.warn('Invalid user object — forcing logout');
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }

      setUser(parsed);

    } catch (err) {
      console.error('LocalStorage parse error:', err);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      router.push('/login');

    } finally {
      setLoadingUser(false);
    }
  }, [router]);

  /* ---------------------------------------------------------------------------
     EFFECT: Load available months from the backend
     Auto-selects the current month, or the closest available if not found.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    async function loadMonths() {
      try {
        const res  = await api.get('/calendar-view');
        const data = res?.data;

        if (!data?.success) throw new Error('Failed to load months');

        const formatted = data.formatted || [];
        setAvailableMonths(formatted);

        if (formatted.length > 0) {
          const today         = new Date();
          const currentYYYYMM = today.getFullYear() * 100 + (today.getMonth() + 1);
          const match         = formatted.find(m => m.yyyymm === currentYYYYMM);

          if (match) {
            setSelectedMonths([match.yyyymm]);
          } else {
            /* No exact match — pick the closest available month by distance */
            const closest = formatted.reduce((prev, curr) =>
              Math.abs(curr.yyyymm - currentYYYYMM) < Math.abs(prev.yyyymm - currentYYYYMM)
                ? curr : prev
            );
            setSelectedMonths([closest.yyyymm]);
          }
        }

      } catch (err) {
        console.error('Error loading months:', err);
      } finally {
        setLoadingMonths(false);
      }
    }

    loadMonths();
  }, []);

  /* ---------------------------------------------------------------------------
     EFFECT: Load activities for the selected months
     Re-runs whenever selectedMonths, filterMode, or user changes.
     emp_id only sent when filterMode === 'mine'.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!user || selectedMonths.length === 0) {
      setActivitiesByMonth([]);
      return;
    }

    async function loadCalendar() {
      setLoadingCalendar(true);
      try {
        const res = await api.post('/calendar-view', {
          months: selectedMonths,
          ...(filterMode === 'mine' ? { emp_id: user.emp_id } : {})
        });

        const data = res?.data;
        if (!data?.success) throw new Error('Failed to load activities');

        /* Sort chronologically — backend order is not guaranteed */
        const sorted = (data.activitiesByMonth || [])
          .slice()
          .sort((a, b) => a.yyyymm - b.yyyymm);

        setActivitiesByMonth(sorted);

      } catch (err) {
        console.error('Error loading activities:', err);
      } finally {
        setLoadingCalendar(false);
      }
    }

    loadCalendar();
  }, [selectedMonths, filterMode, user]);

  /* ---------------------------------------------------------------------------
     EFFECT: Auto-close selector if no months are selected
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (selectedMonths.length === 0 && showSelector) setShowSelector(false);
  }, [selectedMonths, showSelector]);

  /* ---------------------------------------------------------------------------
     FUNCTION: triggerShake
     Fires a brief CSS shake animation to signal an invalid month selection.
  --------------------------------------------------------------------------- */
  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 150);
  };

  /* ---------------------------------------------------------------------------
     FUNCTION: toggleMonth
     ---------------------------------------------------------------------------
     Rules:
       1. Selection must always be contiguous — no gaps
       2. Maximum 3 months at once
       3. Only first or last month can be deselected (not middle)
       4. Clicking non-adjacent month resets to just that month
       5. Clicking at max (3) resets to the clicked month
  --------------------------------------------------------------------------- */
  const toggleMonth = (yyyymm) => {
    const idx = monthToIndex(yyyymm);

    if (selectedMonths.length === 0) {
      setSelectedMonths([yyyymm]);
      return;
    }

    const sorted     = [...selectedMonths].sort((a, b) => a - b);
    const first      = sorted[0];
    const last       = sorted[sorted.length - 1];
    const firstIdx   = monthToIndex(first);
    const lastIdx    = monthToIndex(last);
    const isSelected = selectedMonths.includes(yyyymm);

    if (isSelected) {
      if (yyyymm === first && selectedMonths.length > 1) {
        setSelectedMonths(sorted.slice(1));       // Remove first
        return;
      }
      if (yyyymm === last && selectedMonths.length > 1) {
        setSelectedMonths(sorted.slice(0, -1));   // Remove last
        return;
      }
      triggerShake(); // Middle month — invalid, show shake
      return;
    }

    const isAdjacentToStart = idx === firstIdx - 1;
    const isAdjacentToEnd   = idx === lastIdx  + 1;

    if (!isAdjacentToStart && !isAdjacentToEnd) {
      setSelectedMonths([yyyymm]); // Non-adjacent — reset
      return;
    }

    if (selectedMonths.length === 3) {
      setSelectedMonths([yyyymm]); // At max — reset
      return;
    }

    if (isAdjacentToStart) { setSelectedMonths([yyyymm, ...sorted]); return; }
    if (isAdjacentToEnd)   { setSelectedMonths([...sorted, yyyymm]); return; }
  };

  /* ---------------------------------------------------------------------------
     FUNCTION: applyFilters — closes the selector panel.
     Filter state is already live via React state.
  --------------------------------------------------------------------------- */
  const applyFilters = () => setShowSelector(false);

  /* ---------------------------------------------------------------------------
     FUNCTION: groupByCategory
     Groups a flat activities array into { Baseline: [], Strategic: [], ... }.
     Unknown categories get a dynamic bucket so no data is silently dropped.
  --------------------------------------------------------------------------- */
  const groupByCategory = (activities) => {
    const groups = { Baseline: [], Strategic: [], Discretionary: [], Vacation: [] };
    activities.forEach(a => {
      const cat = a.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(a.activity);
    });
    return groups;
  };

  /* ---------------------------------------------------------------------------
     LOADING STATE
  --------------------------------------------------------------------------- */
  if (loadingUser || loadingMonths || loadingCalendar) {
    return (
      <div className="h-[600px] page-surface flex items-center justify-center">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
          role="status"
          aria-label="Loading calendar data"
        />
      </div>
    );
  }

  /* ---------------------------------------------------------------------------
     RESPONSIVE GRID — columns scale with number of selected months
  --------------------------------------------------------------------------- */
  const gridCols =
    selectedMonths.length === 1 ? 'grid-cols-1' :
    selectedMonths.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
                                  'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  /* ===========================================================================
     RENDER
  =========================================================================== */
  return (
    <div className="w-full relative min-h-screen page-surface">

      {/* Shake keyframe — brief left-right animation for invalid month selection */}
      <style>{`
        @keyframes shake {
          0%   { transform: translateX(0); }
          25%  { transform: translateX(-3px); }
          50%  { transform: translateX(3px); }
          75%  { transform: translateX(-3px); }
          100% { transform: translateX(0); }
        }
      `}</style>

      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 relative">

        {/* =====================================================================
            PAGE HEADER — title and Back to Dashboard button
        ===================================================================== */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white" style={styles.outfitFont}>
              Calendar View
            </h2>
            <button onClick={() => router.back()} className={btnDarkClass} style={styles.outfitFont}>
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* =====================================================================
            GRID + SELECTOR WRAPPER
            position: relative anchors the floating selector to this container.
        ===================================================================== */}
        <div className="relative w-full">
          <div className="flex justify-center w-full relative">

            {/* MONTH GRID — one column per selected month */}
            <div
              id="monthGrid"
              className={`
                relative grid ${gridCols} w-full gap-0
                table-surface
                border border-black dark:border-slate-600
                rounded-lg bg-white dark:bg-slate-900 shadow-sm overflow-hidden
              `}
            >
              {activitiesByMonth.map((month, index) => {
                const groups = groupByCategory(month.activities || []);

                return (
                  <div
                    key={month.yyyymm}
                    className={`
                      flex flex-col border-black dark:border-slate-600
                      ${index > 0 ? 'border-t sm:border-t-0 sm:border-l' : ''}
                    `}
                  >
                    {/* MONTH HEADER BAR */}
                    <div
                      className={`
                        px-4 sm:px-6 py-3 border-b border-black dark:border-slate-600 bg-[#017ACB]
                        flex items-center relative
                        ${index === 0 ? 'rounded-tl-md' : ''}
                        ${index === activitiesByMonth.length - 1 ? 'rounded-tr-md' : ''}
                      `}
                    >
                      <h3 className="text-xl sm:text-2xl font-bold text-white" style={styles.outfitFont}>
                        {month.label}
                      </h3>

                      {/* Hamburger icon — only on the last column */}
                      {index === activitiesByMonth.length - 1 && (
                        <div
                          aria-label="Open month and filter selector"
                          role="button"
                          className={`
                            absolute right-2.5 flex flex-col justify-center gap-1.5
                            cursor-pointer select-none p-1
                            ${selectedMonths.length === 0 ? 'opacity-40 cursor-default' : ''}
                          `}
                          onClick={() => {
                            if (selectedMonths.length === 0) return;
                            setShowSelector(prev => !prev);
                          }}
                        >
                          <span className="block w-6 h-[3px] bg-white rounded" />
                          <span className="block w-6 h-[3px] bg-white rounded" />
                          <span className="block w-6 h-[3px] bg-white rounded" />
                        </div>
                      )}
                    </div>

                    {/* MONTH CONTENT — activities grouped by category */}
                    <div className="p-4 sm:p-6">
                      {month.activities.length === 0 ? (
                        <p className="text-black dark:text-slate-100 italic text-center" style={styles.outfitFont}>
                          No activities this month
                        </p>
                      ) : (
                        <div className="space-y-6">
                          {['Baseline', 'Strategic', 'Discretionary', 'Vacation'].map(cat => {
                            const items = groups[cat] || [];
                            if (items.length === 0) return null;
                            return (
                              <div key={cat}>
                                <h4 className="font-bold text-base sm:text-lg text-black dark:text-slate-100 mb-2" style={styles.outfitFont}>
                                  {cat}
                                </h4>
                                <ul className="list-disc pl-5 sm:pl-6 space-y-1 text-black dark:text-slate-100">
                                  {items.map((act, i) => (
                                    <li key={i} className="text-sm sm:text-base" style={styles.outfitFont}>
                                      {act}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ===============================================================
                FLOATING SELECTOR PANEL
                Opens on hamburger click. Styled like the Admin modal dropdowns
                — dark bg in dark mode, dark border, dark text.
            =============================================================== */}
            {showSelector && selectedMonths.length > 0 && (
              <div
                ref={selectorRef}
                className={`
                  absolute top-0 right-0 w-full sm:w-[20rem] max-w-full z-50
                  border border-black dark:border-slate-700
                  rounded-lg
                  bg-white dark:bg-slate-900
                  shadow-xl dark:shadow-[0_12px_40px_rgba(0,0,0,0.6)]
                  p-4
                  ${shake ? 'animate-[shake_0.15s_ease-in-out]' : ''}
                `}
              >
                <div className="flex gap-4">

                  {/* MONTH CHECKBOX LIST */}
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2 text-black dark:text-white" style={styles.outfitFont}>
                      Months
                    </h4>
                    <div className="flex flex-col gap-2 pr-1 mb-3">
                      {availableMonths.map(m => {
                        const isSelected = selectedMonths.includes(m.yyyymm);
                        return (
                          <label
                            key={m.yyyymm}
                            className="flex items-center gap-2 text-black dark:text-slate-100 text-sm cursor-pointer"
                            style={styles.outfitFont}
                          >
                            {/* Custom styled checkbox */}
                            <span className="w-4 h-4 flex-shrink-0 border border-black dark:border-slate-500 rounded-sm flex items-center justify-center relative overflow-hidden transition hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleMonth(m.yyyymm)}
                                className="opacity-0 absolute w-4 h-4 cursor-pointer"
                              />
                              {isSelected && (
                                <>
                                  <span className="absolute inset-0 bg-[#003A5C] dark:bg-[#0A5F8A]" />
                                  <svg className="absolute w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <polyline points="4 11 8 15 16 6" />
                                  </svg>
                                </>
                              )}
                            </span>
                            {m.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* VIEW FILTER + APPLY
                      Inactive = blue (clickable), Active = grey (current).
                      Dropdown panel styled dark to match Admin modals. */}
                  <div className="w-36 flex flex-col justify-between">
                    <div>
                      <h4 className="font-semibold mb-2 text-black dark:text-white" style={styles.outfitFont}>
                        View
                      </h4>
                      <div className="flex flex-col gap-2 mb-4">
                        {[
                          { mode: 'all',  label: 'All' },
                          { mode: 'mine', label: 'Just Mine' }
                        ].map(({ mode, label }) => (
                          <button
                            key={mode}
                            aria-pressed={filterMode === mode}
                            className={filterTabClass(filterMode === mode)}
                            onClick={() => setFilterMode(mode)}
                            style={styles.outfitFont}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Apply — closes the panel */}
                    <button
                      onClick={applyFilters}
                      className={`w-full font-semibold ${btnClass}`}
                      style={styles.outfitFont}
                    >
                      Apply
                    </button>
                  </div>

                </div>
              </div>
            )}

          </div>
        </div>

      </main>
    </div>
  );
}