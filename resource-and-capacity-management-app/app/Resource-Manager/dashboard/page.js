'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/* ---------------------------------------------------------
   SHARED STYLE OBJECT
   - Centralizes typography styling for consistency
   - Applied across headings, labels, and UI elements
--------------------------------------------------------- */
const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' }
};

/* ---------------------------------------------------------
   DASHBOARD PAGE
   - Loads logged‑in user from localStorage
   - Fetches summary counts (All / Mine)
   - Displays header, summary cards, and navigation tiles
   - Redirects to login if user is missing
--------------------------------------------------------- */
export default function DashboardPage() {

  /* ---------------------------------------------------------
     STATE: LOGGED‑IN USER
     - Loaded from localStorage on initial render
     - If missing → redirect to login page
  --------------------------------------------------------- */
  const [user, setUser] = useState(null);

  /* ---------------------------------------------------------
     STATE: DASHBOARD FILTER + SUMMARY DATA
     - filter: "all" or "mine"
     - summary: counts returned from backend API
  --------------------------------------------------------- */
  const [filter, setFilter] = useState("all");
  const [summary, setSummary] = useState({
    active: 0,
    planned: 0,
    hold: 0,
    backlog: 0
  });

  const router = useRouter();

  /* ---------------------------------------------------------
     EFFECT: LOAD USER FROM LOCALSTORAGE
     - Runs once on mount
     - Redirects to login if no user is stored
     - Otherwise stores parsed user object in state
  --------------------------------------------------------- */
  useEffect(() => {
    const userData = localStorage.getItem('user');

    if (!userData) {
      router.push('/Profile/login');
      return;
    }

    setUser(JSON.parse(userData));
  }, [router]);

  /* ---------------------------------------------------------
     EFFECT: FETCH SUMMARY DATA WHEN FILTER OR USER CHANGES
     - Calls backend summary API:
         • filter=all
         • filter=mine&username={username}
     - Backend handles all DB logic and joins
     - Updates summary card values
  --------------------------------------------------------- */
  useEffect(() => {
    if (!user) return;

    const fetchSummary = async () => {
      try {
        let url = `/api/Resource-Manager/summary?filter=${filter}`;

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

  /* ---------------------------------------------------------
     LOADING STATE
     - Shows a spinner while user data is being restored
  --------------------------------------------------------- */
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  /* ---------------------------------------------------------
     MAIN RENDER
     - Header with branding + user info
     - Filter buttons (All / Mine)
     - Summary cards populated from backend
     - Navigation tiles for app sections
  --------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-gray-50">

      {/* -----------------------------------------------------
          HEADER SECTION
      ----------------------------------------------------- */}
      <header className="bg-[#017ACB] shadow-sm w-full">
        <div className="px-4 sm:px-6 lg:px-8 w-full">

          <div className="relative flex items-center h-[clamp(4.5rem,5vw,5.5rem)] w-full">

            {/* LEFT SECTION */}
            <div className="flex items-center flex-none">
              <img
                src="/CapstoneDynamicsLogo.png"
                alt="Logo"
                className="w-auto h-[clamp(3.2rem,3.8vw,4.0rem)]"
              />

              <h1
                className="font-bold text-white leading-tight ml-4 text-[clamp(1.6rem,1.7vw,2rem)]"
                style={styles.outfitFont}
              >
                Capstone Dynamics
              </h1>
            </div>

            {/* CENTER SECTION */}
            <div className="absolute left-1/2 -translate-x-1/2 text-center">
              <h1
                className="font-bold text-white leading-tight text-[clamp(1.2rem,1.3vw,1.6rem)]"
                style={styles.outfitFont}
              >
                Resource & Capacity Management Planner
              </h1>
            </div>

            {/* RIGHT SECTION */}
            <div className="flex items-center gap-4 ml-auto flex-none">
              <span
                className="font-semibold text-white text-[clamp(1rem,1.15vw,1.25rem)]"
                style={styles.outfitFont}
              >
                {user.username}
              </span>

              <Link
                href="/Resource-Manager/Profile/view-profile"
                className="rounded-full bg-white flex items-center justify-center overflow-hidden hover:opacity-90 transition cursor-pointer
                           w-[clamp(2.4rem,2.8vw,3.0rem)] h-[clamp(2.4rem,2.8vw,3.0rem)]"
                title="View Profile"
              >
                <span className="text-[#017ACB] font-bold text-[clamp(1.1rem,1.3vw,1.5rem)]">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </Link>
            </div>

          </div>
        </div>
      </header>

      {/* -----------------------------------------------------
          MAIN CONTENT SECTION
      ----------------------------------------------------- */}
      <main className="w-full px-4 sm:px-6 lg:px-12 pt-[clamp(0.8rem,1.5vw,2rem)] pb-[clamp(1.5rem,3vw,3rem)]">

        {/* Welcome message */}
        <h2
          className="text-[clamp(1.4rem,1.8vw,2.2rem)] text-gray-900 mb-[clamp(0.6rem,1vw,1.2rem)]"
          style={styles.outfitFont}
        >
          Welcome back, {user.username}
        </h2>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-[clamp(0.6rem,1vw,1.2rem)]">
          <button
            onClick={() => setFilter("all")}
            className={`px-[clamp(0.4rem,0.6vw,0.8rem)]
                        py-[clamp(0.2rem,0.4vw,0.6rem)]
                        w-[clamp(3.5rem,4.5vw,5.5rem)]
                        border text-center cursor-pointer rounded
                        text-[clamp(0.9rem,1vw,1.1rem)]
                        ${filter === "all" ? "bg-[#017ACB] text-white" : "text-gray-600"}`}
            style={styles.outfitFont}
          >
            All
          </button>

          <button
            onClick={() => setFilter("mine")}
            className={`px-[clamp(0.4rem,0.6vw,0.8rem)]
                        py-[clamp(0.2rem,0.4vw,0.6rem)]
                        w-[clamp(3.5rem,4.5vw,5.5rem)]
                        border text-center cursor-pointer rounded
                        text-[clamp(0.9rem,1vw,1.1rem)]
                        ${filter === "mine" ? "bg-[#017ACB] text-white" : "text-gray-600"}`}
            style={styles.outfitFont}
          >
            Mine
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-[clamp(1rem,2vw,2.5rem)] mb-[clamp(1.5rem,2vw,2.5rem)] w-full">
          {[
            { label: 'Active Initiatives', icon: '✅', value: summary.active },
            { label: 'Planned Initiatives', icon: '📝', value: summary.planned },
            { label: 'Initiatives on Hold', icon: '⏸️', value: summary.hold },
            { label: 'Initiatives in Back Log', icon: '📅', value: summary.backlog },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-[clamp(1rem,1.5vw,2rem)] transition">
              <p className="text-gray-600 text-[clamp(0.8rem,0.9vw,1rem)] text-right" style={styles.outfitFont}>
                {item.label}
              </p>
              <h3 className="text-[clamp(1.1rem,1.3vw,1.5rem)] font-semibold text-gray-900 mb-2" style={styles.outfitFont}>
                {item.icon} {item.value}
              </h3>
            </div>
          ))}
        </div>

        {/* Navigation Tiles */}
        <div className="grid grid-cols-3 gap-[clamp(1rem,2vw,2.5rem)] w-full">
          {[
            { label: 'Capacity Summary', icon: '📊', href: '/Resource-Manager/capacity_summary' },
            { label: 'Resources', icon: '👥', href: '/Resource-Manager/create_edit_Resources' },
            { label: 'Initiatives', icon: '🎯', href: '/Resource-Manager/create_edit_Initiatives' },
            { label: 'Assignments', icon: '📋', href: '/Resource-Manager/assignments' },
            { label: 'Calendar', icon: '📅', href: null },
            { label: 'Report', icon: '📈', href: null },
          ].map((tile, i) => {

            const content = (
              <div className="bg-white rounded-lg shadow-sm border text-center border-gray-200 p-[clamp(1rem,1.5vw,2rem)] hover:shadow-md hover:border-gray-500 cursor-pointer transition">
                <div className="text-[clamp(2rem,2.5vw,3rem)] mb-2 text-gray-700">{tile.icon}</div>
                <h3 className="text-[clamp(1rem,1.2vw,1.4rem)] font-semibold text-gray-900 mb-2" style={styles.outfitFont}>
                  {tile.label}
                </h3>
              </div>
            );

            return tile.href ? (
              <Link key={i} href={tile.href}>{content}</Link>
            ) : (
              <div key={i}>{content}</div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
