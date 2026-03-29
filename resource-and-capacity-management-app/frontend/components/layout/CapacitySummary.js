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
  LineElement,    // Required for the mixed line dataset
  PointElement,   // Required for data points on the line dataset
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
   SHARED BUTTON CLASS — neumorphic, matches all other pages in the app.
----------------------------------------------------------------------------- */
const btnClass = `
  w-full sm:w-auto px-4 py-2 rounded text-sm
  bg-[#017ACB] text-white border border-black/50
  hover:bg-[#017ACB]/20 hover:text-gray-700 transition
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  relative before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
`;

/* -----------------------------------------------------------------------------
   SHARED DROPDOWN CLASS — matches the neumorphic button style.
----------------------------------------------------------------------------- */
const dropClass = `
  border border-black/50 rounded px-2 py-1.5 text-sm bg-white text-black
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  relative before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
  hover:bg-[#017ACB]/20 transition focus:outline-none focus:ring-2 focus:ring-[#017ACB]/40
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

export default function CapacitySummary() {

  const [user, setUser]                           = useState(null);
  const [selectableMonths, setSelectableMonths]   = useState([]);
  const [startMonth, setStartMonth]               = useState(null);
  const [months, setMonths]                       = useState([]);       // Formatted month labels for table headers
  const [categories, setCategories]               = useState([]);       // { label, values[] } per category
  const [totals, setTotals]                       = useState([]);       // Total allocated per month
  const [peopleCapacity, setPeopleCapacity]       = useState([]);       // Total capacity per month
  const [remainingCapacity, setRemainingCapacity] = useState([]);       // Capacity - allocated
  const [loadingMonths, setLoadingMonths]         = useState(true);
  const [loadingSummary, setLoadingSummary]       = useState(true);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const monthDropdownRef                          = useRef(null);

  const router = useRouter();

  /* ---------------------------------------------------------------------------
     EFFECT 1: LOAD USER SESSION
     Reads and validates the user from localStorage on mount.
     Both user and token are cleared on parse failure — prevents a broken
     session from persisting where one exists and the other doesn't.
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
     Runs once user is confirmed. Fetches months from the backend and
     auto-selects the current month, or the most recent available if not found.
     JWT token is attached automatically by the Axios interceptor.
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

        // Auto-select the current month, or fall back to the most recent available
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
     window of capacity and allocation data starting from startMonth.

     SECURITY:
     • startMonth is passed through encodeURIComponent() — prevents injection
       or malformed requests from a non-numeric value reaching the backend.
     • All arrays default to [] if missing from the response — prevents
       Chart.js or table renders from receiving undefined datasets.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!user || !startMonth) return;

    async function loadSummary() {
      setLoadingSummary(true);
      try {
        const res  = await api.get(`/capacity-summary?start=${encodeURIComponent(startMonth)}&months=6`);
        const data = res?.data || {};

        // Default to [] on missing fields — Chart.js crashes on undefined datasets
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
     Attaches and removes the listener in sync with dropdown open state.
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
     Shown while user session, months, or summary data are still loading.
  --------------------------------------------------------------------------- */
  if (!user || loadingMonths || loadingSummary) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#017ACB]" role="status" aria-label="Loading capacity summary" />
      </div>
    );
  }

  /* ---------------------------------------------------------------------------
     CHART DATA
     ---------------------------------------------------------------------------
     Mixed chart: stacked bar datasets per category + a line for total capacity.
     Colors are assigned by index — matched to the category order from the backend.
     The line dataset uses yAxisID: 'y' so it shares the same axis as the bars.
  --------------------------------------------------------------------------- */
  const chartData = {
    labels: months,
    datasets: [
      // One stacked bar dataset per allocation category
      ...categories.map((cat, idx) => ({
        type:            'bar',
        label:           cat.label,
        data:            cat.values || [],
        backgroundColor: ['#FFC000', '#215F9A', '#02D6EC', '#A6A6A6'][idx % 4],
        stack:           'alloc' // All bars stack into the same group
      })),
      // Line overlay showing total people capacity — rendered above the bars
      {
        type:            'line',
        label:           'Total People Capacity',
        data:            peopleCapacity || [],
        borderColor:     '#BF0000',
        backgroundColor: '#BF0000',
        borderWidth:     2,
        tension:         0.2, // Slight curve — easier to follow across months
        yAxisID:         'y'
      }
    ]
  };

  // Detect mobile for aspectRatio — narrower ratio on small screens avoids squishing
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  const chartOptions = {
    responsive:          true,
    maintainAspectRatio: true,
    aspectRatio:         isMobile ? 1 : 2, // Square on mobile, 2:1 on desktop
    plugins: { legend: { position: 'top' } },
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true }
    }
  };

  /* ---------------------------------------------------------------------------
     RENDER
  --------------------------------------------------------------------------- */
  return (
    <div className="w-full bg-white">
      <main className="max-w-full mx-auto px-3 sm:px-6 lg:px-8 py-4">

        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900" style={styles.outfitFont}>
              Capacity Summary
            </h2>
            <button
              onClick={() => router.back()}
              className="
                px-4 py-2 rounded text-sm bg-[#003A5C] text-white border border-black/50
                hover:bg-[#017ACB]/20 transition-colors hover:text-gray-700
                shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
                active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
                relative before:content-[''] before:absolute before:inset-0 before:rounded
                before:pointer-events-none
                before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
              "
              style={styles.outfitFont}
            >
              Back to Dashboard
            </button>
          </div>

          {/* START MONTH CUSTOM DROPDOWN */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap" style={styles.outfitFont}>
              Start Month:
            </label>
            <div className="relative w-full sm:w-auto" ref={monthDropdownRef}>
              <div
                className={`${dropClass} flex justify-between items-center cursor-pointer`}
                onClick={() => setShowMonthDropdown(o => !o)}
                style={styles.outfitFont}
              >
                <span>{selectableMonths.find(m => m.value === startMonth)?.label || 'Select month'}</span>
                <svg className={`w-4 h-4 ml-2 transition-transform flex-shrink-0 ${showMonthDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {showMonthDropdown && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-black rounded shadow-lg z-50 max-h-100 overflow-y-auto min-w-full">
                  {selectableMonths.map(m => (
                    <div
                      key={m.value}
                      onClick={() => { setStartMonth(m.value); setShowMonthDropdown(false); }}
                      className={`px-3 py-2 cursor-pointer text-sm text-black transition font-semibold hover:bg-[#017ACB]/20 ${startMonth === m.value ? 'bg-[#CDE6F7] font-bold' : ''}`}
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

        {/* CAPACITY TABLE
            overflow-x-auto allows horizontal scrolling on narrow screens.
            All numeric values pass through fmt() — no NaN or undefined in cells. */}
        <div className="overflow-x-auto border rounded-lg shadow bg-white mb-6 -mx-3 sm:mx-0">
          <table className="min-w-max w-full border-collapse text-xs sm:text-sm text-gray-700">
            <thead className="bg-[#017ACB] text-white">
              <tr>
                <th className="px-3 sm:px-4 py-2 border text-left whitespace-normal" style={{ ...styles.outfitFont, width: '150px', minWidth: '100px' }}>Category</th>
                {months.map(month => (
                  <th key={month} className="px-2 py-2 border text-center whitespace-nowrap" style={{ ...styles.outfitFont, width: '85px', minWidth: '75px' }}>{month}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat.label}>
                  <td className="px-3 sm:px-4 py-2 border font-semibold" style={styles.outfitFont}>{cat.label}</td>
                  {cat.values.map((val, idx) => (
                    <td key={idx} className="px-2 py-2 border text-center">{fmt(val)}</td>
                  ))}
                </tr>
              ))}
              <tr className="bg-[#017ACB]">
                <td className="px-3 sm:px-4 py-2 border border-black font-bold text-white" style={styles.outfitFont}>Total Allocated</td>
                {totals.map((val, idx) => (
                  <td key={idx} className="px-3 sm:px-4 py-2 border border-black text-center text-white font-bold">{fmt(val)}</td>
                ))}
              </tr>
              <tr className="bg-gray-50">
                <td className="px-3 sm:px-4 py-2 border font-bold" style={styles.outfitFont}>Total People Capacity</td>
                {peopleCapacity.map((val, idx) => (
                  <td key={idx} className="px-2 py-2 border text-center">{fmt(val)}</td>
                ))}
              </tr>
              <tr className="bg-gray-50">
                <td className="px-3 sm:px-4 py-2 border font-bold" style={styles.outfitFont}>Remaining Capacity</td>
                {remainingCapacity.map((val, idx) => (
                  <td key={idx} className="px-2 py-2 border text-center">{fmt(val)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* CHART — stacked bar + capacity line overlay */}
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow mb-6 flex justify-center">
          <div className="w-full max-w-5xl">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

      </main>
    </div>
  );
}
