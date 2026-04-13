export const dynamic = 'force-dynamic';

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
//      2. POST /api/auth/forgot-password is called with the username in the body
//      3. On success, the submitted state flips and a confirmation screen shows
//      4. On failure, an inline error message is shown — the user can retry

//    UI BEHAVIOUR:
//      • Full-screen backdrop overlay — clicking outside the card navigates to /login
//      • e.stopPropagation() on the card prevents backdrop clicks from firing
//        when the user interacts with the form

//    SECURITY MODEL:
//      • username is sent in the POST body — never in the URL, preventing it from
//        appearing in server logs, browser history, or referrer headers.
//      • required on the input is a UX convenience only — the backend validates
//        authoritatively and must not rely on client-side validation.
//      • API errors are caught and only a generic message is shown — internal error
//        details are logged server-side only.
//      • The success state displays the submitted username — this comes from
//        controlled React state (not the API response), plain text render, no XSS risk.
//      • ⚠️  NOTE: The backend currently returns a 404 if the username is not found,
//        which reveals whether an account exists (user enumeration risk). This should
//        be updated to always return a generic 200 response — see authController.js.

//    RESPONSIVENESS:
//      • m-4 on the card — edge padding on mobile screens.
//      • w-full max-w-xl — fills narrow screens, capped at xl on desktop.
//      • flex gap-4 on buttons — equal width side by side at all viewport sizes.

//    DEPENDENCIES:
//      • @/lib/api       — Axios instance with JWT Bearer token auto-injection
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
//      username:  Controlled input value — drives the POST body on submit.
//      submitted: Flips to true on a successful API response, shows confirmation.
//      errorMsg:  Inline error shown when the backend returns a failure.
//   --------------------------------------------------------------------------- */
//   const [username, setUsername]   = useState('');
//   const [submitted, setSubmitted] = useState(false);
//   const [errorMsg, setErrorMsg]   = useState('');

//   const router = useRouter();

//   /* ---------------------------------------------------------------------------
//      HANDLER: handleSubmit
//      ---------------------------------------------------------------------------
//      Submits the username to the forgot-password endpoint and transitions
//      to the success state on a valid response.

//      SECURITY:
//      • e.preventDefault() prevents browser form submission as GET — keeps
//        username out of the URL, browser history, and server logs.
//      • username is sent in the POST body only — never as a URL parameter.
//      • API errors are caught and only a generic message is shown to the user.
//   --------------------------------------------------------------------------- */
//   const handleSubmit = async (e) => {
//     e.preventDefault(); // Prevent GET submission — keeps username out of URL

//     setErrorMsg(''); // Clear previous error on each new attempt

//     try {
//       const res = await api.post('/auth/forgot-password', { username });

//       if (!res?.data?.success) {
//         setErrorMsg('Username not found. Please check and try again.');
//         return;
//       }

//       // Transition to success state — username shown in confirmation message
//       setSubmitted(true);

//     } catch (error) {
//       console.error('Password reset error:', error);
//       setErrorMsg('Failed to send reset instructions. Please try again.');
//     }
//   };

//   /* ===========================================================================
//      RENDER
//      Backdrop click navigates to /login. e.stopPropagation() on the card
//      prevents that from firing when the user interacts with form elements.
//   =========================================================================== */
//   return (
//     <div
//       className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50"
//       onClick={() => router.push('/login')}
//     >
//       <div
//         className="bg-white rounded-xl shadow-xl border border-gray-200 p-8 m-4 w-full max-w-xl"
//         onClick={(e) => e.stopPropagation()} // Prevent backdrop click when interacting inside
//       >

//         {/* HEADER */}
//         <div className="flex justify-between items-center mb-8">
//           <Image src="/CapstoneDynamicsLogo.png" alt="Capstone Dynamics logo" width={96} height={96} className="h-24 shrink-0" priority />
//           <div className="flex flex-col items-center flex-1 mx-4">
//             <h3 className="text-2xl font-bold text-[#017ACB]" style={{ fontFamily: 'Outfit, sans-serif' }}>Capstone Dynamics</h3>
//             <h4 className="text-base font-semibold text-black mt-1" style={{ fontFamily: 'Outfit, sans-serif' }}>Resource & Capacity Management</h4>
//           </div>
//         </div>

//         {/* FORM STATE vs SUCCESS STATE */}
//         {!submitted ? (

//           /* FORM STATE */
//           <>
//             <h2 className="text-2xl font-bold text-gray-900 mb-2">Forgot Password</h2>
//             <p className="text-gray-600 text-base mb-6">Enter your username and we'll send reset instructions.</p>

//             <form onSubmit={handleSubmit} className="space-y-6">
//               <div>
//                 <label htmlFor="username-input" className="block text-base font-medium text-gray-700 mb-2">Username</label>
//                 <input
//                   id="username-input"
//                   type="text"
//                   value={username}
//                   onChange={(e) => {
//                     // Strip non-alphanumeric characters — prevents injection characters
//                     const sanitized = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
//                     setUsername(sanitized);
//                     if (errorMsg) setErrorMsg(''); // Clear error as user retypes
//                   }}
//                   className={`w-full px-5 py-3 rounded-lg text-gray-700 text-base hover:bg-[#017ACB]/20 transition border ${errorMsg ? 'border-red-500' : 'border-gray-300'}`}
//                   placeholder="Enter your username"
//                   autoComplete="username"
//                   required // UX guard — backend validates authoritatively
//                 />
//                 {/* Inline error — shown beneath input when username is not found */}
//                 {errorMsg && <p className="mt-2 text-sm text-red-600" role="alert">{errorMsg}</p>}
//               </div>

//               {/* ACTION BUTTONS — flex-1 gives equal width */}
//               <div className="flex gap-4">
//                 <Link
//                   href="/login"
//                   className="
//                     flex-1 px-5 py-3 text-center text-white border border-black/50
//                     bg-[#003A5C] rounded-lg text-base
//                     hover:bg-[#017ACB]/20 hover:text-gray-700 transition
//                     shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
//                     active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
//                     relative before:content-[''] before:absolute before:inset-0 before:rounded
//                     before:pointer-events-none
//                     before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
//                   "
//                 >
//                   Back to Login
//                 </Link>
//                 <button
//                   type="submit"
//                   className="
//                     flex-1 px-5 py-3 border border-black/50
//                     bg-[#017ACB] text-white rounded-lg text-base
//                     hover:bg-[#017ACB]/20 hover:text-gray-700 transition
//                     shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
//                     active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
//                     relative before:content-[''] before:absolute before:inset-0 before:rounded
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

//           /* SUCCESS STATE — username from controlled state, plain text, no XSS risk */
//           <div className="text-center py-4">
//             <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
//               <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
//               </svg>
//             </div>
//             <h3 className="text-xl font-bold text-gray-900 mb-2">Check Your Messages</h3>
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
//                 relative before:content-[''] before:absolute before:inset-0 before:rounded
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
