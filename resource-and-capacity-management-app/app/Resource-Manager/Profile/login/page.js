'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  /* ---------------------------------------------------------
     HANDLE LOGIN
     ---------------------------------------------------------
     PURPOSE:
     - Sends login credentials to backend authentication API
     - Stores authenticated user in localStorage
     - Redirects to dashboard upon successful login
  --------------------------------------------------------- */
  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      const response = await fetch(`${apiUrl}/api/Resource-Manager/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Login failed. Please try again.');
        return;
      }

      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/Resource-Manager/dashboard');

    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please check your connection and try again.');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={() => router.push('/')}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-8 w-full max-w-lg m-4 border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >

        {/* ---------------------------------------------------------
           HEADER SECTION
           ---------------------------------------------------------
           PURPOSE:
           - Displays logo, application name, and close button
        --------------------------------------------------------- */}
        <div className="flex justify-between items-center mb-6">
          <img src="/CapstoneDynamicsLogo.png" alt="Logo" className="h-24" />

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
           LOGIN FORM
           ---------------------------------------------------------
           PURPOSE:
           - Collects username and password
           - Submits credentials for authentication
        --------------------------------------------------------- */}
        <form onSubmit={handleLogin} className="space-y-6">

          {/* Username field */}
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-5 py-3 border text-gray-700 border-gray-300 rounded-lg text-base"
              required
            />
          </div>

          {/* Password field */}
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-3 border text-gray-700 border-gray-300 rounded-lg text-base"
              required
            />
          </div>

          {/* Forgot Password link */}
          <div className="text-right">
            <Link
              href="/Resource-Manager/Profile/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Forgot Password?
            </Link>
          </div>

          {/* ---------------------------------------------------------
             ACTION BUTTONS
             ---------------------------------------------------------
             PURPOSE:
             - Cancel returns user to home page
             - Sign In submits login form for authentication
          --------------------------------------------------------- */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="flex-1 px-5 py-3 text-gray-700 border border-gray-500 rounded-lg hover:bg-gray-300 text-base"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex-1 px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-base"
            >
              Sign In
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}