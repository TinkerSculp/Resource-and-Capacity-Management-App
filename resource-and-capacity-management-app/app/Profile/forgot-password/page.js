'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ForgotPasswordPage() {

    // Stores the username entered by the user
    const [username, setUsername] = useState('');

    // Tracks whether the reset request was successfully submitted
    const [submitted, setSubmitted] = useState(false);

    // Next.js router for navigation (closing modal, redirecting)
    const router = useRouter();

    /**
     * Handles the form submission for requesting a password reset.
     * - Prevents default form behavior
     * - Sends username to backend API
     * - Displays success or error feedback
     */
    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            // POST request to backend API route
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });

            const data = await response.json();

            // Backend indicates username was not found
            if (!data.success) {
                alert("Username not found. Please retype the correct username.");
                return;
            }

            // Display success UI
            setSubmitted(true);

        } catch (error) {
            // Network or server error
            console.error('Password reset error:', error);
            alert('Failed to send reset instructions. Please try again.');
        }
    };

    return (
        <div
            // Full‑screen modal overlay
            className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50"

            // Clicking outside the modal closes it and returns to login
            onClick={() => router.push('/')}
        >
            <div
                // Modal container
                className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4 border border-gray-200"

                // Prevent modal from closing when clicking inside
                onClick={(e) => e.stopPropagation()}
            >

                {/* ---------------- HEADER SECTION ---------------- */}
                <div className="flex justify-between items-center mb-4">

                    {/* Application logo */}
                    <img src="/CapstoneDynamicsLogo.png" alt="Logo" className="h-20 flex-shrink-0" />

                    {/* App title + subtitle */}
                    <div className="flex flex-col items-center justify-center flex-1 mx-4">
                        <h3 className="text-xl font-bold text-[#017ACB]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Capstone Dynamics
                        </h3>
                        <h4 className="text-sm font-bold text-black mt-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Resource & Capacity Management
                        </h4>
                    </div>

                    {/* Close button (returns to login) */}
                    <button
                        onClick={() => router.push('/')}
                        className="text-gray-500 hover:text-gray-700 text-2xl cursor-pointer flex-shrink-0 w-8 h-8 flex items-center justify-center"
                    >
                        ×
                    </button>
                </div>

                {/* ---------------- FORM SECTION ---------------- */}
                {!submitted ? (
                    <>
                        {/* Page title + instructions */}
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Forgot Password</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            Enter your username and we’ll send reset instructions.
                        </p>

                        {/* Username input form */}
                        <form onSubmit={handleSubmit} className="space-y-4">

                            {/* Username field */}
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                                    Username
                                </label>

                                <input
                                    type="text"
                                    id="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-2 border text-gray-700 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                                    placeholder="Enter your username"
                                    required
                                />
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-3">

                                {/* Return to login */}
                                <Link
                                    href="/"
                                    className="flex-1 px-4 py-2 text-center text-gray-700 border border-gray-500 rounded-lg hover:bg-gray-100 transition"
                                >
                                    Back to Login
                                </Link>

                                {/* Submit reset request */}
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                >
                                    Send Reset Link
                                </button>
                            </div>
                        </form>
                    </>
                ) : (

                    /* ---------------- SUCCESS STATE ---------------- */
                    <div className="text-center py-4">

                        {/* Success icon */}
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>

                        {/* Success message */}
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Check Your Messages</h3>

                        <p className="text-sm text-gray-600 mb-6">
                            Reset instructions have been sent for <strong>{username}</strong>
                        </p>

                        {/* Return to login */}
                        <Link
                            href="/"
                            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                            Back to Login
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}