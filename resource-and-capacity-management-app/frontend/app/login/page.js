

'use client';
export const dynamic = 'force-dynamic';
// /* =============================================================================
//    LoginPage.jsx
//    -----------------------------------------------------------------------------
//    PURPOSE:
//      Renders the login modal overlay. Accepts username and password, submits
//      credentials to the backend, stores the returned JWT and user object, and
//      routes the user to their role-specific dashboard on success.
//    ============================================================================= */

// import { useState } from 'react';
// import { useRouter } from 'next/navigation';
// import api from '@/lib/api';

// export default function LoginPage() {

//   const [username, setUsername]               = useState('');
//   const [password, setPassword]               = useState('');
//   const [showPassword, setShowPassword]       = useState(false);
//   const [showForgotModal, setShowForgotModal] = useState(false);
//   const [loginError, setLoginError]           = useState('');

//   const router = useRouter();

//   const handleLogin = async (e) => {
//     e.preventDefault();
//     setLoginError('');
//     try {
//       const res = await api.post('/auth/login', { username, password });
//       const user  = res?.data?.user;
//       const token = res?.data?.token;
//       if (!user || !token) throw new Error('Invalid login response');
//       localStorage.setItem('user',  JSON.stringify(user));
//       localStorage.setItem('token', token);
//       if (user.acc_type_id === 1) { router.push('/resource-manager/dashboard'); return; }
//       if (user.acc_type_id === 2) { router.push('/stakeholder/dashboard');      return; }
//       if (user.acc_type_id === 3) { router.push('/team-member/dashboard');      return; }
//       if (user.acc_type_id === 4) { router.push('/admin/dashboard');            return; }
//       router.push('/dashboard');
//     } catch (error) {
//       console.error('Login error:', error);
//       const errorCode = error?.response?.data?.error;
//       const message =
//         errorCode === 'username_not_found' ? 'Username not found. Please check and try again.' :
//         errorCode === 'wrong_password'     ? 'Incorrect password. Please try again.' :
//         errorCode === 'account_inactive'   ? 'This account has been deactivated. Please contact your administrator.' :
//         error?.response?.data?.message    ||
//         error?.message                    ||
//         'Login failed. Please try again.';
//       setLoginError(message);
//     }
//   };

//   return (
//     <>
//       {/* BACKDROP */}
//       <div
//         className="fixed inset-0 bg-white/30 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
//         onClick={() => router.push('/login')}
//       >
//         {/* CARD */}
//         <div
//           className="bg-white dark:bg-slate-900 rounded-xl shadow-xl dark:shadow-[0_8px_40px_rgba(0,0,0,0.6)] p-6 sm:p-8 w-full max-w-lg m-4 border border-gray-200 dark:border-slate-700"
//           onClick={(e) => e.stopPropagation()}
//         >

//           {/* HEADER */}
//           <div className="flex justify-between items-center mb-4 sm:mb-6">
//             <picture className="h-16 w-16 sm:h-24 sm:w-24 shrink-0">
//               <source srcSet="/CapstoneDynamicsLogoWhite.png" media="(prefers-color-scheme: dark)" />
//               <img src="/CapstoneDynamicsLogo.png" alt="Capstone Dynamics logo" className="h-16 w-16 sm:h-24 sm:w-24 shrink-0" />
//             </picture>
//             <div className="flex flex-col items-center flex-1 mx-3 sm:mx-4">
//               <h3 className="text-lg sm:text-2xl font-bold text-[#017ACB] dark:text-[#4DAEFF]" style={{ fontFamily: 'Outfit, sans-serif' }}>
//                 Capstone Dynamics
//               </h3>
//               <h4 className="text-xs sm:text-base font-semibold text-black dark:text-slate-200 mt-1 text-center" style={{ fontFamily: 'Outfit, sans-serif' }}>
//                 Resource &amp; Capacity Management
//               </h4>
//             </div>
//           </div>

//           {/* LOGIN FORM */}
//           <form onSubmit={handleLogin} className="space-y-4 sm:space-y-6">

