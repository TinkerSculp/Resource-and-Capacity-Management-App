'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

// Register Chart.js components
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

/* ---------------------------------------------------------
   FORMATTER: Always return number with 2 decimals
   PURPOSE:
   - Ensures consistent numeric formatting across table + chart
--------------------------------------------------------- */
function fmt(n) {
  if (n === null || n === undefined) return '0.00';
  return Number(n).toFixed(2);
}

export default function CapacitySummaryPage() {
  const router = useRouter();

  /* ---------------------------------------------------------
     STATE MANAGEMENT
     ---------------------------------------------------------
     PURPOSE:
     - Stores logged-in user
     - Holds month dropdown options
     - Tracks selected start month
     - Stores all chart/table data returned from backend
     - Controls loading states for UX
  --------------------------------------------------------- */
  const [user, setUser] = useState(null);

  const [selectableMonths, setSelectableMonths] = useState([]); // Dropdown month list
  const [startMonth, setStartMonth] = useState(null); // Selected start month

  const [months, setMonths] = useState([]); // Month labels (formatted)
  const [categories, setCategories] = useState([]); // Category datasets
  const [totals, setTotals] = useState([]); // Total allocated per month
  const [peopleCapacity, setPeopleCapacity] = useState([]); // Total people capacity per month
  const [remainingCapacity, setRemainingCapacity] = useState([]); // Remaining capacity per month

  const [loading, setLoading] = useState(true); // Summary loading state
  const [loadingMonths, setLoadingMonths] = useState(true); // Month dropdown loading state

  /* ---------------------------------------------------------
     LOAD USER SESSION
     ---------------------------------------------------------
     PURPOSE:
     - Retrieves user from localStorage
     - Redirects to login if no session exists
  --------------------------------------------------------- */
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/Resource-Manager/Profile/login');
      return;
    }
    setUser(JSON.parse(userData));
  }, [router]);

  /* ---------------------------------------------------------
     FETCH MONTHS FROM BACKEND
     ---------------------------------------------------------
     PURPOSE:
     - Loads all available months from DB
     - Auto-selects current month if available
     - Falls back to most recent month if not
  --------------------------------------------------------- */
  useEffect(() => {
    async function loadMonths() {
      try {
        const res = await fetch('/api/Resource-Manager/capacity-summary/months');
        const data = await res.json();

        if (!data.months || data.months.length === 0) return;

        setSelectableMonths(data.months);

        const today = new Date();
        const currentYYYYMM =
          today.getFullYear() * 100 + (today.getMonth() + 1);

        // Try to auto-select current month
        const match = data.months.find((m) => m.value === currentYYYYMM);

        if (match) {
          setStartMonth(match.value);
        } else {
          // Otherwise select the latest available month
          setStartMonth(data.months[data.months.length - 1].value);
        }
      } catch (err) {
        console.error('Failed to load months:', err);
      } finally {
        setLoadingMonths(false);
      }
    }

    loadMonths();
  }, []);

  /* ---------------------------------------------------------
     FETCH SUMMARY WHEN START MONTH CHANGES
     ---------------------------------------------------------
     PURPOSE:
     - Loads 6-month capacity summary window
     - Updates table + chart datasets
  --------------------------------------------------------- */
  useEffect(() => {
    if (!startMonth) return;

    async function loadSummary() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/Resource-Manager/capacity-summary?start=${startMonth}&months=6`
        );
        const data = await res.json();

        setMonths(data.months || []);
        setCategories(data.categories || []);
        setTotals(data.totals || []);
        setPeopleCapacity(data.peopleCapacity || []);
        setRemainingCapacity(data.remainingCapacity || []);
      } catch (err) {
        console.error('Failed to load summary:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSummary();
  }, [startMonth]);

  /* ---------------------------------------------------------
     LOADING SCREEN
     ---------------------------------------------------------
     PURPOSE:
     - Prevents UI from flashing incomplete data
     - Shows spinner until all data is ready
  --------------------------------------------------------- */
  if (!user || loadingMonths || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  /* ---------------------------------------------------------
     CHART DATA CONFIGURATION
     ---------------------------------------------------------
     PURPOSE:
     - Builds stacked bar chart for category allocations
     - Adds line chart overlay for total people capacity
     - Applies custom color palette
  --------------------------------------------------------- */
  const chartData = {
    labels: months,
    datasets: [
      // Category bars
      ...categories.map((cat, idx) => ({
        type: 'bar',
        label: cat.label,
        data: cat.values,
        backgroundColor: [
          '#7EC8FF',   // Vacation (light blue)
          '#003F8C',   // Baseline (dark blue)
          '#CFEAFF',   // Strategic (lighter blue)
          '#A9A9A9'    // Discretionary Project (gray)
        ][idx],
        stack: 'alloc'
      })),

      // People capacity line
      {
        type: 'line',
        label: 'Total People Capacity',
        data: peopleCapacity,
        borderColor: '#8B0000',     // dark red
        backgroundColor: '#8B0000',
        borderWidth: 2,
        tension: 0.2,
        yAxisID: 'y'
      }
    ]
  };

  /* ---------------------------------------------------------
     CHART OPTIONS
     ---------------------------------------------------------
     PURPOSE:
     - Enables stacked bars
     - Positions legend
     - Ensures responsive scaling
  --------------------------------------------------------- */
  const chartOptions = {
    responsive: true,
    plugins: { legend: { position: 'top' } },
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* -----------------------------------------------------
          HEADER
          PURPOSE:
          - Displays app branding
          - Shows logged-in user
          - Provides navigation back to dashboard
      ----------------------------------------------------- */}
      <header className="bg-[#017ACB] shadow-sm w-full relative">
        <div className="px-4 sm:px-6 lg:px-8 w-full">
          <div className="relative flex items-center h-[clamp(4.5rem,5vw,5.5rem)] w-full">

            {/* Logo + Home Navigation */}
            <div
              className="flex items-center cursor-pointer flex-none"
              onClick={() => router.push('/Resource-Manager/dashboard')}
            >
              <img
                src="/CapstoneDynamicsLogo.png"
                alt="Logo"
                className="w-auto h-[clamp(3.2rem,3.8vw,4rem)]"
              />
              <h1
                className="font-bold text-white leading-tight ml-4 text-[clamp(1.6rem,1.7vw,2rem)]"
                style={styles.outfitFont}
              >
                Capstone Dynamics
              </h1>
            </div>

            {/* Centered Title */}
            <div className="absolute left-1/2 -translate-x-1/2 text-center">
              <h1
                className="font-bold text-white leading-tight text-[clamp(1.2rem,1.3vw,1.6rem)]"
                style={styles.outfitFont}
              >
                Resource & Capacity Management Planner
              </h1>
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-4 ml-auto flex-none">
              <span
                className="font-semibold text-white text-[clamp(1rem,1.15vw,1.25rem)]"
                style={styles.outfitFont}
              >
                {user?.username}
              </span>

              <div
                onClick={() => router.push('/Resource-Manager/Profile/view-profile')}
                className="rounded-full bg-white flex items-center justify-center cursor-pointer hover:opacity-90 transition
                           w-[clamp(2.4rem,2.8vw,3.0rem)] h-[clamp(2.4rem,2.8vw,3.0rem)]"
              >
                <span className="text-[#017ACB] font-bold text-[clamp(1.1rem,1.3vw,1.5rem)]">
                  {user?.username?.charAt(0)?.toUpperCase()}
                </span>
              </div>
            </div>

          </div>
        </div>
      </header>

        {/* ---------------------------------------------------------
          MAIN CONTENT WRAPPER
          ---------------------------------------------------------
          PURPOSE:
          - Holds all page content below the header
          - Provides consistent horizontal padding
          - Ensures layout scales across screen sizes
        --------------------------------------------------------- */}
        <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">

          {/* -------------------------------------------------------
            TITLE BAR + BACK BUTTON + MONTH SELECTOR
            -------------------------------------------------------
            PURPOSE:
            - Displays page title
            - Provides navigation back to dashboard
            - Allows user to choose the starting month
            - Aligns controls left/right for clean layout
          ------------------------------------------------------- */}
          <div className="flex items-center justify-between mb-4">

            {/* Left side: Title + Back Button */}
            <div className="flex items-center gap-4">

              {/* Page Title */}
              <h2
                className="text-3xl font-bold text-gray-900"
                style={styles.outfitFont}
              >
                Capacity Summary
              </h2>

              {/* Back to Dashboard Button */}
              <button
                onClick={() => router.push('/Resource-Manager/dashboard')}
                className="px-4 py-2 rounded text-sm bg-white text-gray-700 border hover:bg-gray-100 transition"
                style={styles.outfitFont}
              >
                Back to Dashboard
              </button>
            </div>

            {/* Right side: Month Selector */}
            <div className="flex items-center gap-2">

              {/* Label */}
              <label
                className="text-sm font-medium text-gray-700"
                style={styles.outfitFont}
              >
                Start Month:
              </label>

              {/* Dropdown */}
              <select
                className="border border-black rounded px-2 py-1 text-sm bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          {/* -------------------------------------------------------
            CAPACITY TABLE (ABOVE CHART)
            -------------------------------------------------------
            PURPOSE:
            - Displays category allocations per month
            - Shows totals, people capacity, and remaining capacity
            - Uses horizontal scrolling for smaller screens
          ------------------------------------------------------- */}
          <div className="overflow-x-auto border rounded-lg shadow-sm bg-white mb-6">
            <table className="min-w-max w-full border-collapse text-sm text-gray-700">

              {/* Table Header */}
              <thead className="bg-[#017ACB] text-white">
                <tr>
                  <th className="px-4 py-2 border text-left" style={styles.outfitFont}>
                    Category
                  </th>

                  {/* Month Columns */}
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

              {/* Table Body */}
              <tbody>

                {/* Category Rows */}
                {categories.map((cat) => (
                  <tr key={cat.label}>
                    <td className="px-4 py-2 border font-semibold" style={styles.outfitFont}>
                      {cat.label}
                    </td>

                    {cat.values.map((val, idx) => (
                      <td key={idx} className="px-4 py-2 border text-center">
                        {fmt(val)}
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Total Allocated Row */}
                <tr className="bg-gray-100">
                  <td className="px-4 py-2 border font-bold" style={styles.outfitFont}>
                    Total Allocated
                  </td>
                  {totals.map((val, idx) => (
                    <td key={idx} className="px-4 py-2 border text-center font-bold">
                      {fmt(val)}
                    </td>
                  ))}
                </tr>

                {/* Total People Capacity Row */}
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

                {/* Remaining Capacity Row */}
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

          {/* -------------------------------------------------------
            CHART SECTION (BELOW TABLE)
            -------------------------------------------------------
            PURPOSE:
            - Displays stacked bar chart of allocations
            - Overlays line chart for total people capacity
            - Centered with max width for clean layout
          ------------------------------------------------------- */}
          <div className="bg-white p-4 rounded-lg shadow mb-6 flex justify-center">
            <div className="w-full max-w-5xl">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

        </main>
    </div>
  );
}