'use client';

/* =============================================================================
   ProfileCard.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Displays the authenticated user's profile information including name,
     title, department, role, and employee ID. Handles session validation,
     profile data fetching, logout, and loading state.

   SECURITY MODEL:
     • localStorage is read inside a try/catch — malformed JSON is caught,
       session is cleared, and the user is redirected to /login to prevent
       a broken auth state from persisting.
     • username is validated for presence before any API call is made —
       an empty or missing username triggers a session clear and redirect.
     • encodeURIComponent() is applied to the username before it is appended
       to the API URL — prevents injection or malformed URLs from reaching
       the backend.
     • The profile API response is checked for presence before setState —
       prevents a null/undefined response from crashing the component.
     • 401 and 403 responses trigger an automatic logout — ensures expired
       or invalid tokens don't leave the user in a half-authenticated state.
     • handleLogout clears both token and user from localStorage and removes
       the Axios Authorization header — ensures no stale credentials remain
       in memory after logout.

   RESPONSIVENESS:
     • max-w-3xl with w-full — card scales naturally from mobile to desktop.
     • p-6 sm:p-10 — tighter padding on small screens, generous on larger ones.
     • text-[clamp(1rem,1.1vw,1.2rem)] — fluid font size scales with viewport.
     • space-y-4 sm:space-y-5 — tighter vertical spacing on mobile.
     • Back button and title use flex with gap — wraps cleanly on narrow screens.

   DEPENDENCIES:
     • @/lib/api      — Axios instance with JWT Bearer token auto-injection
     • next/navigation — useRouter for programmatic navigation
   ============================================================================= */

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

/* -----------------------------------------------------------------------------
   STYLES
   -----------------------------------------------------------------------------
   Centralised style object — keeps inline styles out of JSX for readability.
   Only used for font-family which cannot be applied via Tailwind without a
   custom config entry.
----------------------------------------------------------------------------- */
const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' }
};

