'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' }
};

export default function DashboardSummary() {
  /* ---------------------------------------------------------
     SECURITY: SAFE USER INITIALIZATION
     ---------------------------------------------------------
     • Reads user from localStorage only on client
     • Wrapped in try/catch to avoid crashes on malformed JSON
     • Ensures component never breaks due to corrupted data
  --------------------------------------------------------- */
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch (err) {
      console.error('LocalStorage parse error:', err);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      return null;
    }
  });

  /* ---------------------------------------------------------
     FILTER + SUMMARY STATE
     ---------------------------------------------------------
     • "all" → global summary
     • "mine" → user-specific summary
     • Summary defaults to zeroed values to avoid undefined UI
  --------------------------------------------------------- */
  const [filter, setFilter] = useState('all');
  const [summary, setSummary] = useState({
    active: 0,
    hold: 0,
    backlog: 0
  });

  /* ---------------------------------------------------------
     SECURITY: LOAD SUMMARY AFTER USER IS VALIDATED
     ---------------------------------------------------------
     • Prevents API calls before user is known
     • Sanitizes username via encodeURIComponent
     • Defensive checks on API response structure
     • Catches and logs errors without breaking UI
  --------------------------------------------------------- */
  useEffect(() => {
    if (!user) return;

    async function loadSummary() {
      try {
        const usernameParam =
          filter === 'mine'
            ? `&username=${encodeURIComponent(user.username)}`
            : '';

        const res = await api.get(`/summary?filter=${filter}${usernameParam}`);

        // Defensive: ensure backend returned expected structure
        if (!res?.data) {
          console.warn('Summary response missing data');
          return;
        }

        setSummary({
          active: res.data.active ?? 0,
          hold: res.data.hold ?? 0,
          backlog: res.data.backlog ?? 0
        });
      } catch (err) {
        console.error('Summary fetch error:', err);
      }
    }

    loadSummary();
  }, [user, filter]);

  /* ---------------------------------------------------------
     LOADING STATE
     ---------------------------------------------------------
     • Prevents UI flash while validating session
     • Ensures summary is not shown until user is known
  --------------------------------------------------------- */
  if (!user) {
    return (
      <div className="min-h-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brandBlue"></div>
      </div>
    );
  }

  /* ---------------------------------------------------------
     FINAL RENDER
     ---------------------------------------------------------
     • Displays welcome message + filter buttons
     • Shows summary cards for Active / Hold / Backlog
     • Fully responsive layout using clamp() scaling
  --------------------------------------------------------- */
  return (

  <div className="w-full -mt-[clamp(0.7rem,1.0vw,1.7rem)]">

    <h2
      className="text-[clamp(1.4rem,1.8vw,2.2rem)] text-gray-900 
                 mb-[clamp(0.15rem,0.3vw,0.45rem)]"
      style={styles.outfitFont}
    >
      Welcome back, {user.username}
    </h2>

    <div className="flex gap-2 mb-[clamp(0.2rem,0.4vw,0.6rem)]">
      {/* filter buttons */}
    </div>

      {/* -----------------------------------------------------
         FILTER BUTTONS
         -----------------------------------------------------
         • "All" → global summary
         • "Mine" → user-specific summary
         • Highlighted when active
      ----------------------------------------------------- */}
      <div className="flex gap-2 mb-[clamp(0.6rem,1vw,1.2rem)]">
        <button
          onClick={() => setFilter('all')}
          className={`px-[clamp(0.4rem,0.6vw,0.8rem)]
                      py-[clamp(0.2rem,0.4vw,0.6rem)]
                      w-[clamp(3.5rem,4.5vw,5.5rem)]
                      border text-center cursor-pointer rounded
                      text-[clamp(0.9rem,1vw,1.1rem)]
                      ${
                        filter === 'all'
                ? 'bg-[#017ACB] text-white hover:bg-[#017ACB]/20 hover:text-gray-700'
                : 'bg-gray-200 text-gray-700 border hover:bg-[#017ACB]/20'
            }
            shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
            active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]'
                      }`}
          style={styles.outfitFont}
        >
          All
        </button>

        <button
        onClick={() => setFilter('mine')}
        className={`px-[clamp(0.4rem,0.6vw,0.8rem)]
                    py-[clamp(0.2rem,0.4vw,0.6rem)]
                    w-[clamp(3.5rem,4.5vw,5.5rem)]
                    border text-center cursor-pointer rounded
                    text-[clamp(0.9rem,1vw,1.1rem)]
                    transition
                    ${
                      filter === 'mine'
                ? 'bg-[#017ACB] text-white hover:bg-[#017ACB]/20 hover:text-gray-700'
                : 'bg-gray-200 text-gray-700 border hover:bg-[#017ACB]/20'
            }
            shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
            active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]'
                    }`}
        style={styles.outfitFont}
      >
        Mine
      </button>
      </div>




      {/* -----------------------------------------------------
         SUMMARY CARDS
         -----------------------------------------------------
         • Active Initiatives
         • Initiatives on Hold
         • Initiatives in Backlog
      ----------------------------------------------------- */}
      <div className="grid grid-cols-3 gap-[clamp(1rem,2vw,2.5rem)] w-full">
        {[
          { label: 'Active Initiatives', icon: <img src="/ActiveProject.svg" alt="active project icon" className="w-14 h-14" />, value: summary.active },
          { label: 'Initiatives on Hold', icon: <img src="/hold.svg" alt="pause icon" className="w-14 h-14" />, value: summary.hold },
          { label: 'Initiatives in Back Log', icon: <img src="/Backlog.svg" alt="backlog icon" className="w-14 h-14" />, value: summary.backlog }
        ].map((item, i) => (
          <div
            key={i}
            className="bg-gray-200 rounded-lg shadow-sm border border-gray-300 p-[clamp(1rem,1.5vw,2rem)] transition"
          >
            <p
              className="text-gray-600 text-[clamp(0.9rem,1.0vw,1.2rem)] text-center"
              style={styles.outfitFont}
            >
              {item.label}
            </p>
            <h3
              className="flex items-center justify-center gap-2 text-[clamp(1.3rem,1.5vw,1.9rem)] font-semibold text-gray-900 mb-2"
              style={styles.outfitFont}
            >
              <span className="flex items-center gap-1">
                {item.icon}

                <span className="inline-block w-2 text-center">
                  {item.value}
                </span>
              </span>
            </h3>
          </div>
        ))}
      </div>
    </div>
  );
}