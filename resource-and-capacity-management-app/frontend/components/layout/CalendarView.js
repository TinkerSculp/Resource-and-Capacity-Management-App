/* =============================================================================
   CalendarView.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Displays employee activities grouped by month in a responsive grid layout.
     Supports 1–3 month views with filtering by "All" or "Just Mine".

   SECURITY MODEL:
     • JWT token is injected into every API request via the centralised Axios
       interceptor in /lib/api.js — no manual token handling needed here.
     • User session is validated on mount: missing or malformed localStorage
       data forces an immediate redirect to /login, preventing unauthenticated
       access to any part of this view.
     • emp_id is only appended to POST body when filterMode === 'mine',
       ensuring the backend can scope results without the client over-sending
       identity data.
     • All data rendered in the UI comes from validated backend responses —
       no raw user input is ever injected into the DOM.
     • HTTPS enforcement and CORS restrictions are handled at the backend and
       Axios layer, so all requests to /calendar-view are already protected.

   DEPENDENCIES:
     • /lib/api.js    — Axios instance with JWT Bearer token interceptor
     • Next.js router — Used for back-navigation and login redirects
   ============================================================================= */

'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

/* -----------------------------------------------------------------------------
   FONT STYLE
   Used consistently across all text elements to maintain brand typography.
----------------------------------------------------------------------------- */
const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' }
};

