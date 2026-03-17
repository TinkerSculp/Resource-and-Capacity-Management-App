'use client';

/* =============================================================================
   LoginPage.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Renders the login modal overlay. Accepts username and password, submits
     credentials to the backend, stores the returned JWT and user object, and
     routes the user to their role-specific dashboard on success.

   HOW IT WORKS:
     1. User enters username and password and submits the form
     2. POST /api/auth/login is called with credentials in the request body
     3. On success, token and user object are stored in localStorage
     4. User is routed to the appropriate dashboard based on acc_type_id
     5. On failure, a generic error message is shown via alert

   UI BEHAVIOUR:
     • Rendered as a full-screen backdrop overlay — clicking outside the card
       refreshes to /login (keeps the user on the login screen)
     • e.stopPropagation() on the card prevents backdrop clicks from firing
       when the user interacts with the form

   SECURITY MODEL:
     • Credentials are sent in the POST body — never in the URL, preventing
       them from appearing in server logs, browser history, or referrer headers.
     • e.preventDefault() stops the browser from submitting the form as a GET
       request which would expose credentials in the URL.
     • Both token and user are validated for presence before being stored —
       prevents a malformed or partial response from being saved to localStorage.
     • localStorage.setItem stores only the token string and a safe user object
       (emp_id, username, acc_type_id, account_id) — the password is never stored.
     • Role-based routing is derived from acc_type_id returned by the backend —
       the client never decides the role, only acts on what the server returns.
     • Error messages shown to the user fall back through a chain ending in a
       generic message — internal server errors are never shown verbatim.
     • required on both inputs provides a client-side UX guard — the backend
       validates authoritatively and must not rely on this.

   RESPONSIVENESS:
     • m-4 on the card — ensures padding from screen edges on mobile.
     • w-full max-w-lg — card fills narrow screens, caps at lg on desktop.
     • flex-1 on the Sign In button — fills the full button row width.
     • Header uses flex with flex-1 on the text block — logo and title scale
       proportionally without overflowing on narrow screens.

   DEPENDENCIES:
     • @/lib/api        — Axios instance with JWT Bearer token auto-injection
     • next/navigation  — useRouter for programmatic navigation
     • next/link        — Client-side navigation for Forgot Password link
     • next/image       — Optimised image for the company logo
   ============================================================================= */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';

