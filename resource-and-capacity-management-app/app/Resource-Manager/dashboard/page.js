'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/* ---------------------------------------------------------
   Shared Style Object
   ---------------------------------------------------------
   - Centralizes typography styling for consistency
   - Used across headings, labels, and UI elements
--------------------------------------------------------- */
const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' }
};

export default function DashboardPage() {

  /* -------------------------------------------------------
     State: Logged‑in User
     -------------------------------------------------------
     - Loaded from localStorage on initial render
     - If missing, user is redirected to login page
  ------------------------------------------------------- */
  const [user, setUser] = useState(null);

  /* -------------------------------------------------------
     State: Dashboard Filter + Summary Data
     -------------------------------------------------------
     filter  → "all" or "mine"
     summary → counts returned from backend API
  ------------------------------------------------------- */
  const [filter, setFilter] = useState("all");
  const [summary, setSummary] = useState({
    active: 0,
    planned: 0,
    hold: 0,
    backlog: 0
  });

  const router = useRouter();

  /* -------------------------------------------------------
     Effect: Load User from LocalStorage
     -------------------------------------------------------
     - Runs once on mount
     - Redirects to login if no user is stored
     - Otherwise stores parsed user object in state
  ------------------------------------------------------- */
  useEffect(() => {
    const userData = localStorage.getItem('user');

    if (!userData) {
      router.push('/Profile/login'); // UPDATED ROUTE
      return;
    }

    setUser(JSON.parse(userData));
  }, [router]);

  /* -------------------------------------------------------
     Effect: Fetch Summary Data When Filter or User Changes
     -------------------------------------------------------
     - Calls /api/summary with:
         filter=all
         OR
         filter=mine&username={username}
     - Backend handles all DB logic and joins
     - Updates summary card values
  ------------------------------------------------------- */
  useEffect(() => {
    if (!user) return;

    const fetchSummary = async () => {
      try {
        let url = `/api/Resource-Manager/summary?filter=${filter}`; // UPDATED ROUTE

        if (filter === "mine") {
          url += `&username=${encodeURIComponent(user.username)}`;
        }

        const res = await fetch(url);
        const data = await res.json();
        setSummary(data);
      } catch (err) {
        console.error("Summary fetch error:", err);
      }
    };

    fetchSummary();
  }, [filter, user]);

  /* -------------------------------------------------------
     Loading State
     -------------------------------------------------------
     - Shows a spinner while user data is being restored
  ------------------------------------------------------- */
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  /* -------------------------------------------------------
     Main Render
     -------------------------------------------------------
     - Header with branding + user info
     - Filter buttons (All / Mine)
     - Summary cards populated from backend
     - Navigation tiles for app sections
  ------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-gray-50">

      {/* -----------------------------------------------------
          Header Section
         ----------------------------------------------------- */}
      <header className="bg-[#017ACB] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">

            {/* Logo + App Name */}
            <div className="flex items-center">
              <img src="/CapstoneDynamicsLogo.png" alt="Logo" className="h-12 w-auto" />
              <div className="flex flex-col ml-3">
                <h1 className="text-2xl font-bold text-white leading-tight" style={styles.outfitFont}>
                  Capstone Dynamics
                </h1>
              </div>
            </div>

            {/* Centered Title */}
            <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center">
              <h1 className="text-xl font-bold text-white leading-tight" style={styles.outfitFont}>
                Resource & Capacity
              </h1>
              <h2 className="text-xl font-bold text-white leading-tight" style={styles.outfitFont}>
                Management Planner
              </h2>
            </div>

            {/* Username + Profile Button */}
            <div className="flex items-center gap-4">
              <span className="text-white font-semibold" style={styles.outfitFont}>
                {user?.username || ''}
              </span>

              <Link
                href="/Resource-Manager/Profile/view-profile" // UPDATED ROUTE
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden hover:opacity-90 transition cursor-pointer"
                title="View Profile"
              >
                <span className="text-[#017ACB] font-bold text-lg">
                  {user?.username?.charAt(0)?.toUpperCase() || ''}
                </span>
              </Link>
            </div>

          </div>
        </div>
      </header>

      {/* -----------------------------------------------------
          Main Content Section
         ----------------------------------------------------- */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Welcome message */}
        <h2 className="text-2xl text-gray-900 mb-6" style={styles.outfitFont}>
          Welcome back, {user?.username || ''}
        </h2>

        {/* -----------------------------------------------------
            Filter Buttons (All / Mine)
           ----------------------------------------------------- */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilter("all")}
            className={`p-1 w-16 border text-center cursor-pointer ${
              filter === "all" ? "bg-[#017ACB] text-white" : "text-gray-600"
            }`}
            style={styles.outfitFont}
          >
            All
          </button>

          <button
            onClick={() => setFilter("mine")}
            className={`p-1 w-16 border text-center cursor-pointer ${
              filter === "mine" ? "bg-[#017ACB] text-white" : "text-gray-600"
            }`}
            style={styles.outfitFont}
          >
            Mine
          </button>
        </div>

        {/* -----------------------------------------------------
            Summary Cards
           -----------------------------------------------------
           - Values come directly from backend summary API
           - Automatically update when filter changes
        ----------------------------------------------------- */}
        <div className="grid grid-cols-4 gap-6 mb-6">

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition">
            <p className="text-gray-600 text-sm text-right" style={styles.outfitFont}>Active Initiatives</p>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>✅ {summary.active}</h3>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition">
            <p className="text-gray-600 text-sm text-right" style={styles.outfitFont}>Planned Initiatives</p>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>📝 {summary.planned}</h3>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition">
            <p className="text-gray-600 text-sm text-right" style={styles.outfitFont}>Initiatives on Hold</p>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>⏸️ {summary.hold}</h3>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition">
            <p className="text-gray-600 text-sm text-right" style={styles.outfitFont}>Initiatives in Back Log</p>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>📆 {summary.backlog}</h3>
          </div>

        </div>

        {/* -----------------------------------------------------
            Navigation Tiles
           -----------------------------------------------------
           - Links to other major sections of the application
        ----------------------------------------------------- */}
        <div className="grid grid-cols-3 gap-6">
          {/* Capacity Summary */}
          <div className="bg-white rounded-lg shadow-sm border text-center border-gray-200 p-6 hover:shadow-md hover:border-gray-500 cursor-pointer transition">
            <div className="text-4xl mb-2 text-gray-700">📊</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>Capacity Summary</h3>
          </div>
          {/* Resources */}
          <Link 
            href="/Resource-Manager/create_edit_Resources" 
            className="bg-white rounded-lg shadow-sm border text-center border-gray-200 p-6 hover:shadow-md hover:border-blue-500 cursor-pointer transition"
          >
            <div className="text-4xl mb-2 text-gray-700">👥</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>Resources</h3>
          </Link>
          {/* Initiatives */}
          <Link 
            href="/Resource-Manager/create_edit_Initiatives" 
            className="bg-white rounded-lg shadow-sm border text-center border-gray-200 p-6 hover:shadow-md hover:border-gray-500 cursor-pointer transition"
          >
            <div className="text-4xl mb-2 text-gray-700">🎯</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>Initiatives</h3>
          </Link>
          {/* Assignments */}
          <div className="bg-white rounded-lg shadow-sm border text-center border-gray-200 p-6 hover:shadow-md hover:border-gray-500 cursor-pointer transition">
            <div className="text-4xl mb-2 text-gray-700">📋</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>Assignments</h3>
          </div>
          {/* Calendar */}
          <div className="bg-white rounded-lg shadow-sm border text-center border-gray-200 p-6 hover:shadow-md hover:border-gray-500 cursor-pointer transition">
            <div className="text-4xl mb-2 text-gray-700">📅</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>Calendar</h3>
          </div>
          {/* Report */}
          <div className="bg-white rounded-lg shadow-sm border text-center border-gray-200 p-6 hover:shadow-md hover:border-gray-500 cursor-pointer transition">
            <div className="text-4xl mb-2 text-gray-700">📈</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>Report</h3>
          </div>

        </div>
      </main>
    </div>
  );
}