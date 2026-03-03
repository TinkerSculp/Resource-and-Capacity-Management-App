'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' }
};

export default function ProfileCard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const router = useRouter();

  /* ---------------------------------------------------------
     SECURITY: LOAD USER + SAFE PROFILE FETCH
     ---------------------------------------------------------
     • Validates localStorage session before making API calls
     • Protects against malformed JSON in localStorage
     • Sanitizes username before sending to backend
     • Uses try/catch to prevent UI crashes on bad responses
  --------------------------------------------------------- */
  useEffect(() => {
    let parsedUser = null;

    try {
      const stored = localStorage.getItem('user');
      if (!stored) return;

      parsedUser = JSON.parse(stored);

      // Defensive: ensure required fields exist
      if (!parsedUser?.username) {
        console.warn('Invalid user object — forcing logout');
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }
    } catch (err) {
      console.error('LocalStorage parse error:', err);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      router.push('/login');
      return;
    }

    async function loadProfile() {
      try {
        setUser(parsedUser);

        // Encode username to prevent injection or malformed URLs
        const safeUsername = encodeURIComponent(parsedUser.username);

        const res = await api.get(`/profile?username=${safeUsername}`);

        // Defensive: ensure backend returned expected structure
        if (!res?.data) {
          console.warn('Profile response missing data');
          return;
        }

        setProfile(res.data);
      } catch (err) {
        console.error('Profile fetch error:', err);

        // Optional: auto‑logout on 401/403
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          router.push('/login');
        }
      }
    }

    loadProfile();
  }, [router]);

  /* ---------------------------------------------------------
     SECURITY: LOGOUT HANDLER
     ---------------------------------------------------------
     • Clears all auth data from localStorage
     • Removes Axios Authorization header
     • Redirects user to login screen
  --------------------------------------------------------- */
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    delete api.defaults.headers.common['Authorization'];

    router.push('/login');
  };

  /* ---------------------------------------------------------
     LOADING STATE
     ---------------------------------------------------------
     • Prevents UI flash while validating session
     • Ensures profile is fully loaded before rendering
  --------------------------------------------------------- */
  if (!user || !profile) {
    return (
      <div className="min-h-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  /* ---------------------------------------------------------
     FINAL RENDER
     ---------------------------------------------------------
     • Displays validated user profile
     • Uses clean, accessible layout
  --------------------------------------------------------- */
  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-xl shadow-md border border-gray-200 p-10">

      {/* Back Button + Title */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => router.back()}
          className="text-3xl text-[#017ACB]  hover:text-[#017ACB]/20 transition"
          style={styles.outfitFont}
        >
          ❮
        </button>

        <h2
          className="text-3xl font-bold text-[#017ACB]"
          style={styles.outfitFont}
        >
          Profile
        </h2>
      </div>

      {/* Profile Details */}
      <div
        className="space-y-5 text-gray-700 text-[clamp(1rem,1.1vw,1.2rem)]"
        style={styles.outfitFont}
      >
        <div><strong>Name:</strong> {profile.name}</div>
        <div><strong>Title:</strong> {profile.title}</div>
        <div><strong>Department:</strong> {profile.department}</div>
        <div><strong>Role:</strong> {profile.role}</div>
        <div><strong>ID:</strong> {profile.id}</div>
      </div>

      {/* Logout */}
      <div className="flex justify-end mt-10">
        <button
          onClick={handleLogout}
          className="px-5 py-3 bg-[#017ACB] text-white rounded
              hover:bg-[#017ACB]/20 hover:text-gray-700 transition
              shadow-[inset_2px_2px_0_rgba(255,255,255,1),inset_-2px_-2px_0_rgba(0,0,0,0.32)]
              focus:outline-none focus:ring-0"
        >
          Log Out
        </button>
      </div>

    </div>
  );
}