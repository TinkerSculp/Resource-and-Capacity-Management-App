/* =============================================================================
   Header.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Global sticky header rendered on every page of the application.
     Displays the company logo, app title, and the authenticated user's
     profile bubble. Provides navigation to the profile page.
     Also enforces a 30-minute inactivity session timeout — if the user is
     idle for 30 minutes, a modal is shown warning them the session expired.
     They must click "Back to Login" to be redirected.

   SECURITY MODEL:
     • User object is read from localStorage using a safe initialiser function
       that runs only on the client — prevents SSR crashes and hydration mismatches.
     • Wrapped in try/catch: malformed or tampered JSON is caught gracefully,
       storage is cleared, and the component renders without a user rather than
       crashing the entire app.
     • Both 'user' and 'token' are cleared together on any parse failure,
       ensuring no partial/broken session data lingers in storage.
     • No sensitive data (passwords, raw tokens) is ever rendered in the UI —
       only the username initial and display name are shown.
     • Session timeout uses Date.now() timestamps — not user-controllable input.
       All localStorage is cleared on timeout to remove auth data completely.
     • Redirect only happens after the user explicitly clicks "Back to Login" —
       uses a hardcoded path, no user-controlled redirect targets.

   HYDRATION STRATEGY:
     • useLayoutEffect + useTransition delays rendering until the client has
       hydrated, preventing a React hydration mismatch between server-rendered
       HTML (no user) and client HTML (user from localStorage).
     • Returns null until hydrated — avoids a flash of incorrect UI.

   SESSION TIMEOUT:
     • TIMEOUT_MS    = 30 * 60 * 1000 — times out after 30 minutes of inactivity
     • CHECK_EVERY_MS = 60 * 1000     — checks once every minute
     • Any mouse, keyboard, touch, or scroll activity resets the timer.
     • On expiry: localStorage is cleared and a modal is shown. The user
       must click "Back to Login" before being redirected to /login.

   DEPENDENCIES:
     • Next.js Image   — Optimised image rendering for the company logo
     • Next.js router  — Used for profile page navigation + login redirect
   ============================================================================= */

'use client';

import { useLayoutEffect, useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

/* -----------------------------------------------------------------------------
   FONT STYLE
   Shared style object for the Outfit typeface, applied consistently across
   all text elements in the header to maintain brand typography.
----------------------------------------------------------------------------- */
const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' }
};

/* -----------------------------------------------------------------------------
   SESSION TIMEOUT CONSTANTS
   • TIMEOUT_MS     — 30 minutes of inactivity before the session expires
   • CHECK_EVERY_MS — interval at which the timer is checked (every 1 minute)
   • LAST_ACTIVE_KEY — localStorage key used to store the last activity timestamp
   • LOGIN_PATH      — hardcoded redirect target on session expiry
----------------------------------------------------------------------------- */
const TIMEOUT_MS      = 30 * 60 * 1000; // 30 minutes of inactivity
const CHECK_EVERY_MS  = 60 * 1000;       // Check once every minute
const LAST_ACTIVE_KEY = 'lastActive';
const LOGIN_PATH      = '/login';

/* =============================================================================
   COMPONENT: Header
   ============================================================================= */
