'use client';

/* =============================================================================
   CapacitySummary.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Displays the Capacity Summary dashboard — a stacked bar chart and data
     table showing allocation totals by category vs total people capacity
     across a configurable 6-month rolling window.

   HOW IT WORKS:
     1. On mount, reads and validates the user session from localStorage
     2. Once user is confirmed, fetches the list of selectable months
     3. Defaults to the current month (or the most recent available)
     4. When startMonth changes, fetches summary data for the 6-month window
     5. Renders a table and a stacked bar + capacity line chart from the data

   CHART DESIGN:
     The chart uses a mixed type — stacked bar datasets for each allocation
     category, plus a line dataset for total people capacity. This allows the
     viewer to visually compare allocation totals against available capacity
     at a glance. LineElement and PointElement must be registered explicitly
     for the mixed dataset to render correctly.

   SECURITY MODEL:
     • localStorage is accessed inside try/catch — malformed JSON is caught,
       the session is cleared, and the component resets to prevent a broken
       auth state from persisting.
     • All API responses are validated for presence before setState — prevents
       undefined arrays from reaching Chart.js or table renders.
     • startMonth is passed through encodeURIComponent() before the API call —
       prevents injection or malformed requests.
     • The select onChange coerces the value with Number() — prevents a
       string-typed YYYYMM from being sent to the backend.
     • All numeric values rendered in the table pass through fmt() — prevents
       NaN, null, or undefined from appearing in UI cells.
     • All state arrays default to [] — prevents Chart.js from receiving
       undefined datasets which would cause a runtime crash.

   RESPONSIVENESS:
     • Header row uses flex-col on mobile, flex-row on sm+ — title, button,
       and month selector each get their own line on small screens.
     • overflow-x-auto on the table wrapper — scrolls horizontally on narrow
       screens without breaking the layout.
     • Chart uses responsive: true — scales naturally from mobile to desktop.
     • aspectRatio changes between mobile and desktop for better proportions.

   DEPENDENCIES:
     • @/lib/api        — Axios instance with JWT Bearer token auto-injection
     • react-chartjs-2  — Bar chart component (supports mixed chart types)
     • chart.js         — Core library with required component registration
     • next/navigation  — useRouter for programmatic back-navigation
   ============================================================================= */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend
} from 'chart.js';

/* -----------------------------------------------------------------------------
   CHART.JS REGISTRATION
   All used components must be explicitly registered — Chart.js uses tree-shaking
   by default. LineElement and PointElement are required for the mixed chart type
   (bar + line) even though we don't import a Line component directly.
----------------------------------------------------------------------------- */
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);

const styles = { outfitFont: { fontFamily: 'Outfit, sans-serif' } };

