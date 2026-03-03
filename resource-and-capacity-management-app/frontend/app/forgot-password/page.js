'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post('/auth/forgot-password', { username });

      if (!res?.data?.success) {
        alert('Username not found. Please retype the correct username.');
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
      className="
        fixed inset-0 bg-white/30 backdrop-blur-sm
        flex items-center justify-center z-50
      "
      onClick={() => router.push('/login')}
    >
      <div
        className="
          bg-white rounded-xl shadow-xl border border-gray-200
          p-8 m-4 w-full max-w-xl
        "
        onClick={(e) => e.stopPropagation()}
      >

        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <Image
            src="/CapstoneDynamicsLogo.png"
            alt="Logo"
            width={96}
            height={96}
            className="h-24 shrink-0"
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
        </div>

        {/* BEFORE SUBMISSION */}
        {!submitted ? (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Forgot Password
            </h2>

            <p className="text-gray-600 text-base mb-6">
              Enter your username and we’ll send reset instructions.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* USERNAME INPUT */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Username
                </label>

                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="
                    w-full px-5 py-3 border border-gray-300 rounded-lg
                    text-gray-700 text-base
                    hover:bg-[#017ACB]/20 transition
                   
                  "
                  placeholder="Enter your username"
                  required
                />
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex gap-4">

                {/* BACK TO LOGIN (GRAY BUTTON WITH BEVEL) */}
                <Link
                  href="/login"
                  className="
                    flex-1 px-5 py-3 text-center text-gray-700
                    bg-gray-200 border border-gray-500 rounded-lg text-base
                    hover:bg-gray-300 transition
                shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
                active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
                  "
                >
                  Back to Login
                </Link>

                {/* SEND RESET LINK (BLUE BUTTON WITH BEVEL) */}
                <button
                  type="submit"
                  className="
                    flex-1 px-5 py-3
                    bg-[#017ACB] text-white rounded-lg text-base
                    hover:bg-[#017ACB]/20 hover:text-gray-700 transition
                shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
                active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
                  "
                >
                  Send Reset Link
                </button>
              </div>

            </form>
          </>
        ) : (

          /* SUCCESS STATE */
          <div className="text-center py-4">

            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Check Your Messages
            </h3>

            <p className="text-gray-600 text-base mb-6">
              Reset instructions have been sent for <strong>{username}</strong>
            </p>

            <Link
              href="/login"
              className="
                inline-block px-6 py-3
                bg-[#017ACB] text-white rounded-lg text-base
                hover:bg-[#017ACB]/20 hover:text-gray-700 transition
                shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
                active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
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