'use client';

import { useLayoutEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' }
};

export default function Header() {
  /* ---------------------------------------------------------
     SECURITY: SAFE USER INITIALIZATION
     ---------------------------------------------------------
     • Reads user from localStorage only on client
     • Defensive JSON parsing to avoid crashes
  --------------------------------------------------------- */
  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
      } catch (err) {
        console.error('LocalStorage parse error:', err);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        return null;
      }
    }
    return null;
  });

  /* ---------------------------------------------------------
     HYDRATION CONTROL
     ---------------------------------------------------------
     • Prevents hydration mismatch
     • Ensures header renders only on client
  --------------------------------------------------------- */
  const [hydrated, setHydrated] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  useLayoutEffect(() => {
    startTransition(() => setHydrated(true));
  }, []);

  if (!hydrated) return null;

  /* ---------------------------------------------------------
     FINAL RENDER — STICKY HEADER
     ---------------------------------------------------------
     • Stays at the top while scrolling
     • Does NOT overlap content
     • Does NOT require padding adjustments
     • Does NOT move the screen
  --------------------------------------------------------- */
  return (
    <header
      className="
        bg-[#017ACB]
        shadow-sm
        w-full
        sticky top-0
        z-40
      "
    >
      <div className="px-4 sm:px-6 lg:px-8 w-full">
        <div className="relative flex items-center h-[clamp(4.5rem,5vw,5.5rem)] w-full">

          {/* LOGO + COMPANY NAME */}
          <div className="flex items-center flex-none cursor-pointer">
            <Image
              src="/CapstoneDynamicsLogoWhite.png"
              alt="Logo"
              width={92}
              height={92}
              className="w-auto h-[clamp(4.6rem,5.0vw,5.6rem)]"
            />

            <h1
              className="font-bold text-white leading-tight ml-4 text-[clamp(1.6rem,1.7vw,2rem)]"
              style={styles.outfitFont}
            >
              Capstone Dynamics
            </h1>
          </div>

          {/* CENTERED APP TITLE */}
          <div className="absolute left-1/2 -translate-x-1/2 text-center">
            <h1
              className="font-bold text-white leading-tight text-[clamp(1.2rem,1.3vw,1.6rem)]"
              style={styles.outfitFont}
            >
              Resource & Capacity Management Planner
            </h1>
          </div>

          {/* USER PROFILE BUBBLE */}
          {user && (
            <div className="flex items-center gap-4 ml-auto flex-none">
              <span
                className="font-semibold text-white text-[clamp(1rem,1.15vw,1.25rem)]"
                style={styles.outfitFont}
              >
                {user.username}
              </span>

              <div
                onClick={() => router.push('/profile')}
                className="
                  rounded-full bg-white flex items-center justify-center
                  cursor-pointer hover:bg-[#CCE4F4] hover:shadow-[0_0_6px_#017ACB]
                  w-[clamp(2.4rem,2.8vw,3rem)]
                  h-[clamp(2.4rem,2.8vw,3rem)]
                  transition
                "
              >
                <span className="text-[#017ACB] font-bold text-[clamp(1.1rem,1.3vw,1.5rem)]">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          )}

        </div>
      </div>
    </header>
  );
}