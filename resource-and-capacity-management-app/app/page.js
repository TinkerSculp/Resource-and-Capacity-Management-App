'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();

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
            
            // Store user data in localStorage (or use a state management solution)
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Redirect to dashboard after successful login
            router.push('/dashboard');
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
                className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4 border border-gray-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <img src="/CapstoneDynamicsLogo.png" alt="Logo" className="h-20 flex-shrink-0"/>
                    <div className="flex flex-col items-center justify-center flex-1 mx-4">
                        <h3 className="text-xl font-bold text-[#017ACB] whitespace-nowrap leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>Capstone Dynamics</h3>
                        <h4 className="text-sm font-bold text-black whitespace-nowrap leading-tight mt-1" style={{ fontFamily: 'Outfit, sans-serif' }}>Resource & Capacity Management</h4>
                    </div>
                </div>
                
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                            Username
                        </label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-2 border text-gray-700 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            placeholder="Enter your username"
                            required
                        />
                    </div>
                    
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border text-gray-700 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            placeholder="Enter your password"
                            required
                        />
                    </div>
                    
                    <div className="text-right">
                        <Link
                            href="/forgot-password"
                            className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                            Forgot Password?
                        </Link>
                    </div>
                    
                    <div className="flex gap-3">
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition"
                        >
                            Sign In
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}