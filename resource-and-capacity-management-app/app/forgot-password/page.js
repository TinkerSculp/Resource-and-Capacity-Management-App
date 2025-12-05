'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            // TODO: Implement password reset API call
            // const response = await fetch('http://localhost:3001/api/auth/forgot-password', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ email })
            // });
            
            // Simulate success for now
            setSubmitted(true);
        } catch (error) {
            console.error('Password reset error:', error);
            alert('Failed to send reset email. Please try again.');
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => router.push('/')}
        >
            <div 
                className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4 border border-gray-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <img src="/CapstoneDynamicsLogo.png" alt="Logo" className="h-20 flex-shrink-0"/>
                    <div className="flex flex-col items-center justify-center flex-1 mx-4">
                        <h3 className="text-xl font-bold text-[#017ACB] whitespace-nowrap leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>Capstone Dynamics</h3>
                        <h4 className="text-sm font-bold text-black whitespace-nowrap leading-tight mt-1" style={{ fontFamily: 'Outfit, sans-serif' }}>Resource & Capacity Management</h4>
                    </div>
                    <button
                        onClick={() => router.push('/')}
                        className="text-gray-500 hover:text-gray-700 text-2xl cursor-pointer flex-shrink-0 w-8 h-8 flex items-center justify-center"
                    >
                        ×
                    </button>
                </div>

                {!submitted ? (
                    <>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Forgot Password</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            Enter your email and you will get a code to reset your password
                        </p>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-2 border text-gray-700 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>
                            
                            <div className="flex gap-3">
                                <Link
                                    href="/login"
                                    className="flex-1 px-4 py-2 text-center text-gray-700 border border-gray-500 rounded-lg hover:bg-gray-100 cursor-pointer transition"
                                >
                                    Back to Login
                                </Link>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition"
                                >
                                    Send Reset Link
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="text-center py-4">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Check Your Email</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            We've sent password reset instructions to <strong>{email}</strong>
                        </p>
                        <Link
                            href="/login"
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
