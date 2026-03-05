/* =============================================================================
   page.jsx — /profile
   -----------------------------------------------------------------------------
   PURPOSE:
     Next.js route entry point for the Profile page. This is a lightweight
     wrapper that delegates all rendering, data fetching, and security logic
     to the ProfileCard layout component.

   WHY THIS EXISTS:
     Next.js App Router requires a page.jsx file at each route segment to
     register the route. Keeping this file minimal and delegating to a
     dedicated layout component means:
       • The component can be reused outside of this route if needed
       • Logic, security, and UI concerns live in one testable place
       • This file only ever needs to change if the route structure changes

   SECURITY MODEL:
     • All authentication, session validation, logout handling, and data
       fetching security is handled inside ProfileCard — see that file for
       full details.
     • This component intentionally contains no logic of its own.

   DEPENDENCIES:
     • ProfileCard — Layout component at @/components/layout/ProfileCard
   ============================================================================= */

'use client';

import ProfileCard from '@/components/layout/ProfileCard';

export default function ProfilePage() {
  // Delegates entirely to ProfileCard — no logic lives here
  return <ProfileCard />;
}