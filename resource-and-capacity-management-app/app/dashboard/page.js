'use client'; 
// Marks this component as a client-side component in Next.js

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Shared style object for consistent font usage
const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' }
};

export default function DashboardPage() {
  // Stores the logged-in user object
  const [user, setUser] = useState(null);

  // Next.js router for navigation
  const router = useRouter();

  useEffect(() => {
    // Retrieve stored user data from localStorage
    const userData = localStorage.getItem('user');

    // If no user is found, redirect to login page
    if (!userData) {
      router.push('/login');
      return;
    }

    // Parse and store the user object
    setUser(JSON.parse(userData));
  }, [router]);

  // Clears user session and redirects to home page
  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  // Show loading spinner while user data is being loaded
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <header className="bg-[#017ACB] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">

            {/* Logo + App Name */}
            <div className="flex items-center">
              <img src="/CapstoneDynamicsLogo.png" alt="Logo" className="h-12 w-auto" />
              <div className="flex flex-col ml-3">
                <h1 className="text-2xl font-bold text-white leading-tight" style={styles.outfitFont}>
                  Capstone Dynamics
                </h1>
              </div>
            </div>

            {/* Centered Title */}
            <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center">
              <h1 className="text-xl font-bold text-white leading-tight" style={styles.outfitFont}>
                Resource & Capacity
              </h1>
              <h2 className="text-xl font-bold text-white leading-tight" style={styles.outfitFont}>
                Management Planner
              </h2>
            </div>

            {/* Username + Profile Button */}
            <div className="flex items-center gap-4">

              {/* Display logged-in username */}
              <span className="text-white font-semibold" style={styles.outfitFont}>
                {user?.username || ''}
              </span>

              {/* Logout button styled as a profile circle */}
              <button
                onClick={handleLogout}
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden hover:opacity-90 transition cursor-pointer"
                title="Logout"
              >
                <span className="text-[#017ACB] font-bold text-lg">
                  {/* First letter of username, capitalized */}
                  {user?.username?.charAt(0)?.toUpperCase() || ''}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Welcome message */}
        <h2 className="text-2xl text-gray-900 mb-6" style={styles.outfitFont}>
          Welcome back, {user?.username || ''}
        </h2>

        {/* Filter buttons */}
        <div>
          <button className="p-1 w-15 border border-gray-300 text-center cursor-pointer text-gray-600" style={styles.outfitFont}>
            All
          </button>
          <button className="p-1 w-15 border border-gray-300 text-center cursor-pointer text-gray-600" style={styles.outfitFont}>
            Mine
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-6 mb-6">

          {/* Active Initiatives */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition">
            <p className="text-gray-600 text-sm text-right" style={styles.outfitFont}>Active Initiatives</p>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>✅ 2</h3>
          </div>

          {/* Planned Initiatives */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition">
            <p className="text-gray-600 text-sm text-right" style={styles.outfitFont}>Planned Initiatives</p>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>📝 0</h3>
          </div>

          {/* On Hold */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition">
            <p className="text-gray-600 text-sm text-right" style={styles.outfitFont}>Initiatives on Hold</p>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>⏸️ 0</h3>
          </div>

          {/* Backlog */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition">
            <p className="text-gray-600 text-sm text-right" style={styles.outfitFont}>Initiatives in Back Log</p>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>📆 1</h3>
          </div>
        </div>

        {/* Navigation tiles */}
        <div className="grid grid-cols-3 gap-6">

          {/* Capacity Summary */}
          <div className="bg-white rounded-lg shadow-sm border text-center border-gray-200 p-6 hover:shadow-md hover:border-gray-500 cursor-pointer transition">
            <div className="text-4xl mb-2 text-gray-700">place icon</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>Capacity Summary</h3>
          </div>

          {/* Resources */}
          <div className="bg-white rounded-lg shadow-sm border text-center border-gray-200 p-6 hover:shadow-md hover:border-gray-500 cursor-pointer transition">
            <div className="text-4xl mb-2 text-gray-700">place icon</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>Resources</h3>
          </div>

          {/* Initiatives */}
          <div className="bg-white rounded-lg shadow-sm border text-center border-gray-200 p-6 hover:shadow-md hover:border-gray-500 cursor-pointer transition">
            <div className="text-4xl mb-2 text-gray-700">place icon</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>Initiatives</h3>
          </div>

          {/* Assignments */}
          <div className="bg-white rounded-lg shadow-sm border text-center border-gray-200 p-6 hover:shadow-md hover:border-gray-500 cursor-pointer transition">
            <div className="text-4xl mb-2 text-gray-700">place icon</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>Assignments</h3>
          </div>

          {/* Calendar */}
          <div className="bg-white rounded-lg shadow-sm border text-center border-gray-200 p-6 hover:shadow-md hover:border-gray-500 cursor-pointer transition">
            <div className="text-4xl mb-2 text-gray-700">place icon</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>Calendar</h3>
          </div>

          {/* Report */}
          <div className="bg-white rounded-lg shadow-sm border text-center border-gray-200 p-6 hover:shadow-md hover:border-gray-500 cursor-pointer transition">
            <div className="text-4xl mb-2 text-gray-700">place icon</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>Report</h3>
          </div>
        </div>
      </main>
    </div>
  );
}