export default function Header() {

  /* ---------------------------------------------------------------------------
     STATE: user
     ---------------------------------------------------------------------------
     Initialised lazily from localStorage using a function passed to useState.
     This runs once on mount (client-side only) and never re-runs, making it
     safe and efficient.

     SECURITY:
     • typeof window check prevents this from running during SSR where
       localStorage is not available, avoiding server-side crashes.
     • try/catch handles corrupted or malformed JSON gracefully — rather than
       crashing, it clears both the user object and JWT token from storage
       and returns null, forcing a clean unauthenticated state.
     • Only the display-safe user object is stored in state — the raw JWT
       token is never touched or rendered here.
  --------------------------------------------------------------------------- */
  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
      } catch (err) {
        console.error('LocalStorage parse error:', err);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        return null;
      }
    }
    return null;
  });

  /* ---------------------------------------------------------------------------
     STATE: hydrated
     ---------------------------------------------------------------------------
     Tracks whether the component has completed client-side hydration.
     Prevents rendering user-specific content before the client has had a
     chance to read localStorage, which would cause a React hydration mismatch
     between the server-rendered HTML and the client DOM.
  --------------------------------------------------------------------------- */
  const [hydrated, setHydrated] = useState(false);

  /* ---------------------------------------------------------------------------
     STATE: sessionExpired
     ---------------------------------------------------------------------------
     Set to true when the 30-minute inactivity timeout fires. Triggers the
     session expired modal — the user must click "Back to Login" to proceed.
  --------------------------------------------------------------------------- */
  const [sessionExpired, setSessionExpired] = useState(false);

  /* ---------------------------------------------------------------------------
     useTransition
     ---------------------------------------------------------------------------
     startTransition marks the hydration state update as non-urgent, allowing
     React to prioritise more critical renders first and keeping the UI
     responsive during initial load.
  --------------------------------------------------------------------------- */
  const [, startTransition] = useTransition();

  const router = useRouter();

  /* ---------------------------------------------------------------------------
     EFFECT: Mark component as hydrated
     ---------------------------------------------------------------------------
     useLayoutEffect fires synchronously after the DOM is painted on the client,
     making it the correct hook to gate localStorage-dependent rendering.
     Wrapped in startTransition to avoid blocking higher-priority UI updates.
  --------------------------------------------------------------------------- */
  useLayoutEffect(() => {
    startTransition(() => setHydrated(true));
  }, []);

  /* ---------------------------------------------------------------------------
     EFFECT: SESSION TIMEOUT
     ---------------------------------------------------------------------------
     Enforces a 30-minute inactivity timeout. Any user interaction (mouse,
     keyboard, touch, scroll) resets the activity timestamp in localStorage.
     A check runs every minute — if 30 minutes have elapsed since the last
     activity, the session is expired:
       1. localStorage is cleared immediately (auth data is gone).
       2. The session expired modal is shown — user must click to proceed.
       3. Clicking "Back to Login" redirects to the login page.

     WHY IN THE HEADER:
       The header is mounted on every page of the app, making it the ideal
       single place to attach the timeout without adding it to each page.

     SECURITY:
       • localStorage.clear() removes ALL auth data (user + token) on timeout.
       • Redirect uses a hardcoded constant — no user-controlled redirect targets.
       • Timestamps use Date.now() — cannot be spoofed via user input.
       • typeof window check prevents this running during SSR.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Record the current time as the last known active timestamp
    const resetTimer = () => {
      localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
    };

    // Set the initial timestamp on mount
    resetTimer();

    // Reset the timer on any user activity
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, resetTimer));

    // Check every minute whether the session has expired
    const interval = setInterval(() => {
      const lastActive = parseInt(localStorage.getItem(LAST_ACTIVE_KEY) || '0', 10);
      const elapsed    = Date.now() - lastActive;

      if (elapsed >= TIMEOUT_MS) {
        // Auth data cleared immediately — session is over regardless of user action
        localStorage.clear();
        // Show the modal — user must click "Back to Login" before being redirected
        setSessionExpired(true);
        clearInterval(interval);
      }
    }, CHECK_EVERY_MS);

    // Cleanup event listeners and interval on unmount
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      clearInterval(interval);
    };
  }, [router]);

  /* ---------------------------------------------------------------------------
     HYDRATION GATE
     ---------------------------------------------------------------------------
     Returns null until hydration is complete. This prevents a flash of
     server-rendered header (no user) being replaced by client-rendered header
     (with user), which would cause a visible layout jump and React warnings.
  --------------------------------------------------------------------------- */
  if (!hydrated) return null;

  /* ===========================================================================
     RENDER
     ===========================================================================
     The header uses a 3-column CSS grid (1fr auto 1fr) so the center title
     is always mathematically centered to the full header width, regardless
     of how wide the left (logo) or right (avatar) zones are.

     All user data rendered here (username, initial) is display-safe —
     no raw tokens, passwords, or sensitive fields are ever shown in the UI.
  =========================================================================== */
  return (
    <>
      {/* ===================================================================
          SESSION EXPIRED MODAL
          ===================================================================
          Shown when the 30-minute inactivity timeout fires. Covers the
          entire screen — the user cannot dismiss it or interact with the
          app behind it. They must click "Back to Login" to proceed.
          localStorage has already been cleared before this is shown.
      =================================================================== */}
      {sessionExpired && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999] px-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="session-expired-title"
          aria-describedby="session-expired-desc"
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 text-center">

            {/* Warning icon */}
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-[#FEE2E2] flex items-center justify-center">
                <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
            </div>

            <h2
              id="session-expired-title"
              className="text-xl font-bold text-black mb-2"
              style={styles.outfitFont}
            >
              Session Expired
            </h2>

            <p
              id="session-expired-desc"
              className="text-sm text-gray-600 mb-6"
              style={styles.outfitFont}
            >
              Your session has timed out due to 30 minutes of inactivity.
              Please log in again to continue.
            </p>

            {/* Clicking this button is the only way to leave this modal */}
            <button
              onClick={() => router.push(LOGIN_PATH)}
              className="
                w-full px-4 py-2 rounded text-sm
                bg-[#017ACB] text-white border border-black/50
                hover:bg-[#017ACB]/20 transition hover:text-gray-700
                shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
                active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
                relative
                before:content-[''] before:absolute before:inset-0 before:rounded
                before:pointer-events-none
                before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
              "
              style={styles.outfitFont}
            >
              Back to Login
            </button>

          </div>
        </div>
      )}

      {/* ===================================================================
          HEADER
          ===================================================================
          3-column CSS grid layout:
            • Left  (1fr)  — Logo + company name (name hidden below lg)
            • Center (auto) — App title, wraps naturally at narrow widths
            • Right (1fr)  — Username + avatar bubble (username hidden below sm)

          h-[clamp(...)] keeps the header height consistent and proportional
          across all screen sizes without media query breakpoints.
      =================================================================== */}
      <header className="bg-[#017ACB] shadow-sm w-full sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8 w-full">

          <div
            className="grid items-center gap-x-3 h-[clamp(4rem,5vw,5.5rem)]"
            style={{ gridTemplateColumns: '1fr auto 1fr' }}
          >

            {/* LEFT — Company logo + name
                Logo is always visible. Company name is hidden below lg breakpoint
                to prevent overflow on tablets and phones. */}
            <div className="flex items-center gap-2 sm:gap-3 justify-start">
              <Image
                src="/CapstoneDynamicsLogoWhite.png"
                alt="Capstone Dynamics logo"
                width={92}
                height={92}
                className="w-auto h-[clamp(3rem,4.5vw,5.2rem)] flex-shrink-0"
                priority
              />
              <h1
                className="hidden lg:block font-bold text-white leading-tight text-[clamp(1rem,1.4vw,1.75rem)] whitespace-nowrap"
                style={styles.outfitFont}
              >
                Capstone Dynamics
              </h1>
            </div>

            {/* CENTER — App title
                maxWidth of 34rem prevents the title from growing too wide on
                ultra-wide monitors. Text wraps naturally rather than truncating. */}
            <div className="text-center">
              <h1
                className="font-bold text-white leading-snug text-[clamp(0.8rem,1.6vw,1.6rem)]"
                style={{ ...styles.outfitFont, maxWidth: '34rem', textAlign: 'center' }}
              >
                Resource &amp; Capacity Management Planner
              </h1>
            </div>

            {/* RIGHT — User profile section
                Only rendered when a valid user session exists in localStorage.
                Username is hidden below sm; avatar bubble is always visible.

                SECURITY:
                • user.username is a display name only — not a token or credential.
                • router.push('/profile') uses internal Next.js routing — no
                  external or user-controlled redirect targets are used here.
                • Avatar initial is derived client-side from the stored username —
                  no server round-trip needed and no sensitive data exposed. */}
            <div className="flex items-center gap-2 sm:gap-4 justify-end">
              {user && (
                <>
                  {/* Username text — hidden on mobile to save space */}
                  <span
                    className="hidden sm:block font-semibold text-white text-[clamp(0.8rem,1.1vw,1.3rem)] whitespace-nowrap"
                    style={styles.outfitFont}
                  >
                    {user.username}
                  </span>

                  {/* Avatar bubble — always visible, navigates to profile on click */}
                  <div
                    onClick={() => router.push('/profile')}
                    role="button"
                    aria-label={`View profile for ${user.username}`}
                    className="
                      rounded-full bg-white flex items-center justify-center
                      flex-shrink-0 cursor-pointer transition
                      hover:bg-[#CCE4F4] hover:shadow-[0_0_6px_#017ACB]
                      w-[clamp(2rem,2.6vw,3rem)] h-[clamp(2rem,2.6vw,3rem)]
                    "
                  >
                    {/* First letter of username as avatar initial */}
                    <span
                      className="text-[#017ACB] font-bold text-[clamp(0.9rem,1.2vw,1.4rem)]"
                      aria-hidden="true"
                    >
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      </header>
    </>
  );
}