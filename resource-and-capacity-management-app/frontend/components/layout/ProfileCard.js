'use client';

/* =============================================================================
   ProfileCard.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Displays the authenticated user's profile information including name,
     title, department, role, and employee ID. Handles session validation,
     profile data fetching, logout, and loading state.
   ============================================================================= */

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

const styles = { outfitFont: { fontFamily: 'Outfit, sans-serif' } };

export default function ProfileCard() {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const router                = useRouter();

  useEffect(() => {
    let parsedUser = null;
    try {
      const stored = localStorage.getItem('user');
      if (!stored) return;
      parsedUser = JSON.parse(stored);
      if (!parsedUser?.username) {
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
        const safeUsername = encodeURIComponent(parsedUser.username);
        const res          = await api.get(`/profile?username=${safeUsername}`);
        if (!res?.data) { console.warn('Profile response returned no data'); return; }
        setProfile(res.data);
      } catch (err) {
        console.error('Profile fetch error:', err);
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          router.push('/login');
        }
      }
    }

    loadProfile();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
    router.push('/login');
  };

  if (!user || !profile) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#017ACB]" role="status" aria-label="Loading profile" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-xl shadow-md dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] border border-gray-200 dark:border-slate-700 p-6 sm:p-10">

      {/* HEADER */}
      <div className="flex items-center gap-3 mb-6 sm:mb-8 flex-wrap">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="text-3xl text-[#017ACB] dark:text-[#4DAEFF] hover:text-[#017ACB]/50 dark:hover:text-[#4DAEFF]/60 transition"
          style={styles.outfitFont}
        >
          ❮
        </button>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#017ACB] dark:text-[#4DAEFF]" style={styles.outfitFont}>
          Profile
        </h2>
      </div>

      {/* PROFILE FIELDS */}
      <div className="space-y-4 sm:space-y-5 text-gray-700 dark:text-slate-200 text-[clamp(1rem,1.1vw,1.2rem)]" style={styles.outfitFont}>
        <div className="border-b border-gray-100 dark:border-slate-700 pb-3">
          <span className="font-semibold text-gray-900 dark:text-slate-100">Name: </span>{profile.name}
        </div>
        <div className="border-b border-gray-100 dark:border-slate-700 pb-3">
          <span className="font-semibold text-gray-900 dark:text-slate-100">Title: </span>{profile.title}
        </div>
        <div className="border-b border-gray-100 dark:border-slate-700 pb-3">
          <span className="font-semibold text-gray-900 dark:text-slate-100">Department: </span>{profile.department}
        </div>
        <div className="border-b border-gray-100 dark:border-slate-700 pb-3">
          <span className="font-semibold text-gray-900 dark:text-slate-100">Role: </span>{profile.role}
        </div>
        <div>
          <span className="font-semibold text-gray-900 dark:text-slate-100">ID: </span>{profile.id}
        </div>
      </div>

      {/* LOGOUT BUTTON */}
      <div className="flex justify-end mt-8 sm:mt-10">
        <button
          onClick={handleLogout}
          aria-label="Log out of your account"
          className="
            px-5 py-2 text-sm sm:px-8 sm:py-3 sm:text-lg
            bg-[#017ACB] dark:bg-[#005a96] text-white rounded
            hover:bg-[#017ACB]/20 dark:hover:bg-[#017ACB]/30 hover:text-gray-700 dark:hover:text-slate-100
            transition border border-black/50 dark:border-slate-500
            shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
            dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5)]
            active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
            dark:active:shadow-[2px_2px_6px_rgba(0,0,0,0.5)]
            relative before:content-[''] before:absolute before:inset-0 before:rounded
            before:pointer-events-none
            before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
            dark:before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.45)]
          "
          style={styles.outfitFont}
        >
          Log Out
        </button>
      </div>
    </div>
  );
}