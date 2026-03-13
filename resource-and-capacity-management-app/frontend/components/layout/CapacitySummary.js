'use client';

/* =============================================================================
   CapacitySummary.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Displays the Capacity Summary dashboard — a stacked bar chart and table
     showing allocation totals by category vs total people capacity across a
     configurable 6-month rolling window.

   HOW IT WORKS:
     1. On mount, reads and validates the user session from localStorage
     2. Once the user exists, fetches the list of selectable months
     3. Defaults to the current month (or the most recent available)
     4. When startMonth changes, fetches summary data for the 6-month window
     5. Renders a table and a stacked bar + line chart from the validated data

   SECURITY MODEL:
     • localStorage is accessed inside try/catch — malformed JSON is caught,
       the session is cleared, and the component resets to prevent a broken
       auth state from persisting across renders.
     • All API responses are validated for presence before setState — prevents
       undefined arrays from reaching Chart.js or table renders and causing
       runtime errors.
     • startMonth is passed through encodeURIComponent() before being appended
       to the API URL — prevents injection or malformed requests.
     • The select onChange coerces the value with Number() — prevents a
       string-typed YYYYMM from being sent to the backend.
     • All numeric values rendered in the table are passed through fmt() —
       prevents NaN, null, or undefined from appearing in UI cells.
     • All state arrays default to [] — prevents Chart.js from receiving
       undefined datasets which would cause a runtime crash.
     • Chart labels and category names come from the validated backend response
       — they are plain text values, not HTML, so no injection risk.

   RESPONSIVENESS:
     • Header row uses flex-col on mobile, flex-row on sm+ — title, button,
       and month selector each get their own line on small screens.
     • overflow-x-auto on the table wrapper — table scrolls horizontally on
       narrow screens without breaking the layout.
     • Chart wrapper uses w-full max-w-5xl and responsive: true — scales
       naturally from mobile to large desktop.
     • All padding and font sizes have sm: breakpoint variants for mobile comfort.
     • Month selector wraps into its own row on mobile via flex-col.

   DEPENDENCIES:
     • @/lib/api           — Axios instance with JWT Bearer token auto-injection
     • react-chartjs-2     — Bar chart component
     • chart.js            — Chart.js core with required scale/element registration
     • next/navigation     — useRouter for programmatic navigation
   ============================================================================= */

import { useState, useEffect } from 'react';
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
   All required components must be explicitly registered before use.
   LineElement and PointElement are required for the mixed bar+line dataset.
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

const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' }
};

/* -----------------------------------------------------------------------------
   SHARED BUTTON CLASS
   Neumorphic style — matches all other pages in the app.
----------------------------------------------------------------------------- */
const btnClass = `
  w-full sm:w-auto
  px-4 py-2 rounded text-sm
  bg-[#017ACB] text-white border border-black/50
  hover:bg-[#017ACB]/20 hover:text-gray-700 transition
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  relative
  before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
`;

/* -----------------------------------------------------------------------------
   SHARED DROPDOWN CLASS
   Matches the dropdown style in Report.jsx — same border, shadow, and hover
   tint so all dropdowns across the app feel consistent.
     • border-black/50  — semi-transparent black border, same weight as buttons
     • shadow           — subtle lift in the same shadow family as buttons
     • hover tint       — #017ACB/20 brand tint used on buttons and tiles
     • focus:ring       — visible keyboard focus ring for accessibility
----------------------------------------------------------------------------- */
const dropClass = `
  border border-black/50 rounded px-2 py-1.5 text-sm
  bg-white text-black
  shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
  active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
  relative
  before:content-[''] before:absolute before:inset-0 before:rounded
  before:pointer-events-none
  before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
  hover:bg-[#017ACB]/20 transition
  focus:outline-none focus:ring-2 focus:ring-[#017ACB]/40
  w-full sm:w-auto
`;

/* -----------------------------------------------------------------------------
   UTILITY: fmt
   Formats a numeric value to two decimal places. Guards against NaN, null,
   and undefined to prevent rendering anomalies in table cells or chart tooltips.
----------------------------------------------------------------------------- */
function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return '0.00';
  return Number(n).toFixed(2);
}

