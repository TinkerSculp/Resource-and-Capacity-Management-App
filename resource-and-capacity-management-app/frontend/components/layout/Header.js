/* =============================================================================
   Header.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Global sticky header rendered on every page of the application.
     Displays the company logo, app title, and the authenticated user's
     profile bubble. Provides navigation to the profile page.

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
     • router.push('/profile') uses Next.js internal routing — no external
       redirects or user-controlled URLs are ever used here.
     • HTTPS is enforced at the infrastructure level (Railway) and via the
       httpsRedirect middleware on the backend — the header itself has no
       network calls and requires no additional transport security handling.

   HYDRATION STRATEGY:
     • useLayoutEffect + useTransition delays rendering until the client has
       hydrated, preventing a React hydration mismatch between server-rendered
       HTML (no user) and client HTML (user from localStorage).
     • Returns null until hydrated — avoids a flash of incorrect UI.

   DEPENDENCIES:
     • Next.js Image  — Optimised image rendering for the company logo
     • Next.js router — Used for profile page navigation
   ============================================================================= */

'use client';

import { useLayoutEffect, useState, useTransition } from 'react';
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
        // Corrupted storage — clear everything and render without a user
        console.error('LocalStorage parse error:', err);
        localStorage.removeItem('user');
        localStorage.removeItem('token'); // Clear JWT token alongside user object
        return null;
      }
    }
    // Server-side: localStorage unavailable — return null safely
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
    <header className="bg-[#017ACB] shadow-sm w-full sticky top-0 z-40">
      <div className="px-4 sm:px-6 lg:px-8 w-full">

        {/* -------------------------------------------------------------------
            HEADER ROW
            -------------------------------------------------------------------
            3-column CSS grid layout:
              • Left  (1fr)  — Logo + company name (name hidden below lg)
              • Center (auto) — App title, wraps naturally at narrow widths
              • Right (1fr)  — Username + avatar bubble (username hidden below sm)

            h-[clamp(...)] keeps the header height consistent and proportional
            across all screen sizes without media query breakpoints.
        ------------------------------------------------------------------- */}
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
              priority // Preload logo as it's above the fold on every page
            />

            {/* Company name — hidden below lg to avoid crowding on smaller screens */}
            <h1
              className="hidden lg:block font-bold text-white leading-tight text-[clamp(1rem,1.4vw,1.75rem)] whitespace-nowrap"
              style={styles.outfitFont}
            >
              Capstone Dynamics
            </h1>
          </div>

          {/* CENTER — App title
              maxWidth of 28rem prevents the title from growing too wide on
              ultra-wide monitors. Text wraps naturally (like PowerPoint word
              wrap) rather than being hidden or truncated on narrow screens. */}
          <div className="text-center">
            <h1
              className="font-bold text-white leading-snug text-[clamp(0.9rem,1.6vw,1.6rem)]"
              style={{ ...styles.outfitFont, maxWidth: '38rem', textAlign: 'center' }}
            >
              Resource &amp; Capacity Management Planner
            </h1>
          </div>

          {/* RIGHT — User profile section
              Only rendered when a valid user session exists in localStorage.
              Username is hidden below sm; avatar bubble is always visible so
              users can always access their profile on any screen size.

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
  );
}
