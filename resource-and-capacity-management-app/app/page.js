'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/* ---------------------------------------------------------
   Login Page Component
   ---------------------------------------------------------
   - Handles user authentication
   - Sends credentials to backend API
   - Stores returned user object in localStorage
   - Redirects to dashboard on success
--------------------------------------------------------- */
export default function LoginPage() {

    /* -----------------------------------------------------
       Local State
       -----------------------------------------------------
       username → stores typed username
       password → stores typed password
    ----------------------------------------------------- */
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const router = useRouter();

    /* -----------------------------------------------------
       handleLogin
       -----------------------------------------------------
       - Prevents default form submission
       - Sends POST request to backend login API
       - If successful:
           → stores user object in localStorage
           → redirects to dashboard
       - If failed:
           → displays error alert
    ----------------------------------------------------- */
    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

            const response = await fetch(`${apiUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.error || 'Login failed. Please try again.');
                return;
            }

            // Store only what backend returns
            localStorage.setItem('user', JSON.stringify(data.user));

            router.push('/dashboard');

        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed. Please check your connection and try again.');
        }
    };

    /* -----------------------------------------------------
       Render
       -----------------------------------------------------
       - Fullscreen modal-style login container
       - Click outside closes and returns to home
       - Includes:
           → Logo + App Title
           → Username + Password fields
           → Forgot Password link
           → Cancel + Sign In buttons
    ----------------------------------------------------- */
    return (
        <div
            className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => router.push('/')}
        >
            <div
                className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4 border border-gray-200"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
            >

                {/* -------------------------------------------------
                    Header Section
                    -------------------------------------------------
                    - Displays logo and app name
                    - Includes close button (returns to home)
                ------------------------------------------------- */}
                <div className="flex justify-between items-center mb-4">
                    <img src="/CapstoneDynamicsLogo.png" alt="Logo" className="h-20" />

                    <div className="flex flex-col items-center flex-1 mx-4">
                        <h3
                            className="text-xl font-bold text-[#017ACB]"
                            style={{ fontFamily: 'Outfit, sans-serif' }}
                        >
                            Capstone Dynamics
                        </h3>
                        <h4
                            className="text-sm font-bold text-black mt-1"
                            style={{ fontFamily: 'Outfit, sans-serif' }}
                        >
                            Resource & Capacity Management
                        </h4>
                    </div>

                    <button
                        onClick={() => router.push('/')}
                        className="text-gray-500 hover:text-gray-700 text-2xl w-8 h-8 flex items-center justify-center"
                    >
                        ×
                    </button>
                </div>

                {/* -------------------------------------------------
                    Login Form
                    -------------------------------------------------
                    - Username + Password inputs
                    - Forgot password link
                    - Cancel + Sign In buttons
                ------------------------------------------------- */}
                <form onSubmit={handleLogin} className="space-y-4">

                    {/* Username Field */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Username
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-2 border text-gray-700 border-gray-300 rounded-lg"
                            required
                        />
                    </div>

                    {/* Password Field */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border text-gray-700 border-gray-300 rounded-lg"
                            required
                        />
                    </div>

                    {/* Forgot Password Link */}
                    <div className="text-right">
                        <Link
                            href="/Profile/forgot-password"
                            className="text-sm text-blue-600 hover:text-blue-800"
                        >
                            Forgot Password?
                        </Link>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => router.push('/')}
                            className="flex-1 px-4 py-2 text-gray-700 border border-gray-500 rounded-lg hover:bg-gray-300"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Sign In
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}