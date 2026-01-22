'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/* ---------------------------------------------------------
   CENTRALIZED STYLE OBJECT
   - Ensures consistent typography across components
--------------------------------------------------------- */
const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' }
};

/* ---------------------------------------------------------
   VIEW PROFILE PAGE
   - Loads logged‑in user from localStorage
   - Fetches full profile details from backend API
   - Displays profile card with name, title, department, role
   - Includes logout functionality
--------------------------------------------------------- */
export default function ViewProfilePage() {

  /* ---------------------------------------------------------
     LOCAL STATE
     - user: parsed user object from localStorage
     - profile: full profile data returned from backend
  --------------------------------------------------------- */
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const router = useRouter();

  /* ---------------------------------------------------------
     INITIAL LOAD EFFECT
     ---------------------------------------------------------
     1. Retrieve logged‑in user from localStorage
        - If missing → redirect to login page
        - Otherwise → parse stored user object

     2. Fetch profile data from backend API
        - Uses username from stored user
        - Backend returns: name, title, department, role, id
        - Stores both user + profile in state
  --------------------------------------------------------- */
  useEffect(() => {
    const userData = localStorage.getItem('user');

    if (!userData) {
      router.push('/Profile/login');
      return;
    }

    const parsedUser = JSON.parse(userData);

    fetch(`/api/Resource-Manager/profile?username=${parsedUser.username}`)
      .then(res => res.json())
      .then(data => {
        setUser(parsedUser);
        setProfile(data);
      })
      .catch(err => {
        console.error("Profile fetch error:", err);
      });
  }, [router]);

  /* ---------------------------------------------------------
     LOGOUT HANDLER
     - Removes user from localStorage
     - Redirects to home page
  --------------------------------------------------------- */
  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  /* ---------------------------------------------------------
     LOADING STATE
     - Displays centered spinner while data loads
  --------------------------------------------------------- */
  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  /* ---------------------------------------------------------
     MAIN RENDER
     - Displays header, profile card, and logout button
     - Uses Tailwind for layout and styling
  --------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-gray-50">

      {/* -----------------------------------------------------
          HEADER SECTION
          - Logo + App Name (clickable → dashboard)
          - Centered title
          - Username + profile initial
      ----------------------------------------------------- */}
      <header className="bg-[#017ACB] shadow-sm w-full relative">
        <div className="px-4 sm:px-6 lg:px-8 w-full">

          <div className="relative flex items-center h-[clamp(4.5rem,5vw,5.5rem)] w-full">

            {/* Logo + App Name */}
            <div
              className="flex items-center flex-none cursor-pointer"
              onClick={() => router.push('/Resource-Manager/dashboard')}
            >
              <img
                src="/CapstoneDynamicsLogo.png"
                alt="Logo"
                className="w-auto h-[clamp(3.2rem,3.8vw,4rem)]"
              />

              <h1
                className="font-bold text-white leading-tight ml-4 text-[clamp(1.6rem,1.7vw,2rem)]"
                style={styles.outfitFont}
              >
                Capstone Dynamics
              </h1>
            </div>

            {/* Centered Title */}
            <div className="absolute left-1/2 -translate-x-1/2 text-center">
              <h1
                className="font-bold text-white leading-tight text-[clamp(1.2rem,1.3vw,1.6rem)]"
                style={styles.outfitFont}
              >
                Resource & Capacity Management Planner
              </h1>
            </div>

            {/* Username + Profile Initial */}
            <div className="flex items-center gap-4 ml-auto flex-none">
              <span
                className="text-white font-semibold text-[clamp(1rem,1.15vw,1.25rem)]"
                style={styles.outfitFont}
              >
                {user.username}
              </span>

              <div
                className="rounded-full bg-white flex items-center justify-center overflow-hidden
                           w-[clamp(2.4rem,2.8vw,3.0rem)] h-[clamp(2.4rem,2.8vw,3.0rem)]"
              >
                <span className="text-[#017ACB] font-bold text-[clamp(1.1rem,1.3vw,1.5rem)]">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* -----------------------------------------------------
          MAIN CONTENT SECTION
          - Profile card with user details
          - Back button + logout button
      ----------------------------------------------------- */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-10">

          {/* Back Button + Title */}
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={() => router.push('/Resource-Manager/dashboard')}
              className="text-3xl text-gray-600 hover:text-gray-800 transition"
              style={styles.outfitFont}
            >
              ❮
            </button>

            <h2 className="text-3xl font-bold text-[#017ACB]" style={styles.outfitFont}>
              Profile Card
            </h2>
          </div>

          {/* Profile Information */}
          <div className="space-y-5 text-gray-700 text-[clamp(1rem,1.1vw,1.2rem)]" style={styles.outfitFont}>
            <div><strong>Name:</strong> {profile.name}</div>
            <div><strong>Title:</strong> {profile.title}</div>
            <div><strong>Department:</strong> {profile.department}</div>
            <div><strong>Role:</strong> {profile.role}</div>
            <div><strong>ID:</strong> {profile.id}</div>
          </div>

          {/* Logout Button */}
          <div className="flex justify-end mt-10">
            <button
              onClick={handleLogout}
              className="px-5 py-3 bg-[#017ACB] text-white rounded-lg hover:bg-blue-700 transition text-[clamp(1rem,1vw,1.1rem)]"
            >
              Log Out
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}