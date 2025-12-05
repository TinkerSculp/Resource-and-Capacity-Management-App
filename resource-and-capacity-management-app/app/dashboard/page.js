'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Universal styles
const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' }
};

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' or 'mine'
  const [counts, setCounts] = useState({
    active: 0,
    planned: 0,
    onHold: 0,
    backlog: 0
  });
  const [loading, setLoading] = useState(false);
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

  // Fetch assignment counts when filter changes
  useEffect(() => {
    if (user) {
      fetchCounts();
    }
  }, [filter, user]);

  const fetchCounts = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const endpoint = filter === 'mine' 
        ? `/api/assignments/counts/mine?empId=${user.emp_id}`
        : '/api/assignments/counts/all';
      
      const response = await fetch(`${apiUrl}${endpoint}`);
      const data = await response.json();
      
      if (response.ok) {
        setCounts(data);
      }
    } catch (error) {
      console.error('Error fetching counts:', error);
    } finally {
      setLoading(false);
    }
  };

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
                <h1 className="text-2xl font-bold text-white leading-tight" style={styles.outfitFont}>
                  Capstone Dynamics
                </h1>
              </div>
            </div>
            <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center">
              <h1 className="text-xl font-bold text-white leading-tight" style={styles.outfitFont}>
                Resource & Capacity
              </h1>
              <h2 className="text-xl font-bold text-white leading-tight" style={styles.outfitFont}>
                Management Planner
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-white font-semibold" style={styles.outfitFont}>{user.emp_name || user.account?.username || 'User'}</span>
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
                    {(user.emp_name || user.account?.username || 'U').charAt(0).toUpperCase()}
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
        <h2 className="text-2xl text-gray-900 mb-6" style={styles.outfitFont}>Welcome back, {user.emp_name || user.account?.username || 'User'}</h2>

        {/* filter switch */}
        <div className="mb-6">
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-2 border text-center cursor-pointer ${filter === 'all' ? 'bg-[#017ACB] text-white' : 'bg-white text-gray-600 border-gray-300'}`}
            style={styles.outfitFont}
          >
            All
          </button>
          <button 
            onClick={() => setFilter('mine')}
            className={`px-4 py-2 border text-center cursor-pointer ${filter === 'mine' ? 'bg-[#017ACB] text-white' : 'bg-white text-gray-600 border-gray-300'}`}
            style={styles.outfitFont}
          >
            Mine
          </button>
        </div>

        {/* count board */}
        <div className="grid grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition">
            <p className="text-gray-600 text-sm text-right" style={styles.outfitFont}>Active Initiatives</p>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>
              ✅ {loading ? '...' : counts.active}
            </h3>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition">
            <p className="text-gray-600 text-sm text-right" style={styles.outfitFont}>Planned Initiatives</p>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>
              📝 {loading ? '...' : counts.planned}
            </h3>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition">
            <p className="text-gray-600 text-sm text-right" style={styles.outfitFont}>Initiatives on Hold</p>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>
              ⏸️ {loading ? '...' : counts.onHold}
            </h3>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition">
            <p className="text-gray-600 text-sm text-right" style={styles.outfitFont}>Initiatives in Back Log</p>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>
              📋 {loading ? '...' : counts.backlog}
            </h3>
          </div>
        </div>

        {/* navigation */}
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border text-center border-gray-200 p-6 hover:shadow-md hover:border-gray-500 cursor-pointer transition">
            <img src="/capacitysummaryicon.png" alt="graph icon" className="mx-auto mb-4 h-12 w-12"/>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>Capacity Summary</h3>
          </div>

          <div className="bg-white rounded-lg shadow-sm border text-center border-gray-200 p-6 hover:shadow-md hover:border-gray-500 cursor-pointer transition">
            <img src="/resourcesicon.png" alt="graph icon" className="mx-auto mb-4 h-12 w-12"/>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>Resources</h3>
          </div>

          <div className="bg-white rounded-lg shadow-sm border text-center border-gray-200 p-6 hover:shadow-md hover:border-gray-500 cursor-pointer transition">
            <img src="/initiativesicon.png" alt="graph icon" className="mx-auto mb-4 h-12 w-12"/>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>Initiatives</h3>
          </div>

          <div className="bg-white rounded-lg shadow-sm border text-center border-gray-200 p-6 hover:shadow-md hover:border-gray-500 cursor-pointer transition">
            <img src="/assignmentsicon.png" alt="graph icon" className="mx-auto mb-4 h-12 w-12"/>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>Assignments</h3>
          </div>

          <div className="bg-white rounded-lg shadow-sm border text-center border-gray-200 p-6 hover:shadow-md hover:border-gray-500 cursor-pointer transition">
            <img src="/calendaricon.png" alt="graph icon" className="mx-auto mb-4 h-12 w-12"/>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>Calendar</h3>
          </div>

          <div className="bg-white rounded-lg shadow-sm border text-center border-gray-200 p-6 hover:shadow-md hover:border-gray-500 cursor-pointer transition">
            <img src="/reporticon.png" alt="graph icon" className="mx-auto mb-4 h-12 w-12"/>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>Report</h3>
          </div>
        </div>
      </main>
    </div>
  );
}