//             {/* USERNAME */}
//             <div>
//               <label htmlFor="username-input" className="block text-base font-medium text-gray-700 dark:text-slate-300 mb-2">
//                 Username
//               </label>
//               <input
//                 id="username-input"
//                 type="text"
//                 value={username}
//                 onChange={(e) => {
//                   const sanitized = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
//                   setUsername(sanitized);
//                   if (loginError) setLoginError('');
//                 }}
//                 className="
//                   w-full px-5 py-3 rounded-lg text-base border
//                   border-gray-300 dark:border-slate-600
//                   bg-white dark:bg-slate-800
//                   text-gray-700 dark:text-slate-100
//                   placeholder:text-gray-400 dark:placeholder:text-slate-500
//                   hover:bg-[#017ACB]/10 dark:hover:bg-[#017ACB]/20
//                   focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-slate-400
//                   focus:border-black dark:focus:border-slate-400
//                   transition
//                 "
//                 autoComplete="username"
//                 maxLength={50}
//                 required
//               />
//             </div>

//             {/* PASSWORD */}
//             <div>
//               <label htmlFor="password-input" className="block text-base font-medium text-gray-700 dark:text-slate-300 mb-2">
//                 Password
//               </label>
//               <div className="relative">
//                 <input
//                   id="password-input"
//                   type={showPassword ? 'text' : 'password'}
//                   value={password}
//                   onChange={(e) => {
//                     const sanitized = e.target.value.replace(/[<>'"`;]/g, '');
//                     setPassword(sanitized);
//                   }}
//                   className="
//                     w-full px-5 py-3 pr-12 rounded-lg text-base border
//                     border-gray-300 dark:border-slate-600
//                     bg-white dark:bg-slate-800
//                     text-gray-700 dark:text-slate-100
//                     hover:bg-[#017ACB]/10 dark:hover:bg-[#017ACB]/20
//                     focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-slate-400
//                     focus:border-black dark:focus:border-slate-400
//                     transition
//                   "
//                   autoComplete="current-password"
//                   maxLength={100}
//                   required
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowPassword(prev => !prev)}
//                   className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition"
//                   aria-label={showPassword ? 'Hide password' : 'Show password'}
//                 >
//                   {showPassword ? (
//                     <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
//                       <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7a9.77 9.77 0 012.168-3.832M6.343 6.343A9.956 9.956 0 0112 5c5 0 9 4 9 7a9.77 9.77 0 01-1.657 2.343M3 3l18 18" />
//                     </svg>
//                   ) : (
//                     <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
//                       <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
//                       <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
//                     </svg>
//                   )}
//                 </button>
//               </div>
//             </div>

//             {/* FORGOT PASSWORD */}
//             <div className="text-right">
//               <button
//                 type="button"
//                 onClick={() => setShowForgotModal(true)}
//                 className="text-sm text-[#017ACB] dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition"
//                 style={{ fontFamily: 'Outfit, sans-serif' }}
//               >
//                 Forgot Password?
//               </button>
//             </div>

//             {/* ERROR BANNER */}
//             {loginError && (
//               <div role="alert" className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg text-sm flex items-start gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
//                 <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
//                 </svg>
//                 <span className="flex-1">{loginError}</span>
//                 <button type="button" onClick={() => setLoginError('')} className="font-bold text-red-900 dark:text-red-200 hover:text-red-700 dark:hover:text-red-100 leading-none">×</button>
//               </div>
//             )}

//             {/* SIGN IN BUTTON */}
//             <div className="flex gap-4">
//               <button
//                 type="submit"
//                 className="
//                   w-full sm:w-2/3 sm:mx-auto px-5 py-3 sm:py-3
//                   border border-black/50 dark:border-slate-500
//                   bg-[#017ACB] dark:bg-[#005a96] text-white rounded-lg text-sm sm:text-lg
//                   hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 hover:text-gray-700 dark:hover:text-slate-100
//                   transition-all
//                   shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
//                   dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5)]
//                   active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
//                   dark:active:shadow-[2px_2px_6px_rgba(0,0,0,0.5)]
//                   relative before:content-[''] before:absolute before:inset-0 before:rounded
//                   before:pointer-events-none
//                   before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
//                   dark:before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.45)]
//                 "
//               >
//                 Sign In
//               </button>
//             </div>

//           </form>
//         </div>
//       </div>