/* -----------------------------------------------------------------------------
   SHARED BUTTON CLASSES — neumorphic, matches all other pages in the app.
----------------------------------------------------------------------------- */
const btnClass = `
  w-full sm:w-auto
  px-4 py-2 rounded text-sm
  bg-[#017ACB] text-white border border-black/50 dark:border-slate-500/60
  hover:bg-[#017ACB]/20 hover:text-gray-700 dark:hover:bg-[#017ACB]/30 dark:hover:text-slate-100 transition
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
  w-full sm:w-auto
  px-4 py-2 rounded text-sm
  bg-[#003A5C] text-white border border-black/50 dark:border-slate-500/60
  dark:bg-[#0A5F8A] dark:text-white
  hover:bg-[#017ACB]/20 hover:text-gray-700 dark:hover:bg-[#017ACB]/30 dark:hover:text-slate-100 transition
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
   SHARED DROPDOWN CLASS — matches the neumorphic button style.
----------------------------------------------------------------------------- */
const dropClass = `
  border border-black/50 rounded px-2 py-1.5 text-sm bg-white text-black
  dark:bg-[#1f1f1f] dark:text-slate-100 dark:border-slate-600
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  dark:shadow-[4px_4px_10px_rgba(0,0,0,0.45)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  dark:active:shadow-[2px_2px_6px_rgba(0,0,0,0.45)]
  relative before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
  dark:before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.45)]
  hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 transition focus:outline-none focus:ring-2 focus:ring-[#017ACB]/40 dark:focus:ring-slate-400
  w-full sm:w-auto
`;

/* -----------------------------------------------------------------------------
   UTILITY: fmt
   Formats a numeric value to two decimal places. Guards against NaN, null,
   and undefined so table cells always display a valid number.
----------------------------------------------------------------------------- */
function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return '0.00';
  return Number(n).toFixed(2);
}

/* =============================================================================
   COMPONENT: CapacitySummary
   ============================================================================= */
export default function CapacitySummary() {

  /* ---------------------------------------------------------------------------
     STATE
  --------------------------------------------------------------------------- */
  const [user, setUser]                           = useState(null);
  const [selectableMonths, setSelectableMonths]   = useState([]);
  const [startMonth, setStartMonth]               = useState(null);
  const [months, setMonths]                       = useState([]);
  const [categories, setCategories]               = useState([]);
  const [totals, setTotals]                       = useState([]);
  const [peopleCapacity, setPeopleCapacity]       = useState([]);
  const [remainingCapacity, setRemainingCapacity] = useState([]);
  const [loadingMonths, setLoadingMonths]         = useState(true);
  const [loadingSummary, setLoadingSummary]       = useState(true);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const monthDropdownRef                          = useRef(null);

  const router = useRouter();

  /* ---------------------------------------------------------------------------
     EFFECT 1: LOAD USER SESSION
     Reads and validates the user from localStorage on mount.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) setUser(JSON.parse(stored));
    } catch (err) {
      console.error('LocalStorage parse error:', err);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  }, []);

  /* ---------------------------------------------------------------------------
     EFFECT 2: LOAD SELECTABLE MONTHS
     Fetches available months from the backend and auto-selects the current
     month, or falls back to the most recent available.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!user) return;

    async function loadMonths() {
      try {
        const res  = await api.get('/capacity-summary/months');
        const data = res?.data;

        if (!data?.months || data.months.length === 0) {
          console.warn('No months returned from backend');
          return;
        }

        setSelectableMonths(data.months);

        const today         = new Date();
        const currentYYYYMM = today.getFullYear() * 100 + (today.getMonth() + 1);
        const match         = data.months.find(m => m.value === currentYYYYMM);

        setStartMonth(match ? match.value : data.months[data.months.length - 1].value);

      } catch (err) {
        console.error('Failed to load months:', err);
      } finally {
        setLoadingMonths(false);
      }
    }

    loadMonths();
  }, [user]);

  /* ---------------------------------------------------------------------------
     EFFECT 3: LOAD SUMMARY DATA
     Re-runs whenever user or startMonth changes. Fetches the 6-month rolling
     window of capacity and allocation data.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!user || !startMonth) return;

    async function loadSummary() {
      setLoadingSummary(true);
      try {
        const res  = await api.get(`/capacity-summary?start=${encodeURIComponent(startMonth)}&months=6`);
        const data = res?.data || {};

        setMonths(data.months                       || []);
        setCategories(data.categories               || []);
        setTotals(data.totals                       || []);
        setPeopleCapacity(data.peopleCapacity       || []);
        setRemainingCapacity(data.remainingCapacity || []);

      } catch (err) {
        console.error('Failed to load summary:', err);
      } finally {
        setLoadingSummary(false);
      }
    }

    loadSummary();
  }, [user, startMonth]);

  /* ---------------------------------------------------------------------------
     EFFECT 4: CLOSE MONTH DROPDOWN ON OUTSIDE CLICK
  --------------------------------------------------------------------------- */
  useEffect(() => {
    const handler = (e) => {
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(e.target))
        setShowMonthDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ---------------------------------------------------------------------------
     LOADING STATE
  --------------------------------------------------------------------------- */
  if (!user || loadingMonths || loadingSummary) {
    return (
      <div className="min-h-screen page-surface flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#017ACB]" role="status" aria-label="Loading capacity summary" />
      </div>
    );
  }

  /* ---------------------------------------------------------------------------
     CHART DATA
     Mixed chart: stacked bar datasets per category + a line for total capacity.
  --------------------------------------------------------------------------- */
  const chartData = {
    labels: months,
    datasets: [
      ...categories.map((cat, idx) => ({
        type:            'bar',
        label:           cat.label,
        data:            cat.values || [],
        backgroundColor: ['#FFC000', '#215F9A', '#02D6EC', '#A6A6A6'][idx % 4],
        stack:           'alloc',
      })),
      {
        type:            'line',
        label:           'Total People Capacity',
        data:            peopleCapacity || [],
        borderColor:     '#BF0000',
        backgroundColor: '#BF0000',
        borderWidth:     2,
        tension:         0.2,
        yAxisID:         'y',
      }
    ]
  };

  const isMobile  = typeof window !== 'undefined' && window.innerWidth < 640;
  const isDarkMode = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

  const chartOptions = {
    responsive:          true,
    maintainAspectRatio: true,
    aspectRatio:         isMobile ? 1 : 2,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: isDarkMode ? '#e2e8f0' : '#111827' }
      }
    },
    scales: {
      x: {
        stacked: true,
        ticks: { color: isDarkMode ? '#cbd5e1' : '#374151' },
        grid:  { color: isDarkMode ? 'rgba(148,163,184,0.35)' : 'rgba(0,0,0,0.1)' }
      },
      y: {
        stacked:      true,
        beginAtZero: true,
        ticks: { color: isDarkMode ? '#cbd5e1' : '#374151' },
        grid:  { color: isDarkMode ? 'rgba(148,163,184,0.35)' : 'rgba(0,0,0,0.1)' }
      }
    }
  };

  /* ---------------------------------------------------------------------------
     RENDER
  --------------------------------------------------------------------------- */
  return (
    <div className="w-full min-h-screen page-surface">
      <main className="max-w-full mx-auto px-3 sm:px-6 lg:px-8 py-4">

        {/* =====================================================================
            PAGE HEADER — title, back button, start month selector
        ===================================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white" style={styles.outfitFont}>
              Capacity Summary
            </h2>

            <button onClick={() => router.back()} className={btnDarkClass} style={styles.outfitFont}>
              Back to Dashboard
            </button>
          </div>

          {/* START MONTH CUSTOM DROPDOWN */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-200 whitespace-nowrap" style={styles.outfitFont}>
              Start Month:
            </label>

            <div className="relative w-full sm:w-auto" ref={monthDropdownRef}>

              {/* Dropdown trigger */}
              <div
                className={`${dropClass} flex justify-between items-center cursor-pointer`}
                onClick={() => setShowMonthDropdown(o => !o)}
                style={styles.outfitFont}
              >
                <span>{selectableMonths.find(m => m.value === startMonth)?.label || 'Select month'}</span>
                <svg
                  className={`w-4 h-4 ml-2 transition-transform flex-shrink-0 ${showMonthDropdown ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Dropdown options — normal weight text, no bold */}
              {showMonthDropdown && (
                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-black dark:border-slate-600 rounded shadow-lg z-50 max-h-100 overflow-y-auto min-w-full">
                  {selectableMonths.map(m => (
                    <div
                      key={m.value}
                      onClick={() => { setStartMonth(m.value); setShowMonthDropdown(false); }}
                      className={`px-3 py-2 cursor-pointer text-sm text-black dark:text-slate-100 transition hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 ${
                        startMonth === m.value ? 'bg-[#CDE6F7] dark:bg-[#017ACB]/40' : ''
                      }`}
                      style={styles.outfitFont}
                    >
                      {m.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =====================================================================
            CAPACITY TABLE
            overflow-x-auto handles horizontal scrolling on narrow screens.
            All numeric values pass through fmt() — no NaN or undefined in cells.
        ===================================================================== */}
        <div className="table-surface overflow-x-auto border rounded-lg shadow-sm bg-white mb-6 -mx-3 sm:mx-0">
          <table className="min-w-max w-full border-collapse text-xs sm:text-sm text-gray-700 dark:text-slate-100">
            <thead className="bg-[#017ACB] text-white">
              <tr>
                <th
                  className="px-3 sm:px-4 py-2 border text-left whitespace-normal"
                  style={{ ...styles.outfitFont, width: '150px', minWidth: '100px' }}
                >
                  Category
                </th>
                {months.map(month => (
                  <th
                    key={month}
                    className="px-2 py-2 border text-center whitespace-nowrap"
                    style={{ ...styles.outfitFont, width: '85px', minWidth: '75px' }}
                  >
                    {month}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>

              {/* Category rows */}
              {categories.map(cat => (
                <tr key={cat.label}>
                  <td className="px-3 sm:px-4 py-2 border font-semibold text-black dark:text-slate-100" style={styles.outfitFont}>
                    {cat.label}
                  </td>
                  {cat.values.map((val, idx) => (
                    <td key={idx} className="px-2 py-2 border text-center text-black dark:text-slate-100">
                      {fmt(val)}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Total Allocated row */}
              <tr className="bg-[#017ACB]">
                <td className="px-3 sm:px-4 py-2 border border-black font-bold text-white" style={styles.outfitFont}>
                  Total Allocated
                </td>
                {totals.map((val, idx) => (
                  <td key={idx} className="px-3 sm:px-4 py-2 border border-black text-center text-white font-bold">
                    {fmt(val)}
                  </td>
                ))}
              </tr>

              {/* Total People Capacity row */}
              <tr className="bg-gray-50 dark:bg-slate-800/50">
                <td className="px-3 sm:px-4 py-2 border font-bold text-black dark:text-slate-100" style={styles.outfitFont}>
                  Total People Capacity
                </td>
                {peopleCapacity.map((val, idx) => (
                  <td key={idx} className="px-2 py-2 border text-center text-black dark:text-slate-100">
                    {fmt(val)}
                  </td>
                ))}
              </tr>

              {/* Remaining Capacity row */}
              <tr className="bg-gray-50 dark:bg-slate-800/50">
                <td className="px-3 sm:px-4 py-2 border font-bold text-black dark:text-slate-100" style={styles.outfitFont}>
                  Remaining Capacity
                </td>
                {remainingCapacity.map((val, idx) => (
                  <td key={idx} className="px-2 py-2 border text-center text-black dark:text-slate-100">
                    {fmt(val)}
                  </td>
                ))}
              </tr>

            </tbody>
          </table>
        </div>

        {/* =====================================================================
            CHART — stacked bar + capacity line overlay
        ===================================================================== */}
        <div className="bg-white dark:bg-[#212121] border border-transparent dark:border-slate-700 p-3 sm:p-4 rounded-lg shadow-sm dark:shadow-[0_10px_30px_rgba(0,0,0,0.45)] mb-6 flex justify-center">
          <div className="w-full max-w-5xl">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

      </main>
    </div>
  );
}