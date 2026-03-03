'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';

export default function LoginPage() {
  /* ---------------------------------------------------------
     STATE MANAGEMENT
     ---------------------------------------------------------
     • username/password → controlled inputs
     • router → navigation after login
  --------------------------------------------------------- */
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  /* ---------------------------------------------------------
     SECURITY: LOGIN HANDLER
     ---------------------------------------------------------
     • Prevents default form submission
     • Sends credentials securely to backend
     • Defensive checks on response structure
     • Stores token + user safely in localStorage
     • Applies role‑based routing
  --------------------------------------------------------- */
  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post('/auth/login', {
        username,
        password
      });

      const user = res?.data?.user;
      const token = res?.data?.token;

      // Defensive: ensure backend returned required fields
      if (!user || !token) {
        throw new Error('Invalid login response');
      }

      // Save user + token
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);

      /* -----------------------------------------------------
         ROLE‑BASED ROUTING
         -----------------------------------------------------
         • 1 → Resource Manager
         • 2 → Stakeholder
         • 3 → Team Member
      ----------------------------------------------------- */
      if (user.acc_type_id === 1) {
        router.push('/resource-manager/dashboard');
        return;
      }

      if (user.acc_type_id === 2) {
        router.push('/stakeholder/dashboard');
        return;
      }

      if (user.acc_type_id === 3) {
        router.push('/team-member/dashboard');
        return;
      }

      // Fallback
      router.push('/dashboard');

    } catch (error) {
      console.error('Login error:', error);

      const message =
        error?.response?.data?.error ||
        error?.message ||
        'Login failed. Please try again.';

      alert(message);
    }
  };

  /* ---------------------------------------------------------
     FINAL RENDER
     ---------------------------------------------------------
     • Full‑screen modal overlay
     • Prevents header flash by capturing background clicks
     • Clean, centered login card
  --------------------------------------------------------- */
  return (
    <>
      <div
        className="
          fixed inset-0 bg-white/30 backdrop-blur-sm
          flex items-center justify-center z-50
        "
        onClick={() => router.push('/login')}
      >
        <div
          className="
            bg-white rounded-xl shadow-xl p-8
            w-full max-w-lg m-4 border border-gray-200
          "
          onClick={(e) => e.stopPropagation()}
        >

          {/* ---------------------------------------------------
             HEADER (LOGO + TITLE)
          --------------------------------------------------- */}
          <div className="flex justify-between items-center mb-6">
            <Image
              src="/CapstoneDynamicsLogo.png"
              alt="Logo"
              width={96}
              height={96}
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

          {/* ---------------------------------------------------
             LOGIN FORM
          --------------------------------------------------- */}
          <form onSubmit={handleLogin} className="space-y-6">

            {/* USERNAME */}
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="
                  w-full px-5 py-3 border text-gray-700
                  border-gray-300 rounded-lg text-base
                  hover:bg-[#017ACB]/20
                  transition
                "
                required
              />
            </div>

            {/* PASSWORD */}
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Password
              </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="
                w-full px-5 py-3 border text-gray-700
                border-gray-300 rounded-lg text-base
                hover:bg-[#017ACB]/20
                transition
              "
              required
            />
            </div>

            {/* FORGOT PASSWORD */}
            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Forgot Password?
              </Link>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="
                flex-1 px-5 py-3
                bg-gray-200 text-gray-700
                border border-gray-500
                rounded-lg text-base
                hover:bg-[#017ACB]/20 hover:text-gray-700
                shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
                active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
              "
            >
              Cancel
            </button>

              <button
                type="submit"
                className="
                  flex-1 px-5 py-3
                  bg-[#017ACB] text-white
                  rounded-lg text-base
                  hover:bg-[#017ACB]/20 hover:text-gray-700
                    shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
                          active:shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
                "
              >
                Sign In
              </button>
            </div>

          </form>
        </div>
      </div>
    </>
  );
}