//       {/* FORGOT PASSWORD MODAL */}
//       {showForgotModal && (
//         <div
//           className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] px-4"
//           onClick={() => setShowForgotModal(false)}
//         >
//           <div
//             className="bg-white dark:bg-slate-900 rounded-xl shadow-xl dark:shadow-[0_8px_40px_rgba(0,0,0,0.6)] p-6 w-full max-w-sm border border-gray-200 dark:border-slate-700 text-center"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="flex justify-center mb-4">
//               <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
//                 <svg className="w-6 h-6 text-[#017ACB] dark:text-[#4DAEFF]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.657 1.343-3 3-3s3 1.343 3 3v1H9v-1c0-1.657 1.343-3 3-3s3 1.343 3 3z" />
//                   <path strokeLinecap="round" strokeLinejoin="round" d="M5 11h14v10H5z" />
//                 </svg>
//               </div>
//             </div>
//             <h3 className="text-lg font-bold text-black dark:text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
//               Forgot Password?
//             </h3>
//             <p className="text-sm text-gray-600 dark:text-slate-300 mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
//               Please contact your administrator to reset your password.
//             </p>
//             <button
//               type="button"
//               onClick={() => setShowForgotModal(false)}
//               className="
//                 w-full px-5 py-2.5 border border-black/50 dark:border-slate-500
//                 bg-[#017ACB] dark:bg-[#005a96] text-white rounded-lg text-sm
//                 hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 hover:text-gray-700 dark:hover:text-slate-100
//                 transition
//                 shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
//                 dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5)]
//                 active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
//                 dark:active:shadow-[2px_2px_6px_rgba(0,0,0,0.5)]
//                 relative before:content-[''] before:absolute before:inset-0 before:rounded
//                 before:pointer-events-none
//                 before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
//                 dark:before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.45)]
//               "
//               style={{ fontFamily: 'Outfit, sans-serif' }}
//             >
//               Got it
//             </button>
//           </div>
//         </div>
//       )}
//     </>
//   );
// }




