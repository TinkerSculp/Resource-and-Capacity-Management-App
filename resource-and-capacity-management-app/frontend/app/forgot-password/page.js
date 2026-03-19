// 'use client';

// /* =============================================================================
//    ForgotPasswordPage.jsx
//    -----------------------------------------------------------------------------
//    PURPOSE:
//      Renders the Forgot Password modal overlay. Accepts a username, submits it
//      to the backend to initiate a password reset, and shows a success state
//      once the request is processed.

//    HOW IT WORKS:
//      1. User enters their username and submits the form
//      2. POST /api/auth/forgot-password is called with the username
//      3. On success, the submitted state flips and a confirmation screen shows
//      4. On failure, an alert is shown and the user can retry

//    UI BEHAVIOUR:
//      • Rendered as a full-screen backdrop overlay — clicking outside the card
//        navigates back to /login
//      • e.stopPropagation() on the card prevents backdrop clicks from firing
//        when the user interacts with the form itself

//    SECURITY MODEL:
//      • username is sent in the POST body — never appended to the URL, preventing
//        it from appearing in server logs, browser history, or referrer headers.
//      • The form uses required on the input — prevents empty submissions from
//        reaching the API, providing a first line of client-side validation.
//      • The backend is responsible for all meaningful validation — client-side
//        required is a UX convenience only and must not be relied on for security.
//      • API errors are caught and logged without exposing internal error details
//        to the user — only a generic retry message is shown on failure.
//      • The success state displays the submitted username back to the user —
//        this value comes from controlled component state (not the API response)
//        and is plain text rendered via React, so no XSS risk.
//      • ⚠️  NOTE: The backend currently returns a 404 if the username is not
//        found, which reveals whether an account exists (user enumeration risk).
//        This should be changed to always return a generic success response —
//        see authController.js forgotPassword handler for the TODO.

//    RESPONSIVENESS:
//      • m-4 on the card — ensures padding from screen edges on mobile.
//      • w-full max-w-xl — card fills narrow screens, caps at xl on desktop.
//      • flex gap-4 on buttons — buttons sit side by side, each flex-1 so they
//        share equal width at all viewport sizes.
//      • Header uses flex with flex-1 on the text block — logo and title scale
//        proportionally without overflowing on narrow screens.

//    DEPENDENCIES:
//      • @/lib/api        — Axios instance with JWT Bearer token auto-injection
//      • next/navigation  — useRouter for programmatic navigation
//      • next/link        — Client-side navigation for Back to Login links
//      • next/image       — Optimised image for the company logo
//    ============================================================================= */

// import { useState } from 'react';
// import { useRouter } from 'next/navigation';
// import Link from 'next/link';
// import Image from 'next/image';
// import api from '@/lib/api';

// export default function ForgotPasswordPage() {

//   /* ---------------------------------------------------------------------------
//      STATE
//      ---------------------------------------------------------------------------
//      username:  Controlled input value — drives the POST body on submit.
//      submitted: Flips to true on successful API response, triggering the
//                 success state render.
//      errorMsg:  Inline error message shown beneath the username input when
//                 the backend returns a failure — avoids using alert().
//   --------------------------------------------------------------------------- */
//   const [username, setUsername]   = useState('');
//   const [submitted, setSubmitted] = useState(false);
//   const [errorMsg, setErrorMsg]   = useState(''); // Inline error — cleared on each new submit

//   const router = useRouter();

//   /* ---------------------------------------------------------------------------
//      HANDLER: handleSubmit
//      ---------------------------------------------------------------------------
//      Submits the username to the forgot-password endpoint and transitions
//      to the success state on a valid response.

//      SECURITY:
//      • e.preventDefault() prevents the browser from submitting the form as a
//        GET request, which would expose the username in the URL.
//      • username is sent in the POST body — not in the URL or query string.
//      • API errors are caught and only a generic message is shown to the user —
//        internal error details are logged server-side only.
//      • ⚠️  The alert on failure currently reveals that the username was not
//        found, which is a user enumeration risk. Once the backend is updated
//        to return a generic response, this alert should be removed and the
//        success state should always be shown regardless of result.
//   --------------------------------------------------------------------------- */
//   const handleSubmit = async (e) => {
//     e.preventDefault(); // Prevent browser form submission — keeps username out of URL

