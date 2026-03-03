'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post('/auth/login', {
        username,
        password
      });

      const user = res?.data?.user;
      const token = res?.data?.token;

      if (!user || !token) {
        throw new Error('Invalid login response');
      }

      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);

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

          {/* HEADER */}
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

          {/* LOGIN FORM */}
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
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
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
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
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