/* =============================================================================
   LoginPage.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Renders the login page. Accepts username and password, submits credentials
     to the backend, stores the returned JWT and user object, and routes the
     user to their role-specific dashboard on success.

   LAYOUT:
     • Desktop (lg+) — login card and demo credentials panel side by side
     • Mobile        — login card stacked above demo credentials panel
     • The demo credentials panel is collapsed on mobile by default and can
       be toggled open with a button to avoid cluttering the login form

   SECURITY MODEL:
     • Username sanitised to alphanumeric only — prevents injection
     • Password sanitised to strip <>"'`;  — prevents script injection
     • JWT and user stored in localStorage on success
     • Error codes from backend mapped to user-friendly messages
     • No sensitive data logged to console

   DEPENDENCIES:
     • @/lib/api       — Axios instance
     • next/navigation — useRouter
   ============================================================================= */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function LoginPage() {
  const [username, setUsername]               = useState('');
  const [password, setPassword]               = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [loginError, setLoginError]           = useState('');
  const [showDemoCreds, setShowDemoCreds]     = useState(false);

  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res   = await api.post('/auth/login', { username, password });
      const user  = res?.data?.user;
      const token = res?.data?.token;
      if (!user || !token) throw new Error('Invalid login response');
      localStorage.setItem('user',  JSON.stringify(user));
      localStorage.setItem('token', token);
      if (user.acc_type_id === 1) { router.push('/resource-manager/dashboard'); return; }
      if (user.acc_type_id === 2) { router.push('/stakeholder/dashboard');      return; }
      if (user.acc_type_id === 3) { router.push('/team-member/dashboard');      return; }
      if (user.acc_type_id === 4) { router.push('/admin/dashboard');            return; }
      router.push('/dashboard');
    } catch (error) {
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
     DEMO CREDENTIALS DATA
  --------------------------------------------------------------------------- */
  const demoCreds = [
    { role: 'Resource Manager', username: 'cnguyen',    password: 'pass1002' },
    { role: 'Stakeholder',      username: 'lmitchells', password: 'pass1503' },
    { role: 'Team Member',      username: 'amurphy',    password: 'pass2003' },
  ];

  return (
    <>
      {/* =====================================================================
          BACKDROP
      ===================================================================== */}
      <div
        className="fixed inset-0 bg-white/30 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-6 overflow-y-auto"
        onClick={() => router.push('/login')}
      >
        <div
          className="flex flex-col lg:flex-row items-center lg:items-stretch justify-center gap-4 w-full max-w-4xl my-auto"
          onClick={(e) => e.stopPropagation()}
        >

          {/* ==================================================================
              LOGIN CARD
          ================================================================== */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl dark:shadow-[0_8px_40px_rgba(0,0,0,0.6)] p-6 sm:p-8 w-full max-w-lg border border-gray-200 dark:border-slate-700 flex-shrink-0">

            {/* HEADER */}
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <picture className="h-14 w-14 sm:h-24 sm:w-24 shrink-0">
                <source srcSet="/CapstoneDynamicsLogoWhite.png" media="(prefers-color-scheme: dark)" />
                <img src="/CapstoneDynamicsLogo.png" alt="Capstone Dynamics logo" className="h-14 w-14 sm:h-24 sm:w-24 shrink-0" />
              </picture>
              <div className="flex flex-col items-center flex-1 mx-3 sm:mx-4">
                <h3 className="text-base sm:text-2xl font-bold text-[#017ACB] dark:text-[#4DAEFF]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Capstone Dynamics
                </h3>
                <h4 className="text-xs sm:text-base font-semibold text-black dark:text-slate-200 mt-1 text-center" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Resource &amp; Capacity Management
                </h4>
              </div>
            </div>

            {/* LOGIN FORM */}
            <form onSubmit={handleLogin} className="space-y-4">

              {/* USERNAME */}
              <div>
                <label htmlFor="username-input" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                  Username
                </label>
                <input
                  id="username-input"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value.replace(/[^a-zA-Z0-9]/g, ''));
                    if (loginError) setLoginError('');
                  }}
                  className="w-full px-4 py-2.5 rounded-lg text-sm border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 hover:bg-[#017ACB]/10 dark:hover:bg-[#017ACB]/20 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-slate-400 focus:border-black dark:focus:border-slate-400 transition"
                  autoComplete="username"
                  maxLength={50}
                  required
                />
              </div>

              {/* PASSWORD */}
              <div>
                <label htmlFor="password-input" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value.replace(/[<>'"`;]/g, ''))}
                    className="w-full px-4 py-2.5 pr-11 rounded-lg text-sm border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-100 hover:bg-[#017ACB]/10 dark:hover:bg-[#017ACB]/20 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-slate-400 focus:border-black dark:focus:border-slate-400 transition"
                    autoComplete="current-password"
                    maxLength={100}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7a9.77 9.77 0 012.168-3.832M6.343 6.343A9.956 9.956 0 0112 5c5 0 9 4 9 7a9.77 9.77 0 01-1.657 2.343M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* FORGOT PASSWORD */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-sm text-[#017ACB] dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  Forgot Password?
                </button>
              </div>

              {/* ERROR BANNER */}
              {loginError && (
                <div role="alert" className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg text-sm flex items-start gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <span className="flex-1">{loginError}</span>
                  <button type="button" onClick={() => setLoginError('')} className="font-bold text-red-900 dark:text-red-200 leading-none">×</button>
                </div>
              )}

              {/* SIGN IN BUTTON */}
              <button
                type="submit"
                className="w-full px-5 py-2.5 border border-black/50 dark:border-slate-500 bg-[#017ACB] dark:bg-[#005a96] text-white rounded-lg text-sm font-semibold hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 hover:text-gray-700 dark:hover:text-slate-100 transition-all shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5)] active:shadow-[2px_2px_6px_rgba(0,0,0,0.25)] relative before:content-[''] before:absolute before:inset-0 before:rounded before:pointer-events-none before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)] dark:before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.45)]"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                Sign In
              </button>

              {/* MOBILE DEMO CREDENTIALS TOGGLE — only visible on mobile */}
              <button
                type="button"
                onClick={() => setShowDemoCreds(prev => !prev)}
                className="w-full lg:hidden px-4 py-2 text-sm text-[#017ACB] dark:text-[#4DAEFF] border border-[#017ACB]/30 dark:border-slate-600 rounded-lg hover:bg-[#017ACB]/10 dark:hover:bg-[#017ACB]/20 transition"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                {showDemoCreds ? 'Hide Demo Credentials ▲' : 'Show Demo Credentials ▼'}
              </button>

            </form>

            {/* MOBILE DEMO CREDENTIALS — inline below form, only on mobile */}
            {showDemoCreds && (
              <div className="lg:hidden mt-4 space-y-3 border-t border-gray-200 dark:border-slate-700 pt-4">
                {demoCreds.map(({ role, username: u, password: p }) => (
                  <div key={role} className="border border-gray-200 dark:border-slate-700 rounded-lg p-3">
                    <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5" style={{ fontFamily: 'Outfit, sans-serif' }}>{role}</p>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500 dark:text-slate-400" style={{ fontFamily: 'Outfit, sans-serif' }}>Username</span>
                        <button type="button" onClick={() => navigator.clipboard.writeText(u)} className="text-xs font-mono text-[#017ACB] dark:text-[#4DAEFF] hover:underline" title="Click to copy">{u}</button>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500 dark:text-slate-400" style={{ fontFamily: 'Outfit, sans-serif' }}>Password</span>
                        <button type="button" onClick={() => navigator.clipboard.writeText(p)} className="text-xs font-mono text-[#017ACB] dark:text-[#4DAEFF] hover:underline" title="Click to copy">{p}</button>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-3 opacity-50">
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>Admin</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 italic" style={{ fontFamily: 'Outfit, sans-serif' }}>Credentials not provided</p>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-slate-500 text-center" style={{ fontFamily: 'Outfit, sans-serif' }}>Click a username or password to copy it</p>
              </div>
            )}
          </div>

          {/* ==================================================================
              DEMO CREDENTIALS PANEL — desktop only (lg+)
          ================================================================== */}
          <div className="hidden lg:flex bg-white dark:bg-slate-900 rounded-xl shadow-xl dark:shadow-[0_8px_40px_rgba(0,0,0,0.6)] p-6 w-full max-w-xs border border-gray-200 dark:border-slate-700 flex-shrink-0 flex-col justify-center">
            <h4 className="text-base font-bold text-[#017ACB] dark:text-[#4DAEFF] mb-4 text-center" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Demo Credentials
            </h4>
            <div className="space-y-4">
              {demoCreds.map(({ role, username: u, password: p }) => (
                <div key={role} className="border border-gray-200 dark:border-slate-700 rounded-lg p-3">
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5" style={{ fontFamily: 'Outfit, sans-serif' }}>{role}</p>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 dark:text-slate-400" style={{ fontFamily: 'Outfit, sans-serif' }}>Username</span>
                      <button type="button" onClick={() => navigator.clipboard.writeText(u)} className="text-xs font-mono text-[#017ACB] dark:text-[#4DAEFF] hover:underline" title="Click to copy">{u}</button>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 dark:text-slate-400" style={{ fontFamily: 'Outfit, sans-serif' }}>Password</span>
                      <button type="button" onClick={() => navigator.clipboard.writeText(p)} className="text-xs font-mono text-[#017ACB] dark:text-[#4DAEFF] hover:underline" title="Click to copy">{p}</button>
                    </div>
                  </div>
                </div>
              ))}
              <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-3 opacity-50">
                <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>Admin</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 italic" style={{ fontFamily: 'Outfit, sans-serif' }}>Credentials not provided</p>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-slate-500 text-center mt-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Click a username or password to copy it
            </p>
          </div>

        </div>
      </div>

      {/* =====================================================================
          FORGOT PASSWORD MODAL
      ===================================================================== */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] px-4" onClick={() => setShowForgotModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl dark:shadow-[0_8px_40px_rgba(0,0,0,0.6)] p-6 w-full max-w-sm border border-gray-200 dark:border-slate-700 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#017ACB] dark:text-[#4DAEFF]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.657 1.343-3 3-3s3 1.343 3 3v1H9v-1c0-1.657 1.343-3 3-3s3 1.343 3 3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 11h14v10H5z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-bold text-black dark:text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>Forgot Password?</h3>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>Please contact your administrator to reset your password.</p>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full px-5 py-2.5 border border-black/50 dark:border-slate-500 bg-[#017ACB] dark:bg-[#005a96] text-white rounded-lg text-sm hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 hover:text-gray-700 dark:hover:text-slate-100 transition shadow-[4px_4px_10px_rgba(0,0,0,0.25)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5)] relative before:content-[''] before:absolute before:inset-0 before:rounded before:pointer-events-none before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)] dark:before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.45)]"
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