export default function ProfileCard() {
  const [user, setUser]       = useState(null); // Raw user object from localStorage
  const [profile, setProfile] = useState(null); // Profile data returned from API

  const router = useRouter();

  /* ---------------------------------------------------------------------------
     EFFECT: SESSION VALIDATION + PROFILE FETCH
     ---------------------------------------------------------------------------
     Runs once on mount. Validates the localStorage session before making any
     API call, then fetches the profile using the validated username.

     SECURITY:
     • Wraps localStorage access in try/catch — malformed JSON is caught and
       treated as a corrupted session (clear + redirect).
     • Checks for username presence before any API call — prevents requests
       with empty or undefined usernames reaching the backend.
     • encodeURIComponent() on the username prevents URL injection.
     • 401/403 responses automatically clear the session and redirect.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    let parsedUser = null;

    try {
      const stored = localStorage.getItem('user');

      // No session found — nothing to load, exit silently
      if (!stored) return;

      parsedUser = JSON.parse(stored);

      // Validate the parsed object has the required username field
      // A missing username indicates a corrupted or partial session
      if (!parsedUser?.username) {
        console.warn('Invalid user object in localStorage — clearing session');
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }

    } catch (err) {
      // JSON.parse failed — localStorage value is malformed
      // Clear the corrupted session and redirect to login
      console.error('LocalStorage parse error:', err);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      router.push('/login');
      return;
    }

    async function loadProfile() {
      try {
        setUser(parsedUser);

        // Encode username before appending to URL — prevents injection or
        // malformed requests if the username contains special characters
        const safeUsername = encodeURIComponent(parsedUser.username);

        const res = await api.get(`/profile?username=${safeUsername}`);

        // Validate response shape before setting state —
        // prevents a null/undefined response from crashing the render
        if (!res?.data) {
          console.warn('Profile response returned no data');
          return;
        }

        setProfile(res.data);

      } catch (err) {
        console.error('Profile fetch error:', err);

        // Auto-logout on 401 (expired token) or 403 (forbidden) —
        // prevents the user from remaining in a half-authenticated state
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
     Clears all authentication data and redirects to the login screen.

     SECURITY:
     • Removes both token and user from localStorage — no stale credentials left.
     • Deletes the Authorization header from the Axios instance — prevents the
       token from being sent on any requests made after logout if the page is not
       immediately unmounted (e.g. background requests in flight).
     • Redirects immediately to /login — prevents the user from interacting with
       the authenticated UI after session teardown.
  --------------------------------------------------------------------------- */
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Remove the JWT from Axios defaults — prevents post-logout requests from
    // being sent with the stale Authorization header
    delete api.defaults.headers.common['Authorization'];

    router.push('/login');
  };

  /* ---------------------------------------------------------------------------
     LOADING STATE
     ---------------------------------------------------------------------------
     Shown while session validation and profile fetch are in progress.
     Prevents the profile UI from flashing with empty/undefined data.
     min-h-[200px] ensures the spinner is visually centred on all screen sizes.
  --------------------------------------------------------------------------- */
  if (!user || !profile) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <div
          className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#017ACB]"
          role="status"
          aria-label="Loading profile"
        />
      </div>
    );
  }

  /* ---------------------------------------------------------------------------
     RENDER: PROFILE CARD
     ---------------------------------------------------------------------------
     RESPONSIVENESS:
     • w-full max-w-3xl — fills available width up to 48rem, then centres.
     • p-6 sm:p-10 — compact padding on mobile, generous on desktop.
     • text-[clamp(1rem,1.1vw,1.2rem)] — fluid font size between 1rem and 1.2rem.
     • space-y-4 sm:space-y-5 — tighter row spacing on small screens.
     • flex-wrap on the header row — back button + title wrap cleanly if needed.
  --------------------------------------------------------------------------- */
  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-xl shadow-md border border-gray-200 p-6 sm:p-10">

      {/* ------------------------------------------------------------------- */}
      {/* HEADER: Back button + Page title                                     */}
      {/* flex-wrap ensures they stack gracefully on very narrow viewports     */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex items-center gap-3 mb-6 sm:mb-8 flex-wrap">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="text-3xl text-[#017ACB] hover:text-[#017ACB]/50 transition"
          style={styles.outfitFont}
        >
          ❮
        </button>

        <h2
          className="text-2xl sm:text-3xl font-bold text-[#017ACB]"
          style={styles.outfitFont}
        >
          Profile
        </h2>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* PROFILE FIELDS                                                        */}
      {/* All values come from the validated API response — not localStorage   */}
      {/* text-[clamp] provides fluid sizing across all viewport widths        */}
      {/* ------------------------------------------------------------------- */}
      <div
        className="space-y-4 sm:space-y-5 text-gray-700 text-[clamp(1rem,1.1vw,1.2rem)]"
        style={styles.outfitFont}
      >
        <div><strong>Name:</strong> {profile.name}</div>
        <div><strong>Title:</strong> {profile.title}</div>
        <div><strong>Department:</strong> {profile.department}</div>
        <div><strong>Role:</strong> {profile.role}</div>
        <div><strong>ID:</strong> {profile.id}</div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* LOGOUT BUTTON                                                         */}
      {/* Positioned at the bottom-right — flex justify-end handles alignment  */}
      {/* Button style preserved exactly from original design                  */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex justify-end mt-8 sm:mt-10">
        <button
          onClick={handleLogout}
          aria-label="Log out of your account"
          className="
            px-4 py-2 bg-[#017ACB] text-white rounded
            hover:bg-[#017ACB]/20 hover:text-gray-700 transition
            border border-black
            shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
            active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
            relative
            before:content-[''] before:absolute before:inset-0 before:rounded
            before:pointer-events-none
            before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
            focus:outline-none focus:ring-0
          "
          style={styles.outfitFont}
        >
          Log Out
        </button>
      </div>

    </div>
  );
}