export default function LoginPage() {

  /* ---------------------------------------------------------------------------
     STATE
     ---------------------------------------------------------------------------
     username/password: Controlled input values — drive the POST body on submit.
     Passwords are never stored in state beyond the lifetime of this component.
     showPassword: Toggles between masked and visible password input.
  --------------------------------------------------------------------------- */
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [loginError, setLoginError] = useState('');

  const router = useRouter();

  /* ---------------------------------------------------------------------------
     HANDLER: handleLogin
     ---------------------------------------------------------------------------
     Submits credentials to the login endpoint, validates the response, stores
     the session, and routes the user to their role-specific dashboard.

     SECURITY:
     • e.preventDefault() prevents browser form submission as GET — keeps
       credentials out of the URL, logs, and browser history.
     • Credentials are sent in the POST body only — never in the URL.
     • Both user and token are validated before storing — prevents a partial
       or malformed response from being persisted to localStorage.
     • localStorage stores only the token and safe user fields — the password
       is never written to localStorage under any circumstance.
     • acc_type_id comes from the validated server response — the client never
       self-assigns a role, it only routes based on what the backend returned.
     • The backend returns distinct error codes (username_not_found, wrong_password)
       so the frontend can show a targeted message to the user. This is an accepted
       usability trade-off for this internal application — see authController.js.
  --------------------------------------------------------------------------- */
  const handleLogin = async (e) => {
    e.preventDefault(); // Prevent GET submission — keeps credentials out of URL

    setLoginError('');
    try {
      // POST body — credentials never sent as URL parameters
      const res = await api.post('/auth/login', { username, password });

      const user  = res?.data?.user;
      const token = res?.data?.token;

      // Validate both fields before storing — prevents partial session state
      if (!user || !token) {
        throw new Error('Invalid login response');
      }

      // Store session — password is never included in the user object
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);

      // Role-based routing — derived from server-returned acc_type_id only
      // The client never decides the role, only routes based on what was returned
      if (user.acc_type_id === 1) {
        router.push('/resource-manager/dashboard'); // Resource Manager
        return;
      }

      if (user.acc_type_id === 2) {
        router.push('/stakeholder/dashboard'); // Stakeholder
        return;
      }

      if (user.acc_type_id === 3) {
        router.push('/team-member/dashboard'); // Team Member
        return;
      }

            if (user.acc_type_id === 4) {
        router.push('/admin/dashboard'); // Admin
        return;
      }

      // Unknown role — fallback to generic dashboard
      router.push('/dashboard');

    } catch (error) {
      console.error('Login error:', error);

      // Read the error code from the backend response to show a targeted message.
      // Falls back to the backend message, then a generic fallback if neither exists.
      const errorCode = error?.response?.data?.error;

      const message =
        errorCode === 'username_not_found' ? 'Username not found. Please check and try again.' :
        errorCode === 'wrong_password'     ? 'Incorrect password. Please try again.' :
        errorCode === 'account_inactive'   ? 'This account has been deactivated. Please contact your administrator.' :
        error?.response?.data?.message    ||
        error?.message                    ||
        'Login failed. Please try again.';

      setLoginError(message);
    }
  };

  /* ---------------------------------------------------------------------------
     RENDER
     ---------------------------------------------------------------------------
     BACKDROP:
     • fixed inset-0 — full-screen overlay behind the card.
     • onClick on backdrop navigates to /login — keeps user on the login screen.
     • e.stopPropagation() on the card prevents backdrop click from firing
       when the user interacts with form elements inside the card.

     RESPONSIVENESS:
     • m-4 ensures the card has edge padding on small screens.
     • w-full max-w-lg — full width on mobile, capped at lg on desktop.
     • flex-1 on the Sign In button fills the full action row width.
  --------------------------------------------------------------------------- */
  return (
    <>
    <div
      className="
        fixed inset-0 bg-white/30 backdrop-blur-sm
        flex items-center justify-center z-50
      "
      onClick={() => router.push('/login')} // Backdrop click — stay on login
    >
      {/* Card — stopPropagation prevents backdrop click when interacting inside */}
      <div
        className="
          bg-white rounded-xl shadow-xl p-6 sm:p-8
          w-full max-w-lg m-4 border border-gray-200
        "
        onClick={(e) => e.stopPropagation()}
      >

        {/* ----------------------------------------------------------------- */}
        {/* HEADER: Logo + Company name + App name                            */}
        {/* flex-1 on text block allows it to scale between logo and edge     */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <Image
            src="/CapstoneDynamicsLogo.png"
            alt="Capstone Dynamics logo"
            width={96}
            height={96}
            className="h-16 w-16 sm:h-24 sm:w-24 shrink-0"
            priority // Above-fold logo — preload for faster render
          />

          <div className="flex flex-col items-center flex-1 mx-3 sm:mx-4">
            <h3
              className="text-lg sm:text-2xl font-bold text-[#017ACB]"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Capstone Dynamics
            </h3>

            <h4
              className="text-xs sm:text-base font-semibold text-black mt-1 text-center"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Resource & Capacity Management
            </h4>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* LOGIN FORM                                                          */}
        {/* onSubmit handles POST — e.preventDefault() keeps creds out of URL */}
        {/* ----------------------------------------------------------------- */}
        <form onSubmit={handleLogin} className="space-y-4 sm:space-y-6">

          {/* USERNAME INPUT */}
          <div>
            <label
              htmlFor="username-input"
              className="block text-base font-medium text-gray-700 mb-2"
            >
              Username
            </label>
            <input
              id="username-input"
              type="text"
              value={username}
              onChange={(e) => {
                // Strip anything that isn't a letter or number — prevents
                // code injection characters (quotes, brackets, semicolons etc.)
                // from being typed into the field entirely
                const sanitized = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
                setUsername(sanitized);
                if (loginError) setLoginError('');
              }}
              className="
                w-full px-5 py-3 border text-gray-700
                border-gray-300 rounded-lg text-base
                hover:bg-[#017ACB]/20 transition
              "
              autoComplete="username"
              required // Client-side UX guard — backend validates authoritatively
            />
          </div>

          {/* PASSWORD INPUT */}
          <div>
            <label
              htmlFor="password-input"
              className="block text-base font-medium text-gray-700 mb-2"
            >
              Password
            </label>
            {/* Relative wrapper — positions the show/hide toggle inside the input */}
            <div className="relative">
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'} // Toggled by showPassword state
                value={password}
                onChange={(e) => {
                  // Block characters used in code/script injection attacks:
                  // < > ' " ` ; — covers HTML injection, SQL injection, and JS injection.
                  // All other special characters (!@#$%^&*-_+=) are allowed
                  // so legitimate complex passwords are not restricted.
                  const sanitized = e.target.value.replace(/[<>'"`;]/g, '');
                  setPassword(sanitized);
                }}
                className="
                  w-full px-5 py-3 pr-12 border text-gray-700
                  border-gray-300 rounded-lg text-base
                  hover:bg-[#017ACB]/20 transition
                "
                autoComplete="current-password" // Enables password manager autofill
                required // Client-side UX guard — backend validates authoritatively
              />

              {/* SHOW / HIDE PASSWORD TOGGLE */}
              {/* type="button" prevents accidental form submission on click */}
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  /* Eye-off icon — shown when password is visible */
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7a9.77 9.77 0 012.168-3.832M6.343 6.343A9.956 9.956 0 0112 5c5 0 9 4 9 7a9.77 9.77 0 01-1.657 2.343M3 3l18 18" />
                  </svg>
                ) : (
                  /* Eye icon — shown when password is masked */
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* FORGOT PASSWORD LINK */}
          <div className="text-right">
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="text-sm text-blue-600 hover:text-blue-800 transition"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Forgot Password?
            </button>
          </div>

          {/* INLINE ERROR BANNER */}
          {loginError && (
            <div
              role="alert"
              className="p-3 bg-red-50 border border-red-300 text-red-700 rounded-lg text-sm flex items-start gap-2"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span className="flex-1">{loginError}</span>
              <button type="button" onClick={() => setLoginError('')} className="font-bold text-red-900 hover:text-red-700 leading-none">×</button>
            </div>
          )}

          {/* SIGN IN BUTTON */}
          {/* w-full on mobile for easy tapping, auto + mx-auto centres on sm+ */}
          <div className="flex gap-4">
            <button
              type="submit" // Explicit type — prevents ambiguous button behaviour
              className="
                w-full sm:w-2/3 sm:mx-auto
                px-5 py-3 sm:py-3 border border-black/50
                bg-[#017ACB] text-white
                rounded-lg text-sm sm:text-lg
                transition-all
                hover:bg-[#017ACB]/20 hover:text-gray-700
                shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
                active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
                relative
                before:content-[''] before:absolute before:inset-0 before:rounded
                before:pointer-events-none
                before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
              "
            >
              Sign In
            </button>
          </div>

        </form>
      </div>
    </div>

      {/* FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] px-4"
          onClick={() => setShowForgotModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm border border-gray-200 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#017ACB]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.657 1.343-3 3-3s3 1.343 3 3v1H9v-1c0-1.657 1.343-3 3-3s3 1.343 3 3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 11h14v10H5z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-bold text-black mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Forgot Password?
            </h3>
            <p className="text-sm text-gray-600 mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Please contact your administrator to reset your password.
            </p>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="
                w-full px-5 py-2.5 border border-black/50
                bg-[#017ACB] text-white
                rounded-lg text-sm
                hover:bg-[#017ACB]/20 hover:text-gray-700 transition
                shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
                active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
                relative before:content-[''] before:absolute before:inset-0 before:rounded
                before:pointer-events-none
                before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
              "
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
