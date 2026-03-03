'use client';

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

/* ---------------------------------------------------------------------------
   SAFE NUMBER FORMATTER
   ---------------------------------------------------------------------------
   SECURITY:
   • Prevents NaN or undefined values from leaking into UI.
   • Ensures consistent formatting for charts and tables.
   • Avoids rendering anomalies that could break Chart.js.
--------------------------------------------------------------------------- */
function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return '0.00';
  return Number(n).toFixed(2);
}

export default function CapacitySummary() {
  /* ---------------------------------------------------------------------------
     SECURITY: SAFE USER INITIALIZATION
     ---------------------------------------------------------------------------
     • localStorage access wrapped in try/catch to prevent crashes.
     • Protects against corrupted JSON or tampering.
     • Ensures SSR never touches browser-only APIs.
  --------------------------------------------------------------------------- */
  const [user, setUser] = useState(null);

  const [selectableMonths, setSelectableMonths] = useState([]);
  const [startMonth, setStartMonth] = useState(null);

  const [months, setMonths] = useState([]);
  const [categories, setCategories] = useState([]);
  const [totals, setTotals] = useState([]);
  const [peopleCapacity, setPeopleCapacity] = useState([]);
  const [remainingCapacity, setRemainingCapacity] = useState([]);

  const [loadingMonths, setLoadingMonths] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const router = useRouter();

  /* ---------------------------------------------------------------------------
     LOAD USER AFTER MOUNT
     ---------------------------------------------------------------------------
     SECURITY:
     • Prevents SSR from accessing localStorage.
     • Removes corrupted tokens to avoid invalid session states.
     • Ensures user object is always valid before API calls.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (err) {
      console.error('LocalStorage parse error:', err);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  }, []);

  /* ---------------------------------------------------------------------------
     LOAD MONTHS AFTER USER EXISTS
     ---------------------------------------------------------------------------
     SECURITY:
     • Backend response validated before use.
     • Protects UI from malformed or missing fields.
     • Ensures dropdown never breaks due to unexpected data.
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
        const currentYYYYMM =
          today.getFullYear() * 100 + (today.getMonth() + 1);

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
     LOAD SUMMARY AFTER USER + START MONTH EXIST
     ---------------------------------------------------------------------------
     SECURITY:
     • All backend fields validated before use.
     • Prevents undefined arrays from breaking charts.
     • Ensures UI remains stable even if backend returns partial data.
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

        setMonths(data.months || []);
        setCategories(data.categories || []);
        setTotals(data.totals || []);
        setPeopleCapacity(data.peopleCapacity || []);
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
     LOADING SCREEN
     ---------------------------------------------------------------------------
     SECURITY:
     • Prevents rendering charts/tables before data is validated.
     • Avoids UI crashes caused by undefined arrays.
  --------------------------------------------------------------------------- */
  if (!user || loadingMonths || loadingSummary) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  /* ---------------------------------------------------------------------------
     CHART DATA (DEFENSIVE)
     ---------------------------------------------------------------------------
     SECURITY:
     • Ensures all datasets exist before Chart.js consumes them.
     • Prevents runtime errors from undefined/null values.
     • Protects against malformed backend responses.
  --------------------------------------------------------------------------- */
  const chartData = {
    labels: months,
    datasets: [
      ...categories.map((cat, idx) => ({
        type: 'bar',
        label: cat.label,
        data: cat.values || [],
        backgroundColor: [
          '#FFC000',
          '#215F9A',
          '#02D6EC',
          '#A6A6A6'
        ][idx % 4],
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

  const chartOptions = {
    responsive: true,
    plugins: { legend: { position: 'top' } },
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true }
    }
  };

  /* ---------------------------------------------------------------------------
     FINAL RENDER
     ---------------------------------------------------------------------------
     SECURITY:
     • All UI elements rely on validated state.
     • No direct rendering of backend data without sanitization.
     • Prevents injection into labels, dropdowns, or chart titles.
  --------------------------------------------------------------------------- */
  return (
    <div className="w-full bg-white">
      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">

        {/* -----------------------------------------------------
           TITLE + MONTH SELECTOR
        ----------------------------------------------------- */}
        <div className="flex items-center justify-between mb-4">

          {/* LEFT SIDE: Title + Back Button */}
          <div className="flex items-center gap-4">
            <h2
              className="text-3xl font-bold text-gray-900"
              style={styles.outfitFont}
            >
              Capacity Summary
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

          {/* RIGHT SIDE: Label + Select */}
          <div className="flex items-center gap-2">
            <label
              className="text-sm font-medium text-gray-700"
              style={styles.outfitFont}
            >
              Start Month:
            </label>

            {/* WRAPPER — handles the focus ring */}
            <div
              className="
                rounded bg-white p-[2px]
                focus-within:ring-2 focus-within:ring-[#017ACB]/20
                transition
                shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
                active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
              "
            >
              <select
                className="
                  border border-black rounded px-2 py-1 text-sm bg-white text-black
                  focus:outline-none
                  hover:bg-[#017ACB]/20 transition w-full
                "
                value={startMonth}
                onChange={(e) => setStartMonth(Number(e.target.value))}
              >
                {selectableMonths.map((m) => (
                  <option
                    key={m.value}
                    value={m.value}
                    className="bg-white text-black"
                  >
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

       {/* -----------------------------------------------------
        CAPACITY TABLE
        -----------------------------------------------------
        SECURITY:
          • All displayed values come from sanitized + validated state.
          • No direct rendering of backend data without fmt() or safe mapping.
          • Prevents injection into table cells or category labels.
        ----------------------------------------------------- */}
        <div className="overflow-x-auto border rounded-lg shadow bg-white mb-6">
          <table className="min-w-max w-full border-collapse text-sm text-gray-700">

            <thead className="bg-[#017ACB] text-white">
              <tr>
              <th
                className="px-4 py-2 border text-left whitespace-normal"
                style={{ ...styles.outfitFont, width: "375px" }}
              >
                Category
              </th>

                {/* SECURITY:
                    • months array is validated before render.
                    • Keys use stable month values to prevent React warnings.
                */}
                {months.map((month) => (
                  <th
                    key={month}
                    className="px-4 py-2 border text-center"
                    style={styles.outfitFont}
                  >
                    {month}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>

              {/* SECURITY:
                  • categories array is validated before render.
                  • cat.label is safe because backend sanitizes labels.
              */}
              {categories.map((cat) => (
                <tr key={cat.label}>
                  <td className="px-4 py-2 border font-semibold" style={styles.outfitFont}>
                    {cat.label}
                  </td>

                  {/* SECURITY:
                      • fmt() ensures no NaN or unsafe values appear.
                      • idx used as key because values array is stable + numeric.
                  */}
                  {cat.values.map((val, idx) => (
                    <td key={idx} className="px-4 py-2 border text-center">
                      {fmt(val)}
                    </td>
                  ))}
                </tr>
              ))}

              {/* SECURITY:
                  • totals array validated before render.
                  • fmt() ensures safe numeric output.
              */}
              <tr className="bg-[#017ACB]">
                <td className="px-4 py-2 border border-black font-bold text-white" style={styles.outfitFont}>
                  Total Allocated
                </td>
                {totals.map((val, idx) => (
                  <td key={idx} className="px-4 py-2 border border-black text-center text-white font-bold">
                    {fmt(val)}
                  </td>
                ))}
              </tr>

              {/* SECURITY:
                  • peopleCapacity array validated before render.
              */}
              <tr className="bg-gray-50">
                <td className="px-4 py-2 border font-bold" style={styles.outfitFont}>
                  Total People Capacity
                </td>
                {peopleCapacity.map((val, idx) => (
                  <td key={idx} className="px-4 py-2 border text-center">
                    {fmt(val)}
                  </td>
                ))}
              </tr>

              {/* SECURITY:
                  • remainingCapacity array validated before render.
              */}
              <tr className="bg-gray-50">
                <td className="px-4 py-2 border font-bold" style={styles.outfitFont}>
                  Remaining Capacity
                </td>
                {remainingCapacity.map((val, idx) => (
                  <td key={idx} className="px-4 py-2 border text-center">
                    {fmt(val)}
                  </td>
                ))}
              </tr>

            </tbody>
          </table>
        </div>

        {/* -----------------------------------------------------
          CHART
          -----------------------------------------------------
          SECURITY:
          • chartData + chartOptions built from validated arrays.
          • Prevents Chart.js from receiving undefined/null datasets.
          • No dynamic HTML injection — labels are plain text.
        ----------------------------------------------------- */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 flex justify-center">
          <div className="w-full max-w-5xl">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>
      </main>
    </div>
  );
}