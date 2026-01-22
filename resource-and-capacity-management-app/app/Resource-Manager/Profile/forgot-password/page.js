'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  /* ---------------------------------------------------------
     HANDLE SUBMIT
     ---------------------------------------------------------
     PURPOSE:
     - Sends username to backend forgot‑password endpoint
     - Displays error if username is not found
     - Shows success state once request is accepted
  --------------------------------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/Resource-Manager/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      const data = await response.json();

      if (!data.success) {
        alert("Username not found. Please retype the correct username.");
        return;
      }

      setSubmitted(true);

    } catch (error) {
      console.error('Password reset error:', error);
      alert('Failed to send reset instructions. Please try again.');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={() => router.push('/')}
    >
      <div
        className="
          bg-white rounded-xl shadow-xl border border-gray-200
          p-8 m-4
          w-full max-w-xl
        "
        onClick={(e) => e.stopPropagation()}
      >

        {/* ---------------------------------------------------------
           HEADER SECTION
           ---------------------------------------------------------
           PURPOSE:
           - Displays logo, app name, and close button
        --------------------------------------------------------- */}
        <div className="flex justify-between items-center mb-8">

          <img
            src="/CapstoneDynamicsLogo.png"
            alt="Logo"
            className="h-24 flex-shrink-0"
          />

          <div className="flex flex-col items-center flex-1 mx-4">
            <h3
              className="text-2xl font-bold text-[#017ACB]"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Capstone Dynamics
            </h3>
            <h4
              className="text-base font-semibold text-black mt-1"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Resource & Capacity Management
            </h4>
          </div>

          <button
            onClick={() => router.push('/')}
            className="text-gray-500 hover:text-gray-700 text-3xl w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* ---------------------------------------------------------
           FORM SECTION (BEFORE SUBMISSION)
           ---------------------------------------------------------
           PURPOSE:
           - Allows user to enter username
           - Sends reset request to backend
        --------------------------------------------------------- */}
        {!submitted ? (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Forgot Password
            </h2>

            <p className="text-gray-600 text-base mb-6">
              Enter your username and we’ll send reset instructions.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">

              <div>
                <label
                  htmlFor="username"
                  className="block text-base font-medium text-gray-700 mb-2"
                >
                  Username
                </label>

                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="
                    w-full px-5 py-3
                    border border-gray-300 rounded-lg
                    text-gray-700 text-base
                    focus:ring-2 focus:ring-blue-500
                  "
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div className="flex gap-4">
                <Link
                  href="/"
                  className="
                    flex-1 px-5 py-3 text-center
                    text-gray-700 border border-gray-500 rounded-lg
                    hover:bg-gray-100
                    text-base
                  "
                >
                  Back to Login
                </Link>

                <button
                  type="submit"
                  className="
                    flex-1 px-5 py-3
                    bg-blue-600 text-white rounded-lg
                    hover:bg-blue-700
                    text-base
                  "
                >
                  Send Reset Link
                </button>
              </div>

            </form>
          </>
        ) : (

          /* ---------------------------------------------------------
             SUCCESS STATE
             ---------------------------------------------------------
             PURPOSE:
             - Confirms reset instructions were sent
             - Displays username and return-to-login button
          --------------------------------------------------------- */
          <div className="text-center py-4">

            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Check Your Messages
            </h3>

            <p className="text-gray-600 text-base mb-6">
              Reset instructions have been sent for <strong>{username}</strong>
            </p>

            <Link
              href="/"
              className="
                inline-block px-6 py-3
                bg-blue-600 text-white rounded-lg
                hover:bg-blue-700
                text-base
              "
            >
              Back to Login
            </Link>

          </div>
        )}
      </div>
    </div>
  );
}