//     setErrorMsg(''); // Clear any previous error before each new attempt

//     try {
//       // POST body — username never sent as a URL parameter
//       const res = await api.post('/auth/forgot-password', { username });

//       if (!res?.data?.success) {
//         // Show inline error beneath the input — no alert() needed
//         setErrorMsg('Username not found. Please check and try again.');
//         return;
//       }

//       // Transition to success state — username displayed in confirmation message
//       setSubmitted(true);

//     } catch (error) {
//       console.error('Password reset error:', error);
//       // Show inline error — never expose internal error details to the user
//       setErrorMsg('Failed to send reset instructions. Please try again.');
//     }
//   };

//   /* ---------------------------------------------------------------------------
//      RENDER
//      ---------------------------------------------------------------------------
//      BACKDROP:
//      • fixed inset-0 — full-screen overlay behind the card.
//      • onClick on backdrop navigates to /login — clicking outside dismisses.
//      • e.stopPropagation() on the card prevents backdrop click from firing
//        when the user interacts with form elements inside the card.

//      RESPONSIVENESS:
//      • m-4 ensures the card has edge padding on small screens.
//      • w-full max-w-xl — full width on mobile, capped at xl on desktop.
//      • flex gap-4 on action buttons — equal width side-by-side at all sizes.
//   --------------------------------------------------------------------------- */
//   return (
//     <div
//       className="
//         fixed inset-0 bg-white/30 backdrop-blur-sm
//         flex items-center justify-center z-50
//       "
//       onClick={() => router.push('/login')} // Backdrop click — dismiss to login
//     >
//       {/* Card — stopPropagation prevents backdrop click when interacting inside */}
//       <div
//         className="
//           bg-white rounded-xl shadow-xl border border-gray-200
//           p-8 m-4 w-full max-w-xl
//         "
//         onClick={(e) => e.stopPropagation()}
//       >

//         {/* ----------------------------------------------------------------- */}
//         {/* HEADER: Logo + Company name + App name                            */}
//         {/* flex-1 on text block allows it to scale between logo and edge     */}
//         {/* ----------------------------------------------------------------- */}
//         <div className="flex justify-between items-center mb-8">
//           <Image
//             src="/CapstoneDynamicsLogo.png"
//             alt="Capstone Dynamics logo"
//             width={96}
//             height={96}
//             className="h-24 shrink-0"
//             priority // Above-fold logo — preload for faster render
//           />

//           <div className="flex flex-col items-center flex-1 mx-4">
//             <h3
//               className="text-2xl font-bold text-[#017ACB]"
//               style={{ fontFamily: 'Outfit, sans-serif' }}
//             >
//               Capstone Dynamics
//             </h3>

//             <h4
//               className="text-base font-semibold text-black mt-1"
//               style={{ fontFamily: 'Outfit, sans-serif' }}
//             >
//               Resource & Capacity Management
//             </h4>
//           </div>
//         </div>

//         {/* ----------------------------------------------------------------- */}
//         {/* FORM STATE vs SUCCESS STATE                                        */}
//         {/* submitted flips to true on a successful API response              */}
//         {/* ----------------------------------------------------------------- */}
//         {!submitted ? (

//           /* --------------------------------------------------------------- */
//           /* FORM STATE — username input + action buttons                     */
//           /* --------------------------------------------------------------- */
//           <>
//             <h2 className="text-2xl font-bold text-gray-900 mb-2">
//               Forgot Password
//             </h2>

//             <p className="text-gray-600 text-base mb-6">
//               Enter your username and we'll send reset instructions.
//             </p>

//             {/* onSubmit handles POST — e.preventDefault() keeps username out of URL */}
//             <form onSubmit={handleSubmit} className="space-y-6">

