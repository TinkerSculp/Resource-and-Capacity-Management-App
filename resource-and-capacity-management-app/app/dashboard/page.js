'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userData));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#017ACB] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img src="/CapstoneDynamicsLogo.png" alt="Logo" className="h-12 w-auto" />
              <div className="flex flex-col ml-3">
                <h1 className="text-2xl font-bold text-white leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Capstone Dynamics
                </h1>
              </div>
            </div>
            <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center">
              <h1 className="text-xl font-bold text-white leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Resource & Capacity
              </h1>
              <h2 className="text-xl font-bold text-white leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Management Planner
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-white font-semibold">{user.firstName} {user.lastName}</span>
              <button
                onClick={handleLogout}
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden hover:opacity-90 transition cursor-pointer"
                title="Logout"
              >
                {user.profileImage ? (
                  <img 
                    src={user.profileImage} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[#017ACB] font-bold text-lg">
                    {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Message */}
        <h2 className="text-2xl text-gray-900 mb-6">Welcome back, {user.firstName} {user.lastName}</h2>

        {/* filter switch */}
        <div>
          <button>All</button>
          <button>Mine</button>
        </div>

        {/* First Row - 4 Cards */}
        <div className="grid grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Card 1</h3>
            <p className="text-gray-600 text-sm">Description for card 1</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Card 2</h3>
            <p className="text-gray-600 text-sm">Description for card 2</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Card 3</h3>
            <p className="text-gray-600 text-sm">Description for card 3</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Card 4</h3>
            <p className="text-gray-600 text-sm">Description for card 4</p>
          </div>
        </div>

        {/* Second Row - 6 Cards (3 per line) */}
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Card 5</h3>
            <p className="text-gray-600 text-sm">Description for card 5</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Card 6</h3>
            <p className="text-gray-600 text-sm">Description for card 6</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Card 7</h3>
            <p className="text-gray-600 text-sm">Description for card 7</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Card 8</h3>
            <p className="text-gray-600 text-sm">Description for card 8</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Card 9</h3>
            <p className="text-gray-600 text-sm">Description for card 9</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Card 10</h3>
            <p className="text-gray-600 text-sm">Description for card 10</p>
          </div>
        </div>
      </main>
    </div>
  );
}