export default function CapacitySummary() {

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

  const router = useRouter();

  /* ---------------------------------------------------------------------------
     EFFECT 1: LOAD USER SESSION ON MOUNT
     Runs client-side only — localStorage is a browser-only API.
     Malformed JSON is caught and the session is cleared.
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
     EFFECT 2: LOAD SELECTABLE MONTHS (runs when user is set)
     Skips if user is null — prevents API calls before JWT is available.
     Defaults startMonth to current month, or most recent if not found.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!user) return;

    async function loadMonths() {
      try {
        const res = await api.get('/capacity-summary/months');
        const data = res?.data;

        if (!data?.months || data.months.length === 0) {
          console.warn('No months returned from backend');
          return;
        }

        setSelectableMonths(data.months);

        const today = new Date();
        const currentYYYYMM = today.getFullYear() * 100 + (today.getMonth() + 1);
        const match = data.months.find((m) => m.value === currentYYYYMM);

        setStartMonth(
          match ? match.value : data.months[data.months.length - 1].value
        );
      } catch (err) {
        console.error('Failed to load months:', err);
      } finally {
        setLoadingMonths(false);
      }
    }

    loadMonths();
  }, [user]);

  /* ---------------------------------------------------------------------------
     EFFECT 3: LOAD SUMMARY DATA (runs when user or startMonth changes)
     encodeURIComponent guards the URL param.
     All response arrays default to [] to protect Chart.js from undefined.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!user || !startMonth) return;

    async function loadSummary() {
      setLoadingSummary(true);
      try {
        const res = await api.get(
          `/capacity-summary?start=${encodeURIComponent(startMonth)}&months=6`
        );
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
     LOADING STATE
     Prevents charts and tables from rendering before data arrays are populated.
  --------------------------------------------------------------------------- */
  if (!user || loadingMonths || loadingSummary) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#017ACB]"
          role="status"
          aria-label="Loading capacity summary"
        />
      </div>
    );
  }

  /* ---------------------------------------------------------------------------
     CHART DATA
     All datasets use validated state arrays — Chart.js never receives undefined.
  --------------------------------------------------------------------------- */
  const chartData = {
    labels: months,
    datasets: [
      ...categories.map((cat, idx) => ({
        type: 'bar',
        label: cat.label,
        data: cat.values || [],
        backgroundColor: ['#FFC000', '#215F9A', '#02D6EC', '#A6A6A6'][idx % 4],
        stack: 'alloc'
      })),
      {
        type: 'line',
        label: 'Total People Capacity',
        data: peopleCapacity || [],
        borderColor: '#BF0000',
        backgroundColor: '#BF0000',
        borderWidth: 2,
        tension: 0.2,
        yAxisID: 'y'
      }
    ]
  };

  // aspectRatio controls the height relative to width.
  // Lower value = taller chart. 1 on mobile gives a square-ish chart
  // that's easy to read; 2 on larger screens keeps the standard wide look.
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: isMobile ? 1 : 2,
    plugins: { legend: { position: 'top' } },
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true }
    }
  };

  /* ---------------------------------------------------------------------------
     RENDER
     ---------------------------------------------------------------------------
     RESPONSIVENESS STRATEGY:
     • Header: flex-col on mobile (stacks title, button, selector vertically),
       sm:flex-row on larger screens (single horizontal row).
     • Title + back button: flex-col on mobile, sm:flex-row on larger screens.
     • Month selector: full-width on mobile (w-full via dropClass), auto on sm+.
     • Table: overflow-x-auto — scrolls horizontally on mobile.
     • Chart: w-full, responsive:true — scales to container at all sizes.
     • All font sizes and padding have sm: variants for comfortable mobile reading.
  --------------------------------------------------------------------------- */
  return (
    <div className="w-full bg-white">
      <main className="max-w-full mx-auto px-3 sm:px-6 lg:px-8 py-4">

        {/* -----------------------------------------------------------------
           HEADER
           On mobile: stacks as title → button → month selector (flex-col)
           On sm+: title + button on left, month selector on right (flex-row)
        ----------------------------------------------------------------- */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">

          {/* LEFT: Title + Back Button */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <h2
              className="text-2xl sm:text-3xl font-bold text-gray-900"
              style={styles.outfitFont}
            >
              Capacity Summary
            </h2>

            {/* Back to Dashboard — neumorphic style via btnClass */}
                    <button
          onClick={() => router.push('/resource-manager/dashboard')}
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

          {/* RIGHT: Month selector — uses dropClass, same as Report.jsx dropdowns */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label
              htmlFor="start-month-select"
              className="text-sm font-medium text-gray-700 whitespace-nowrap"
              style={styles.outfitFont}
            >
              Start Month:
            </label>

            {/* dropClass gives the same border-black/50 + shadow as Report.jsx.
                No extra wrapper div needed — the shadow lives on the select itself. */}
            <select
              id="start-month-select"
              className={dropClass}
              value={startMonth}
              onChange={(e) => setStartMonth(Number(e.target.value))}
              style={styles.outfitFont}
            >
              {selectableMonths.map((m) => (
                <option key={m.value} value={m.value} className="bg-white text-black">
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* -----------------------------------------------------------------
           CAPACITY TABLE
           overflow-x-auto — scrolls horizontally on mobile so the table
           never breaks the page layout on narrow screens.
           min-w-max — prevents columns from collapsing below readable width.
        ----------------------------------------------------------------- */}
        <div className="overflow-x-auto border rounded-lg shadow bg-white mb-6 -mx-3 sm:mx-0">
          <table className="min-w-max w-full border-collapse text-xs sm:text-sm text-gray-700">

            <thead className="bg-[#017ACB] text-white">
              <tr>
                <th
                  className="px-3 sm:px-4 py-2 border text-left whitespace-normal"
                  style={{ ...styles.outfitFont, width: '150px', minWidth: '100px' }}
                >
                  Category
                </th>
                {months.map((month) => (
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
              {categories.map((cat) => (
                <tr key={cat.label}>
                  <td className="px-3 sm:px-4 py-2 border font-semibold" style={styles.outfitFont}>
                    {cat.label}
                  </td>
                  {cat.values.map((val, idx) => (
                    <td key={idx} className="px-2 py-2 border text-center">
                      {fmt(val)}
                    </td>
                  ))}
                </tr>
              ))}

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

              <tr className="bg-gray-50">
                <td className="px-3 sm:px-4 py-2 border font-bold" style={styles.outfitFont}>
                  Total People Capacity
                </td>
                {peopleCapacity.map((val, idx) => (
                  <td key={idx} className="px-2 py-2 border text-center">
                    {fmt(val)}
                  </td>
                ))}
              </tr>

              <tr className="bg-gray-50">
                <td className="px-3 sm:px-4 py-2 border font-bold" style={styles.outfitFont}>
                  Remaining Capacity
                </td>
                {remainingCapacity.map((val, idx) => (
                  <td key={idx} className="px-2 py-2 border text-center">
                    {fmt(val)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* -----------------------------------------------------------------
           CHART
           responsive:true + maintainAspectRatio:true — scales naturally.
           w-full ensures it fills the container at all screen widths.
           max-w-5xl prevents it from becoming too wide on large screens.
        ----------------------------------------------------------------- */}
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow mb-6 flex justify-center">
          <div className="w-full max-w-5xl">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

      </main>
    </div>
  );
}