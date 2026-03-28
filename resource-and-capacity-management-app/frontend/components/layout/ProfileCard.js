'use client';

/* =============================================================================
   ProfileCard.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Displays the authenticated user's profile information including name,
     title, department, role, and employee ID. Handles session validation,
     profile data fetching, logout, and loading state.

   HOW IT WORKS:
     1. On mount, validates the localStorage session and reads the username
     2. Fetches the full profile from GET /api/profile?username=<username>
     3. Renders the profile fields from the validated API response
     4. Logout handler clears localStorage, removes the Axios auth header,
        and redirects to /login

   SECURITY MODEL:
     • localStorage is read inside try/catch — malformed JSON is caught,
       session is cleared, and the user is redirected to /login.
     • username is validated for presence before any API call — an empty or
       missing username triggers a session clear and redirect.
     • encodeURIComponent() is applied to username before the API URL —
       prevents injection or malformed URLs from reaching the backend.
     • The profile API response is checked for presence before setState —
       prevents a null/undefined response from crashing the component.
     • 401 and 403 responses trigger automatic logout — ensures expired
       or invalid tokens don't leave the user in a half-authenticated state.
     • handleLogout clears both token and user from localStorage AND removes
       the Axios Authorization header — ensures no stale credentials remain
       in memory after logout.

   RESPONSIVENESS:
     • max-w-3xl with w-full — card scales naturally from mobile to desktop.
     • p-6 sm:p-10 — compact on small screens, generous on larger ones.
     • text-[clamp()] — fluid font size scales with viewport.
     • Back button and title use flex with gap — wraps cleanly on narrow screens.

   DEPENDENCIES:
     • @/lib/api       — Axios instance with JWT Bearer token auto-injection
     • next/navigation  — useRouter for programmatic navigation
   ============================================================================= */

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

const styles = { outfitFont: { fontFamily: 'Outfit, sans-serif' } };

export default function ProfileCard() {
  const [user, setUser]       = useState(null); // Raw session object from localStorage
  const [profile, setProfile] = useState(null); // Profile data from API response
  const router                = useRouter();

  /* ---------------------------------------------------------------------------
     EFFECT: SESSION VALIDATION + PROFILE FETCH
     ---------------------------------------------------------------------------
     Validates the localStorage session on mount before making any API call.

     SECURITY:
     • try/catch around localStorage access — malformed JSON is treated as a
       corrupted session (clear storage + redirect to login).
     • Checks for username presence before any API call — prevents requests
       with empty or undefined usernames reaching the backend.
     • encodeURIComponent() on username — prevents URL injection.
     • 401/403 responses clear the session and redirect automatically.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    let parsedUser = null;

    try {
      const stored = localStorage.getItem('user');
      if (!stored) return; // No session — nothing to load

      parsedUser = JSON.parse(stored);

      // Validate the parsed object has the required username field
      if (!parsedUser?.username) {
        console.warn('Invalid user object in localStorage — clearing session');
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }

    } catch (err) {
      // JSON.parse failed — localStorage value is malformed
      console.error('LocalStorage parse error:', err);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      router.push('/login');
      return;
    }

    async function loadProfile() {
      try {
        setUser(parsedUser);

        // Encode username before URL — prevents injection or malformed requests
        const safeUsername = encodeURIComponent(parsedUser.username);
        const res          = await api.get(`/profile?username=${safeUsername}`);

        // Validate response before setState — prevents null/undefined crashes
        if (!res?.data) { console.warn('Profile response returned no data'); return; }

        setProfile(res.data);

      } catch (err) {
        console.error('Profile fetch error:', err);

        // Auto-logout on 401 (expired token) or 403 (forbidden access)
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          router.push('/login');
        }
      }
    }

    loadProfile();
  }, [router]);

  /* ---------------------------------------------------------------------------
     HANDLER: handleLogout
     ---------------------------------------------------------------------------
     Clears all authentication data and redirects to /login.

     SECURITY:
     • Removes both token and user from localStorage — no stale credentials.
     • Deletes the Authorization header from the Axios instance — prevents
       the token from being sent on any background requests still in flight
       after logout (e.g. if the page isn't immediately unmounted).
  --------------------------------------------------------------------------- */
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Remove JWT from Axios defaults — prevents post-logout requests from
    // using the stale Authorization header
    delete api.defaults.headers.common['Authorization'];

    router.push('/login');
  };

  /* ---------------------------------------------------------------------------
     LOADING STATE — shown while session validation and profile fetch run
  --------------------------------------------------------------------------- */
  if (!user || !profile) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#017ACB]" role="status" aria-label="Loading profile" />
      </div>
    );
  }

  /* ---------------------------------------------------------------------------
     RENDER: PROFILE CARD
     All values come from the validated API response — not from localStorage.
     clamp() on font sizes provides fluid scaling across all viewport widths.
  --------------------------------------------------------------------------- */
  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-xl shadow-md border border-gray-200 p-6 sm:p-10">

      {/* HEADER: Back button + page title */}
      <div className="flex items-center gap-3 mb-6 sm:mb-8 flex-wrap">
        <button onClick={() => router.back()} aria-label="Go back" className="text-3xl text-[#017ACB] hover:text-[#017ACB]/50 transition" style={styles.outfitFont}>
          ❮
        </button>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#017ACB]" style={styles.outfitFont}>
          Profile
        </h2>
      </div>

      {/* PROFILE FIELDS — all values from validated API response */}
      <div className="space-y-4 sm:space-y-5 text-gray-700 text-[clamp(1rem,1.1vw,1.2rem)]" style={styles.outfitFont}>
        <div><strong>Name:</strong> {profile.name}</div>
        <div><strong>Title:</strong> {profile.title}</div>
        <div><strong>Department:</strong> {profile.department}</div>
        <div><strong>Role:</strong> {profile.role}</div>
        <div><strong>ID:</strong> {profile.id}</div>
      </div>

      {/* LOGOUT BUTTON */}
      <div className="flex justify-end mt-8 sm:mt-10">
        <button
          onClick={handleLogout}
          aria-label="Log out of your account"
          className="
            px-5 py-2 text-sm sm:px-8 sm:py-3 sm:text-lg bg-[#017ACB] text-white rounded
            hover:bg-[#017ACB]/20 hover:text-gray-700 transition border border-black/50
            shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
            active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
            relative before:content-[''] before:absolute before:inset-0 before:rounded
            before:pointer-events-none
            before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
          "
          style={styles.outfitFont}
        >
          Log Out
        </button>
      </div>

    </div>
  );
}