/* -----------------------------------------------------------------------------
   UTILITY: monthToIndex
   -----------------------------------------------------------------------------
   Converts a YYYYMM integer into a flat linear month index.

   WHY: JavaScript Date arithmetic can produce off-by-one errors when crossing
   year boundaries. Using a linear index makes adjacent-month comparisons
   simple, predictable, and free of edge cases.

   EXAMPLE: 202503 → (2025 * 12) + 3 = 24303
----------------------------------------------------------------------------- */
const monthToIndex = (yyyymm) => {
  const year = Math.floor(yyyymm / 100);
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
     Attached to the floating selector panel so we can detect clicks outside
     it and close the panel automatically (improving UX on all devices).
  --------------------------------------------------------------------------- */
  const selectorRef = useRef(null);

  /* ---------------------------------------------------------------------------
     STATE
     • user             — Authenticated user object parsed from localStorage.
     • availableMonths  — Full list of months returned by the backend.
     • selectedMonths   — YYYYMM values the user has chosen to view (1–3).
     • activitiesByMonth — Activities data grouped by month from the backend.
     • filterMode       — 'all' shows all employees; 'mine' scopes to the user.
     • showSelector     — Controls visibility of the floating month/filter panel.
     • shake            — Triggers a CSS shake animation on invalid selection.
     • loading flags    — Prevent rendering before data is ready.
  --------------------------------------------------------------------------- */
  const [user, setUser] = useState(null);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [activitiesByMonth, setActivitiesByMonth] = useState([]);
  const [filterMode, setFilterMode] = useState('all');
  const [showSelector, setShowSelector] = useState(false);
  const [shake, setShake] = useState(false);

  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingMonths, setLoadingMonths] = useState(true);
  const [loadingCalendar, setLoadingCalendar] = useState(true);

  /* ---------------------------------------------------------------------------
     EFFECT: Close selector panel on outside click
     ---------------------------------------------------------------------------
     Attaches a mousedown listener to the document only while the selector is
     open, then cleans it up when it closes or the component unmounts.
     This prevents stale listeners accumulating and leaking memory.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    const handleClickOutside = (e) => {
      // If the click target is outside the selector panel, close it
      if (selectorRef.current && !selectorRef.current.contains(e.target)) {
        setShowSelector(false);
      }
    };
    if (showSelector) document.addEventListener('mousedown', handleClickOutside);
    // Cleanup: always remove the listener when effect re-runs or unmounts
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSelector]);

  /* ---------------------------------------------------------------------------
     EFFECT: Load and validate user session from localStorage
     ---------------------------------------------------------------------------
     SECURITY:
     • Wrapped in try/catch to prevent crashes from corrupted JSON.
     • Validates presence of emp_id — the minimum required identity field.
     • On any failure, clears both user object and JWT token from storage
       and redirects to /login, preventing partial/broken session states.
     • Only runs on the client (localStorage is not available during SSR).
  --------------------------------------------------------------------------- */
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');

      // No session found — redirect to login immediately
      if (!stored) {
        router.push('/login');
        return;
      }

      const parsed = JSON.parse(stored);

      // Validate minimum required fields on the user object
      if (!parsed?.emp_id) {
        console.warn('Invalid user object — forcing logout');
        localStorage.removeItem('user');
        localStorage.removeItem('token'); // Also clear the JWT token
        router.push('/login');
        return;
      }

      setUser(parsed);
    } catch (err) {
      // Malformed JSON or unexpected error — clear storage and redirect
      console.error('LocalStorage parse error:', err);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      router.push('/login');
    } finally {
      // Always mark user loading as complete, even on failure
      setLoadingUser(false);
    }
  }, [router]);

  /* ---------------------------------------------------------------------------
     EFFECT: Load available months from the backend
     ---------------------------------------------------------------------------
     Fetches the list of months the user can select. On success, auto-selects
     the current month if available, or the closest available month if not.

     SECURITY:
     • The JWT token is automatically attached by the Axios interceptor in
       /lib/api.js — no manual token handling required here.
     • Backend response is validated before use (checks data.success flag).
     • Falls back to an empty array if the response is malformed, preventing
       undefined values from propagating into selection logic.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    async function loadMonths() {
      try {
        // GET /calendar-view — returns { success, formatted: [{ yyyymm, label }] }
        // JWT Bearer token is injected automatically by the Axios interceptor
        const res = await api.get('/calendar-view');
        const data = res?.data;

        if (!data?.success) throw new Error('Failed to load months');

        const formatted = data.formatted || [];
        setAvailableMonths(formatted);

        if (formatted.length > 0) {
          // Determine the current month as a YYYYMM integer for comparison
          const today = new Date();
          const currentYYYYMM = today.getFullYear() * 100 + (today.getMonth() + 1);

          // Try to find an exact match for the current month
          const match = formatted.find((m) => m.yyyymm === currentYYYYMM);

          if (match) {
            // Exact match found — select the current month
            setSelectedMonths([match.yyyymm]);
          } else {
            // No exact match — select the closest available month by distance
            const closest = formatted.reduce((prev, curr) =>
              Math.abs(curr.yyyymm - currentYYYYMM) < Math.abs(prev.yyyymm - currentYYYYMM)
                ? curr
                : prev
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
     EFFECT: Load activities for the currently selected months
     ---------------------------------------------------------------------------
     Re-runs whenever selectedMonths, filterMode, or user changes.
     Sends a POST request with the selected month range and optional emp_id
     scoping so the backend can return the correct dataset.

     SECURITY:
     • emp_id is only included when filterMode === 'mine' — avoids sending
       unnecessary identity data in the 'all' case.
     • The JWT token is attached automatically by the Axios interceptor,
       ensuring this endpoint is always called with authentication.
     • Backend response is validated before updating state.
     • Aborts early if user or selectedMonths is not yet available.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    // Guard: don't fetch until user is loaded and at least one month is selected
    if (!user || selectedMonths.length === 0) {
      setActivitiesByMonth([]);
      return;
    }

    async function loadCalendar() {
      setLoadingCalendar(true);

      try {
        // POST /calendar-view — returns { success, activitiesByMonth: [...] }
        // Conditionally include emp_id only when filtering to the current user
        const res = await api.post('/calendar-view', {
          months: selectedMonths,
          ...(filterMode === 'mine' ? { emp_id: user.emp_id } : {})
        });

        const data = res?.data;
        if (!data?.success) throw new Error('Failed to load activities');

        // Sort months chronologically for stable, predictable rendering order
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
     ---------------------------------------------------------------------------
     Prevents the selector panel from being open in an invalid state where
     there are no months to display or interact with.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (selectedMonths.length === 0 && showSelector) setShowSelector(false);
  }, [selectedMonths, showSelector]);

  /* ---------------------------------------------------------------------------
     FUNCTION: triggerShake
     ---------------------------------------------------------------------------
     Fires a brief CSS shake animation on the selector panel to provide visual
     feedback when the user attempts an invalid month selection (e.g. trying
     to deselect a middle month that would break the contiguous range).
  --------------------------------------------------------------------------- */
  const triggerShake = () => {
    setShake(true);
    // Reset after animation completes (150ms matches the keyframe duration)
    setTimeout(() => setShake(false), 150);
  };

  /* ---------------------------------------------------------------------------
     FUNCTION: toggleMonth
     ---------------------------------------------------------------------------
     Handles month selection with the following rules enforced:
       1. Selection must always be contiguous (no gaps allowed).
       2. Maximum of 3 months can be selected at once.
       3. Middle months cannot be deselected — only the first or last.
       4. Clicking a non-adjacent month resets selection to just that month.

     PARAM: yyyymm {number} — The month to toggle, e.g. 202503
  --------------------------------------------------------------------------- */
  const toggleMonth = (yyyymm) => {
    const idx = monthToIndex(yyyymm);

    // If nothing is selected yet, simply select this month
    if (selectedMonths.length === 0) {
      setSelectedMonths([yyyymm]);
      return;
    }

    // Sort current selection to reliably identify the first and last months
    const sorted = [...selectedMonths].sort((a, b) => a - b);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const firstIdx = monthToIndex(first);
    const lastIdx = monthToIndex(last);
    const isSelected = selectedMonths.includes(yyyymm);

    if (isSelected) {
      // Allow deselecting only the first or last month (not a middle month)
      if (yyyymm === first && selectedMonths.length > 1) {
        setSelectedMonths(sorted.slice(1)); // Remove first month
        return;
      }
      if (yyyymm === last && selectedMonths.length > 1) {
        setSelectedMonths(sorted.slice(0, -1)); // Remove last month
        return;
      }
      // Middle month — shake to signal this action is not allowed
      triggerShake();
      return;
    }

    // Determine whether the new month is adjacent to the current range
    const isAdjacentToStart = idx === firstIdx - 1;
    const isAdjacentToEnd = idx === lastIdx + 1;

    // Non-adjacent click — reset selection to only this month
    if (!isAdjacentToStart && !isAdjacentToEnd) {
      setSelectedMonths([yyyymm]);
      return;
    }

    // Already at max (3 months) — reset to just this month
    if (selectedMonths.length === 3) {
      setSelectedMonths([yyyymm]);
      return;
    }

    // Extend range: prepend or append based on adjacency
    if (isAdjacentToStart) {
      setSelectedMonths([yyyymm, ...sorted]);
      return;
    }
    if (isAdjacentToEnd) {
      setSelectedMonths([...sorted, yyyymm]);
      return;
    }
  };

  /* ---------------------------------------------------------------------------
     FUNCTION: applyFilters
     Closes the selector panel when the user clicks "Apply".
     The filter changes are already live via state — this just dismisses the UI.
  --------------------------------------------------------------------------- */
  const applyFilters = () => setShowSelector(false);

  /* ---------------------------------------------------------------------------
     FUNCTION: groupByCategory
     ---------------------------------------------------------------------------
     Organises a flat array of activity objects into a keyed object grouped by
     category name. Unknown categories are placed under 'Other' rather than
     being silently dropped, ensuring no data is lost if the backend introduces
     a new category without a frontend update.

     PARAM:  activities {Array} — Raw activities array from backend response.
     RETURN: {Object}           — { Baseline: [], Strategic: [], ... }
  --------------------------------------------------------------------------- */
  const groupByCategory = (activities) => {
    // Pre-initialise known categories so render order is deterministic
    const groups = { Baseline: [], Strategic: [], Discretionary: [], Vacation: [] };

    activities.forEach((a) => {
      const cat = a.category || 'Other';
      // Dynamically create bucket for unknown categories rather than dropping them
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(a.activity);
    });

    return groups;
  };

  /* ---------------------------------------------------------------------------
     LOADING STATE
     ---------------------------------------------------------------------------
     Blocks all rendering until user session, available months, and calendar
     activities are all fully loaded. Prevents flash of unauthenticated UI
     and avoids rendering with incomplete data.
  --------------------------------------------------------------------------- */
  if (loadingUser || loadingMonths || loadingCalendar) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        {/* Accessible spinner — visible during all data fetch operations */}
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
          role="status"
          aria-label="Loading calendar data"
        />
      </div>
    );
  }

  /* ---------------------------------------------------------------------------
     RESPONSIVE GRID CONFIGURATION
     ---------------------------------------------------------------------------
     Tailwind responsive grid classes are determined at render time based on
     how many months the user has selected:

       1 month  → always 1 column, full width
       2 months → 1 col on mobile, 2 cols on md+
       3 months → 1 col on mobile, 2 on sm, 3 on lg+

     The grid always fills the full available width — no artificial max-width
     constraints. This gives the content room to breathe on large monitors
     while stacking cleanly on smaller screens.
  --------------------------------------------------------------------------- */
  const gridCols =
    selectedMonths.length === 1
      ? 'grid-cols-1'
      : selectedMonths.length === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  /* ===========================================================================
     RENDER
     ===========================================================================
     All values rendered here come from validated backend responses or
     controlled internal state. No raw user input is injected into the DOM,
     preventing XSS risks.
  =========================================================================== */
  return (
    <div className="w-full relative">

      {/* -----------------------------------------------------------------------
          KEYFRAME: shake
          Brief left-right shake animation applied to the selector panel when
          the user attempts an invalid month selection (e.g. deselecting a
          middle month). Purely visual — no logic impact.
      ----------------------------------------------------------------------- */}
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

        {/* ---------------------------------------------------------------------
            PAGE HEADER
            ---------------------------------------------------------------------
            Contains the page title and a back-navigation button.
            router.back() uses browser history — no hardcoded redirect paths,
            making this safe and flexible regardless of how the user arrived.
        --------------------------------------------------------------------- */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-4">

            {/* Page title */}
            <h2
              className="text-2xl sm:text-3xl font-bold text-black"
              style={styles.outfitFont}
            >
              Calendar View
            </h2>

            {/* Back button — uses browser history, no unsafe redirect */}
                    <button
          onClick={() => router.back()}
          className="
            px-4 py-2 rounded text-sm
            bg-[#003A5C] text-white border border-black/50
            hover:bg-[#017ACB]/20 transition-colors hover:text-gray-700
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  relative
  before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
          "
          style={styles.outfitFont}
        >
          Back to Dashboard
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------------------------
            GRID + SELECTOR WRAPPER
            ---------------------------------------------------------------------
            position: relative on this wrapper allows the floating selector
            panel to use absolute positioning anchored to the grid's top-right
            corner, rather than the viewport.
        --------------------------------------------------------------------- */}
        <div className="relative w-full">
          <div className="flex justify-center w-full relative">

            {/* -----------------------------------------------------------------
                MONTH GRID
                -----------------------------------------------------------------
                Renders one column per selected month. Each column contains a
                coloured header bar and a list of activities grouped by category.

                Layout behaviour:
                  • w-full — always fills the available container width
                  • overflow-hidden clips child borders at rounded corners
                  • Border dividers between columns switch from border-t (stacked
                    on mobile) to border-l (side-by-side on desktop)
            ----------------------------------------------------------------- */}
            <div
              id="monthGrid"
              className={`
                relative
                grid ${gridCols}
                w-full
                gap-0
                border border-black
                rounded-lg
                bg-white
                shadow
                overflow-hidden
              `}
            >
              {activitiesByMonth.map((month, index) => {

                // Group this month's activities into category buckets for rendering
                const groups = groupByCategory(month.activities || []);

                return (
                  <div
                    key={month.yyyymm}
                    className={`
                      flex flex-col border-black
                      ${index > 0 ? 'border-t sm:border-t-0 sm:border-l' : ''}
                    `}
                  >
                    {/* -----------------------------------------------------------
                        MONTH HEADER BAR
                        -----------------------------------------------------------
                        Displays the month label (e.g. "Mar-26") with a branded
                        background. The hamburger menu icon is only rendered on the
                        last column so it appears once in the top-right of the grid.
                    ----------------------------------------------------------- */}
                    <div
                      className={`
                        px-4 sm:px-6 py-3 border-b border-black bg-[#017ACB]
                        flex items-center relative
                        ${index === 0 ? 'rounded-tl-md' : ''}
                        ${index === activitiesByMonth.length - 1 ? 'rounded-tr-md' : ''}
                      `}
                    >
                      {/* Month label — sanitised by the backend, rendered as plain text */}
                      <h3
                        className="text-xl sm:text-2xl font-bold text-white"
                        style={styles.outfitFont}
                      >
                        {month.label}
                      </h3>

                      {/* Hamburger icon — only rendered on the last month column.
                          Disabled (visually faded) if no months are selected. */}
                      {index === activitiesByMonth.length - 1 && (
                        <div
                          aria-label="Open month and filter selector"
                          role="button"
                          className={`
                            absolute right-2.5
                            flex flex-col justify-center gap-1.5
                            cursor-pointer select-none p-1
                            ${selectedMonths.length === 0 ? 'opacity-40 cursor-default' : ''}
                          `}
                          onClick={() => {
                            if (selectedMonths.length === 0) return;
                            setShowSelector((prev) => !prev);
                          }}
                        >
                          <span className="block w-6 h-[3px] bg-white rounded"></span>
                          <span className="block w-6 h-[3px] bg-white rounded"></span>
                          <span className="block w-6 h-[3px] bg-white rounded"></span>
                        </div>
                      )}
                    </div>

                    {/* -----------------------------------------------------------
                        MONTH CONTENT
                        -----------------------------------------------------------
                        Renders activities grouped under category headings.
                        All activity text comes from validated backend data —
                        rendered as plain text (not HTML), preventing XSS.
                    ----------------------------------------------------------- */}
                    <div className="p-4 sm:p-6">
                      {month.activities.length === 0 ? (
                        // Empty state — shown when no activities exist for the month
                        <p className="text-black italic text-center" style={styles.outfitFont}>
                          No activities this month
                        </p>
                      ) : (
                        <div className="space-y-6">
                          {/* Render categories in a fixed display order */}
                          {['Baseline', 'Strategic', 'Discretionary', 'Vacation'].map((cat) => {
                            const items = groups[cat] || [];
                            // Skip categories with no items to keep the UI clean
                            if (items.length === 0) return null;

                            return (
                              <div key={cat}>
                                {/* Category heading */}
                                <h4
                                  className="font-bold text-base sm:text-lg text-black mb-2"
                                  style={styles.outfitFont}
                                >
                                  {cat}
                                </h4>

                                {/* Activity list — plain text, no HTML injection risk */}
                                <ul className="list-disc pl-5 sm:pl-6 space-y-1 text-black">
                                  {items.map((act, i) => (
                                    <li
                                      key={i}
                                      className="text-sm sm:text-base"
                                      style={styles.outfitFont}
                                    >
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

            {/* -----------------------------------------------------------------
                FLOATING SELECTOR PANEL
                -----------------------------------------------------------------
                Appears when the user clicks the hamburger icon. Allows the user
                to change the visible month range (1–3 contiguous months) and
                toggle between viewing all employees or just themselves.

                Positioning:
                  • absolute top-0 right-0 — anchored to the grid wrapper
                  • w-full on mobile, sm:w-[20rem] on larger screens
                  • z-50 — floats above all grid content

                Security:
                  • availableMonths is validated before render
                  • filterMode is controlled internal state — not user input
                  • All labels are plain text — no HTML injection possible
                  • Outside-click detection via selectorRef closes panel safely
            ----------------------------------------------------------------- */}
            {showSelector && selectedMonths.length > 0 && (
              <div
                ref={selectorRef}
                className={`
                  absolute top-0 right-0
                  w-full sm:w-[20rem]
                  max-w-full
                  border border-black rounded-lg bg-white shadow-xl p-4 z-50
                  ${shake ? 'animate-[shake_0.15s_ease-in-out]' : ''}
                `}
              >
                <div className="flex gap-4">

                  {/* -------------------------------------------------------------
                      MONTH CHECKBOX LIST
                      -------------------------------------------------------------
                      Renders one checkbox per available month. Checked state is
                      fully controlled — the hidden <input> triggers toggleMonth
                      which enforces contiguity and range rules.
                  ------------------------------------------------------------- */}
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2 text-black" style={styles.outfitFont}>
                      Months
                    </h4>

                    <div className="flex flex-col gap-2 pr-1 mb-3">
                      {availableMonths.map((m) => {
                        const isSelected = selectedMonths.includes(m.yyyymm);

                        return (
                          <label
                            key={m.yyyymm}
                            className="flex items-center gap-2 text-black text-sm cursor-pointer"
                            style={styles.outfitFont}
                          >
                            {/* Custom styled checkbox — visually replaces native input */}
                            <span className="
                              w-4 h-4 flex-shrink-0 border border-black rounded-sm
                              flex items-center justify-center relative overflow-hidden
                              transition hover:bg-[#017ACB]/20
                            ">
                              {/* Hidden native checkbox — handles onChange for accessibility */}
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleMonth(m.yyyymm)}
                                className="opacity-0 absolute w-4 h-4 cursor-pointer"
                              />

                              {/* Filled state: dark background + white checkmark SVG */}
                              {isSelected && (
                                <>
                                  <span className="absolute inset-0 bg-[#003A5C]"></span>
                                  <svg
                                    className="absolute w-3 h-3"
                                    viewBox="0 0 20 20"
                                    fill="none"
                                    stroke="white"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                  >
                                    <polyline points="4 11 8 15 16 6" />
                                  </svg>
                                </>
                              )}
                            </span>

                            {/* Month label — sanitised by backend, plain text */}
                            {m.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* -------------------------------------------------------------
                      VIEW FILTER + APPLY BUTTON
                      -------------------------------------------------------------
                      "All" shows activities for all employees.
                      "Just Mine" scopes the POST request to the current user's
                      emp_id, handled in the loadCalendar effect above.
                  ------------------------------------------------------------- */}
                  <div className="w-36 flex flex-col justify-between">
                    <div>
                      <h4 className="font-semibold mb-2 text-black" style={styles.outfitFont}>
                        View
                      </h4>

                      <div className="flex flex-col gap-2 mb-4">

                        {/* All employees filter */}
                        <button
                          aria-pressed={filterMode === 'all'}
                          className={`
                            px-4 py-2 rounded text-sm transition-colors border border-[#00263F]/50
                            ${filterMode === 'all'
                              ? 'bg-[#017ACB] text-white hover:bg-[#017ACB]/20 hover:text-gray-700'
                              : 'bg-gray-200 text-gray-700 hover:bg-[#017ACB]/20'
                            }
                            shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
                            active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
                            relative
                            before:content-[''] before:absolute before:inset-0 before:rounded
                            before:pointer-events-none
                            before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
                          `}
                          onClick={() => setFilterMode('all')}
                          style={styles.outfitFont}
                        >
                          All
                        </button>

                        {/* Current user filter — appends emp_id to the API request */}
                        <button
                          aria-pressed={filterMode === 'mine'}
                          className={`
                            px-4 py-2 rounded text-sm transition-colors border border-[#00263F]/50
                            ${filterMode === 'mine'
                              ? 'bg-[#017ACB] text-white hover:bg-[#017ACB]/20 hover:text-gray-700'
                              : 'bg-gray-200 text-gray-700 hover:bg-[#017ACB]/20'
                            }
                            shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
                            active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
                            relative
                            before:content-[''] before:absolute before:inset-0 before:rounded
                            before:pointer-events-none
                            before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
                          `}
                          onClick={() => setFilterMode('mine')}
                          style={styles.outfitFont}
                        >
                          Just Mine
                        </button>
                      </div>
                    </div>

                    {/* Apply button — closes the panel; filter is already live via state */}
                    <button
                      onClick={applyFilters}
                      className="
                        w-full px-4 py-2 rounded text-sm font-semibold transition-colors
                        bg-[#017ACB] text-white hover:bg-[#017ACB]/20 hover:text-gray-700
                        border border-black/50
                        shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
                        active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
                        relative
                        before:content-[''] before:absolute before:inset-0 before:rounded
                        before:pointer-events-none
                        before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
                      "
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
