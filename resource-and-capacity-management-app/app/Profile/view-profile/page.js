'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Centralized style object for consistent typography
const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' }
};

export default function ViewProfilePage() {
  // Stores the logged‑in user (from localStorage)
  const [user, setUser] = useState(null);

  // Stores the profile data returned from the backend
  const [profile, setProfile] = useState(null);

  const router = useRouter();

  useEffect(() => {
    /**
     * ---------------------------------------------------------
     * 1. Retrieve logged‑in user from localStorage
     * ---------------------------------------------------------
     * - If no user is found, redirect to login page
     * - Otherwise, parse the stored user object
     */
    const userData = localStorage.getItem('user');

    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);

    /**
     * ---------------------------------------------------------
     * 2. Fetch profile data from backend API
     * ---------------------------------------------------------
     * - Uses the username stored in localStorage
     * - Backend returns name, title, department, role, id
     * - Stores both user and profile in state
     */
    fetch(`/api/profile?username=${parsedUser.username}`)
      .then(res => res.json())
      .then(data => {
        setUser(parsedUser);
        setProfile(data);
      })
      .catch(err => {
        console.error("Profile fetch error:", err);
      });
  }, [router]);

  /**
   * ---------------------------------------------------------
   * Logs the user out by:
   * - Removing user data from localStorage
   * - Redirecting to the home page
   * ---------------------------------------------------------
   */
  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  /**
   * ---------------------------------------------------------
   * Loading State
   * ---------------------------------------------------------
   * - While user or profile data is still loading,
   *   show a centered spinner
   * ---------------------------------------------------------
   */
  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  /**
   * ---------------------------------------------------------
   * Main Render
   * ---------------------------------------------------------
   * - Displays the header, profile card, and logout button
   * - Uses Tailwind for layout and styling
   * ---------------------------------------------------------
   */
  return (
    <div className="min-h-screen bg-gray-50">

      {/* -----------------------------------------------------
          Header Section
         ----------------------------------------------------- */}
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

            {/* Username + Profile Initial */}
            <div className="flex items-center gap-4">
              <span className="text-white font-semibold" style={styles.outfitFont}>
                {user.username}
              </span>

              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden">
                <span className="text-[#017ACB] font-bold text-lg">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* -----------------------------------------------------
          Main Content Section
         ----------------------------------------------------- */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8">

          {/* Back Button + Title */}
          <div className="flex items-center gap-3 mb-6">
           <button
  onClick={() => router.push('/dashboard')}
  className="text-2xl text-gray-600 hover:text-gray-800 transition"
  style={styles.outfitFont}
>
  ❮
</button>

            <h2 className="text-2xl font-bold text-[#017ACB]" style={styles.outfitFont}>
              Profile Card
            </h2>
          </div>

          {/* Profile Information */}
          <div className="space-y-4 text-gray-700" style={styles.outfitFont}>
            <div><strong>Name:</strong> {profile.name}</div>
            <div><strong>Title:</strong> {profile.title}</div>
            <div><strong>Department:</strong> {profile.department}</div>
            <div><strong>Role:</strong> {profile.role}</div>
            <div><strong>ID:</strong> {profile.id}</div>
          </div>

          {/* Logout Button */}
          <div className="flex justify-end mt-8">
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-[#017ACB] text-white rounded-lg hover:bg-blue-700 transition"
            >
              Log Out
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}