'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' }
};

/**
 * ---------------------------------------------------------------------------
 * UTILITY: Convert YYYYMM → linear index
 * ---------------------------------------------------------------------------
 * SECURITY:
 * • Pure math helper — no external input used directly.
 * • Prevents invalid month arithmetic in selection logic.
 * ---------------------------------------------------------------------------
 */
const monthToIndex = (yyyymm) => {
  const year = Math.floor(yyyymm / 100);
  const month = yyyymm % 100;
  return year * 12 + month;
};

export default function CalendarView() {
  const router = useRouter();

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

  /* -------------------------------------------------------------------------
     LOAD USER FROM LOCAL STORAGE (SECURE)
     -------------------------------------------------------------------------
     SECURITY:
     • Wrapped in try/catch to prevent crashes from malformed JSON.
     • Validates presence of emp_id to ensure session integrity.
     • Forces logout if user object is corrupted or missing.
     • Prevents SSR from touching browser APIs.
  ------------------------------------------------------------------------- */
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

  /* -------------------------------------------------------------------------
     LOAD AVAILABLE MONTHS
     -------------------------------------------------------------------------
     SECURITY:
     • Validates backend response before using it.
     • Prevents undefined/null values from breaking UI.
     • Selects closest month if current month is unavailable.
  ------------------------------------------------------------------------- */
  useEffect(() => {
    async function loadMonths() {
      try {
        const res = await api.get('/calendar-view');
        const data = res?.data;

        if (!data?.success) throw new Error('Failed to load months');

        const formatted = data.formatted || [];
        setAvailableMonths(formatted);

        if (formatted.length > 0) {
          const today = new Date();
          const currentYYYYMM =
            today.getFullYear() * 100 + (today.getMonth() + 1);

          const match = formatted.find((m) => m.yyyymm === currentYYYYMM);

          if (match) {
            setSelectedMonths([match.yyyymm]);
          } else {
            const closest = formatted.reduce((prev, curr) =>
              Math.abs(curr.yyyymm - currentYYYYMM) <
              Math.abs(prev.yyyymm - currentYYYYMM)
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

  /* -------------------------------------------------------------------------
     LOAD ACTIVITIES FOR SELECTED MONTHS
     -------------------------------------------------------------------------
     SECURITY:
     • POST body is controlled — only validated months + optional emp_id.
     • Prevents undefined arrays from breaking UI.
     • Sorts months chronologically for stable rendering.
  ------------------------------------------------------------------------- */
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

  /* -------------------------------------------------------------------------
     AUTO-CLOSE MONTH SELECTOR
     -------------------------------------------------------------------------
     SECURITY:
     • Prevents selector from staying open with invalid state.
  ------------------------------------------------------------------------- */
  useEffect(() => {
    if (selectedMonths.length === 0 && showSelector) {
      setShowSelector(false);
    }
  }, [selectedMonths, showSelector]);

  /* -------------------------------------------------------------------------
     SHAKE ANIMATION (UX ONLY)
  ------------------------------------------------------------------------- */
  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 150);
  };

  /* -------------------------------------------------------------------------
     CONTIGUOUS MONTH SELECTION LOGIC
     -------------------------------------------------------------------------
     SECURITY:
     • Prevents invalid month ranges (gaps, non-adjacent selections).
     • Ensures selection stays within 1–3 months.
     • Prevents removing middle month to avoid broken ranges.
  ------------------------------------------------------------------------- */
  const toggleMonth = (yyyymm) => {
    const idx = monthToIndex(yyyymm);

    if (selectedMonths.length === 0) {
      setSelectedMonths([yyyymm]);
      return;
    }

    const sorted = [...selectedMonths].sort((a, b) => a - b);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const firstIdx = monthToIndex(first);
    const lastIdx = monthToIndex(last);

    const isSelected = selectedMonths.includes(yyyymm);

    if (isSelected) {
      if (yyyymm === first && selectedMonths.length > 1) {
        setSelectedMonths(sorted.slice(1));
        return;
      }
      if (yyyymm === last && selectedMonths.length > 1) {
        setSelectedMonths(sorted.slice(0, -1));
        return;
      }

      triggerShake();
      return;
    }

    const isAdjacentToStart = idx === firstIdx - 1;
    const isAdjacentToEnd = idx === lastIdx + 1;

    if (!isAdjacentToStart && !isAdjacentToEnd) {
      setSelectedMonths([yyyymm]);
      return;
    }

    if (selectedMonths.length === 3) {
      setSelectedMonths([yyyymm]);
      return;
    }

    if (isAdjacentToStart) {
      setSelectedMonths([yyyymm, ...sorted]);
      return;
    }
    if (isAdjacentToEnd) {
      setSelectedMonths([...sorted, yyyymm]);
      return;
    }
  };

  /**
   * -------------------------------------------------------------------------
   * REUSABLE CHECKBOX (SECURE)
   * -------------------------------------------------------------------------
   * SECURITY:
   * • readOnly input prevents React warnings.
   * • No uncontrolled state — purely visual.
   * • overflow-hidden prevents SVG bleed.
   * -------------------------------------------------------------------------
   */
  const Checkbox = ({ checked }) => (
    <span
      className="
        w-4 h-4
        border border-black rounded-sm
        flex items-center justify-center
        transition relative overflow-hidden
        flex-shrink-0
      "
    >
      <input
        type="checkbox"
        checked={checked}
        readOnly
        className="opacity-0 absolute w-4 h-4 cursor-pointer"
      />

      {checked && (
        <>
          <span className="absolute inset-0" style={{ backgroundColor: '#003A5C' }}></span>
          <svg
            className="absolute w-3 h-3 text-white"
            viewBox="0 0 20 20"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="4 11 8 15 16 6" />
          </svg>
        </>
      )}
    </span>
  );

  /* -------------------------------------------------------------------------
     APPLY FILTERS
  ------------------------------------------------------------------------- */
  const applyFilters = () => {
    setShowSelector(false);
  };

  /* -------------------------------------------------------------------------
     GROUP ACTIVITIES BY CATEGORY
     -------------------------------------------------------------------------
     SECURITY:
     • Ensures stable grouping even if backend sends unexpected categories.
     • Prevents undefined keys from breaking UI.
  ------------------------------------------------------------------------- */
  const groupByCategory = (activities) => {
    const groups = {
      Baseline: [],
      Strategic: [],
      Discretionary: [],
      Vacation: []
    };

    activities.forEach((a) => {
      const cat = a.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(a.activity);
    });

    return groups;
  };

  /* -------------------------------------------------------------------------
     LOADING STATE
     -------------------------------------------------------------------------
     SECURITY:
     • Prevents rendering UI before user + months + activities are validated.
  ------------------------------------------------------------------------- */
  if (loadingUser || loadingMonths || loadingCalendar) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------
     GRID LAYOUT CALCULATIONS
     -------------------------------------------------------------------------
     SECURITY:
     • Ensures predictable layout for 1–3 month views.
     • Prevents overflow on wide screens.
  ------------------------------------------------------------------------- */
  const gridCols =
    selectedMonths.length === 1
      ? 'grid-cols-1'
      : selectedMonths.length === 2
      ? 'grid-cols-2'
      : 'grid-cols-3';

  const gridWidth =
    selectedMonths.length === 3 ? 'max-w-[95%]' : 'max-w-[70%]';

  /* ---------------------------------------------------------
   FINAL RENDER
   ---------------------------------------------------------
   SECURITY:
   • All UI rendering depends on validated + sanitized state.
   • No direct rendering of backend data without prior checks.
   • Prevents injection by treating all labels as plain text.
--------------------------------------------------------- */
return (
  <div className="w-full relative">
    <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 relative">

      {/* -----------------------------------------------------
         PAGE HEADER
         -----------------------------------------------------
         SECURITY:
         • Back button uses router.back() — no unsafe redirects.
         • Title is static text — no dynamic injection risk.
      ----------------------------------------------------- */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2
            className="text-3xl font-bold text-black"
            style={styles.outfitFont}
          >
            Calendar View
          </h2>

          <button
            onClick={() => router.back()}
            className="
              px-4 py-2 rounded text-sm
              bg-gray-200 text-gray-700 border
              hover:bg-[#017ACB]/20 transition-colors
              shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
              active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
            "
            style={styles.outfitFont}
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="relative flex justify-center w-full">

        {/* -----------------------------------------------------
           MONTH GRID
           -----------------------------------------------------
           SECURITY:
           • activitiesByMonth is validated before render.
           • No raw backend objects are rendered directly.
           • Grid layout is deterministic and prevents overflow.
        ----------------------------------------------------- */}
        <div
          id="monthGrid"
          className={`
            relative
            grid ${gridCols}
            ${gridWidth}
            min-w-175
            gap-0
            border border-black
            rounded-lg
            bg-white
            shadow
          `}
        >
          {activitiesByMonth.map((month, index) => {
            const groups = groupByCategory(month.activities || []);

            return (
              <div
                key={month.yyyymm}
                className={`flex flex-col border-black ${
                  index > 0 ? 'border-l' : ''
                }`}
              >

                {/* -------------------------------------------------
                   MONTH HEADER
                   -------------------------------------------------
                   SECURITY:
                   • month.label is sanitized in backend.
                   • Chevron toggle is disabled when invalid.
                ------------------------------------------------- */}
                <div
                  className={`
                    px-6 py-3 border-b border-black bg-[#017ACB] flex items-center relative
                    ${index === 0 ? 'rounded-tl-md' : ''}
                    ${index === activitiesByMonth.length - 1 ? 'rounded-tr-md' : ''}
                  `}
                >
                  <h3
                    className="text-2xl font-bold text-white"
                    style={styles.outfitFont}
                  >
                    {month.label}
                  </h3>

                  {index === activitiesByMonth.length - 1 && (
                    <div
                      className={`
                        absolute
                        right-2.5
                        text-white text-4xl font-normal cursor-pointer select-none
                        ${
                          selectedMonths.length === 0
                            ? 'opacity-40 cursor-default'
                            : ''
                        }
                      `}
                      style={{
                        transform:
                          showSelector && selectedMonths.length > 0
                            ? 'rotate(90deg)'
                            : 'rotate(-90deg)',
                        transition: 'transform 0.2s ease'
                      }}
                      onClick={() => {
                        if (selectedMonths.length === 0) return;
                        setShowSelector((prev) => !prev);
                      }}
                    >
                      {'<'}
                    </div>
                  )}
                </div>

                {/* -------------------------------------------------
                   MONTH CONTENT
                   -------------------------------------------------
                   SECURITY:
                   • Activities list is sanitized + deduped in backend.
                   • No HTML injection — all values rendered as plain text.
                ------------------------------------------------- */}
                <div className="p-6">
                  {month.activities.length === 0 ? (
                    <p
                      className="text-black italic text-center"
                      style={styles.outfitFont}
                    >
                      No activities this month
                    </p>
                  ) : (
                    <div className="space-y-6">
                      {['Baseline', 'Strategic', 'Discretionary', 'Vacation'].map(
                        (cat) => {
                          const items = groups[cat] || [];
                          if (items.length === 0) return null;

                          return (
                            <div key={cat}>
                              <h4
                                className="font-bold text-lg text-black mb-2"
                                style={styles.outfitFont}
                              >
                                {cat}
                              </h4>

                              <ul className="list-disc pl-6 space-y-1 text-black">
                                {items.map((act, i) => (
                                  <li
                                    key={i}
                                    className="text-md"
                                    style={styles.outfitFont}
                                  >
                                    {act}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* -----------------------------------------------------
           FLOATING SELECTOR PANEL
           -----------------------------------------------------
           SECURITY:
           • Only appears when selectedMonths is valid.
           • shake animation is purely visual — no logic impact.
           • Inline @keyframes is safe because static.
        ----------------------------------------------------- */}
        {showSelector && selectedMonths.length > 0 && (
          <div
          className={`
            absolute top-0
            w-[20rem]                 /* default = laptop */
            [@media(min-width:1400px)]:w-[22rem]   /* real monitors */
            [@media(min-width:1700px)]:w-[26rem]   /* large monitors */
            [@media(min-width:2000px)]:w-[28rem]   /* ultra-wide */
            max-w-[90vw]
            border border-black rounded-lg bg-white shadow p-4 z-9999
            min-h-96
            ${shake ? 'animate-[shake_0.15s_ease-in-out]' : ''}
          `}
          style={{ left: 'calc(50% + 360px)' }}
          >
            <style>
              {`
                @keyframes shake {
                  0% { transform: translateX(0); }
                  25% { transform: translateX(-3px); }
                  50% { transform: translateX(3px); }
                  75% { transform: translateX(-3px); }
                  100% { transform: translateX(0); }
                }
              `}
            </style>

            <div className="flex gap-4">

            {/* -------------------------------------------------
              MONTH CHECKBOXES
              -------------------------------------------------
              SECURITY:
              • availableMonths is validated before render.
              • No dynamic HTML injection — all values are plain text.
              • Keys use stable YYYYMM values to prevent React mismatches.
            ------------------------------------------------- */}
            <div className="flex-1">
              <h4
                className="font-semibold mb-2 text-black"
                style={styles.outfitFont}
              >
                Months
              </h4>

              <div className="flex flex-col gap-2 pr-1 mb-3">
                {availableMonths.map((m) => {
                  const isSelected = selectedMonths.includes(m.yyyymm);

                  return (
                    <label
                      key={m.yyyymm}
                      className="flex items-center gap-2 text-black text-sm cursor-pointer"
                    >

                      {/* ---------------------------------------------------------
                        CUSTOM CHECKBOX (SECURE)
                        ---------------------------------------------------------
                        SECURITY:
                        • Fully controlled checkbox — no uncontrolled React state.
                        • Input opacity set to 0 but still accessible for events.
                        • overflow-hidden prevents SVG bleed.
                        • No dynamic HTML injection — all values plain text.
                      --------------------------------------------------------- */}
                      <span
                        className="
                          w-4 h-4 flex-shrink-0
                          border border-black rounded-sm
                          flex items-center justify-center
                          relative overflow-hidden
                          transition
                          hover:bg-[#017ACB]/20
                        "
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleMonth(m.yyyymm)}
                          className="opacity-0 absolute w-4 h-4 cursor-pointer"
                        />

                        {isSelected && (
                          <>
                            {/* Background fill */}
                            <span className="absolute inset-0 bg-[#003A5C]"></span>

                            {/* Checkmark icon */}
                            <svg
                              className="absolute w-3 h-3 text-white"
                              viewBox="0 0 20 20"
                              fill="none"
                              stroke="white"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="4 11 8 15 16 6" />
                            </svg>
                          </>
                        )}
                      </span>

                      {/* ---------------------------------------------------------
                        MONTH LABEL (SAFE)
                        ---------------------------------------------------------
                        SECURITY:
                        • m.label is sanitized in backend.
                        • Rendered as plain text — no HTML injection.
                      --------------------------------------------------------- */}
                      {m.label}
                    </label>
                  );
                })}
              </div>
            </div>
              {/* ---------------------------------------------------------
              FILTERS PANEL
              ---------------------------------------------------------
              SECURITY:
              • filterMode is internal state — no user‑controlled injection.
              • Buttons use static labels — safe to render.
            --------------------------------------------------------- */}
            <div className="w-36 flex flex-col justify-between">
              <div>
                <h4
                  className="font-semibold mb-2 text-black"
                  style={styles.outfitFont}
                >
                  View
                </h4>

                <div className="flex flex-col gap-2 mb-4">

                  {/* ALL FILTER */}
                  <button
                    className={`
                      px-4 py-2 rounded text-sm transition-colors
                      ${
                        filterMode === 'all'
                          ? 'bg-[#017ACB] text-white hover:bg-[#017ACB]/20 hover:text-gray-700'
                          : 'bg-gray-200 text-gray-700 border hover:bg-[#017ACB]/20'
                      }
                      shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
                      active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
                    `}
                    onClick={() => setFilterMode('all')}
                  >
                    All
                  </button>

                  {/* JUST MINE FILTER */}
                  <button
                    className={`
                      px-4 py-2 rounded text-sm transition-colors
                      ${
                        filterMode === 'mine'
                          ? 'bg-[#017ACB] text-white hover:bg-[#017ACB]/20 hover:text-gray-700'
                          : 'bg-gray-200 text-gray-700 border hover:bg-[#017ACB]/20'
                      }
                      shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
                      active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
                    `}
                    onClick={() => setFilterMode('mine')}
                  >
                    Just Mine
                  </button>
                </div>
              </div>

              {/* APPLY BUTTON */}
              <button
                onClick={applyFilters}
                className="
                  w-full px-4 py-2 rounded text-sm font-semibold transition-colors
                  bg-[#017ACB] text-white hover:bg-[#017ACB]/20 hover:text-gray-700
                  shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
                  active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
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
    </main>
  </div>
);
}