//               {/* USERNAME INPUT */}
//               <div>
//                 <label
//                   htmlFor="username-input"
//                   className="block text-base font-medium text-gray-700 mb-2"
//                 >
//                   Username
//                 </label>

//                 <input
//                   id="username-input"
//                   type="text"
//                   value={username}
//                   onChange={(e) => {
//                     // Strip anything that isn't a letter or number — prevents
//                     // code injection characters from being typed into the field
//                     const sanitized = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
//                     setUsername(sanitized);
//                     if (errorMsg) setErrorMsg(''); // Clear error as user starts retyping
//                   }}
//                   className={`
//                     w-full px-5 py-3 rounded-lg
//                     text-gray-700 text-base
//                     hover:bg-[#017ACB]/20 transition
//                     border ${errorMsg ? 'border-red-500' : 'border-gray-300'}
//                   `}
//                   placeholder="Enter your username"
//                   autoComplete="username"
//                   required // Client-side UX guard — backend validates authoritatively
//                 />

//                 {/* Inline error — shown beneath input when username is not found */}
//                 {errorMsg && (
//                   <p className="mt-2 text-sm text-red-600" role="alert">
//                     {errorMsg}
//                   </p>
//                 )}
//               </div>

//               {/* ACTION BUTTONS — flex-1 gives each button equal width */}
//               <div className="flex gap-4">

//                 {/* BACK TO LOGIN */}
//                 <Link
//                   href="/login"
//                   className="
//                     flex-1 px-5 py-3 text-center text-white border border-black/50
//                     bg-[#003A5C] rounded-lg text-base
//                     hover:bg-[#017ACB]/20 hover:text-gray-700 transition
//                     shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
//                     active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
//                     relative
//                     before:content-[''] before:absolute before:inset-0 before:rounded
//                     before:pointer-events-none
//                     before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
//                   "
//                 >
//                   Back to Login
//                 </Link>

//                 {/* SEND RESET LINK */}
//                 <button
//                   type="submit"
//                   className="
//                     flex-1 px-5 py-3 border border-black/50
//                     bg-[#017ACB] text-white rounded-lg text-base
//                     hover:bg-[#017ACB]/20 hover:text-gray-700 transition
//                     shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
//                     active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
//                     relative
//                     before:content-[''] before:absolute before:inset-0 before:rounded
//                     before:pointer-events-none
//                     before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
//                   "
//                 >
//                   Send Reset Link
//                 </button>
//               </div>

//             </form>
//           </>

//         ) : (

//           /* --------------------------------------------------------------- */
//           /* SUCCESS STATE — confirmation message + back to login             */
//           /* username displayed here comes from controlled state (not API)    */
//           /* Plain text render via React — no XSS risk                       */
//           /* --------------------------------------------------------------- */
//           <div className="text-center py-4">

//             {/* Success icon */}
//             <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
//               <svg
//                 className="w-8 h-8 text-green-600"
//                 fill="none"
//                 stroke="currentColor"
//                 viewBox="0 0 24 24"
//                 aria-hidden="true"
//               >
//                 <path
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   strokeWidth={2}
//                   d="M5 13l4 4L19 7"
//                 />
//               </svg>
//             </div>

//             <h3 className="text-xl font-bold text-gray-900 mb-2">
//               Check Your Messages
//             </h3>

//             {/* username is from controlled state — plain text, no injection risk */}
//             <p className="text-gray-600 text-base mb-6">
//               Reset instructions have been sent for <strong>{username}</strong>
//             </p>

//             <Link
//               href="/login"
//               className="
//                 inline-block px-5 py-3 border border-black/50
//                 bg-[#017ACB] text-white rounded-lg text-base
//                 hover:bg-[#017ACB]/20 hover:text-gray-700 transition
//                 shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
//                 active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
//                 relative
//                 before:content-[''] before:absolute before:inset-0 before:rounded
//                 before:pointer-events-none
//                 before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
//               "
//             >
//               Back to Login
//             </Link>

//           </div>
//         )}
//       </div>
//     </div>
//   );
// }