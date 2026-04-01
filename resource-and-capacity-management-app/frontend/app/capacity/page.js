/* =============================================================================
   page.jsx — /capacity-summary
   -----------------------------------------------------------------------------
   PURPOSE:
     Next.js route entry point for the Capacity Summary page. Lightweight wrapper
     that delegates all rendering, data fetching, and security logic to the
     CapacitySummary layout component.

   WHY THIS EXISTS:
     Next.js App Router requires a page.jsx at each route segment to register
     the route. Keeping this file minimal and delegating to a dedicated layout
     component means:
       • The component can be reused outside this route if needed
       • Logic, security, and UI concerns live in one testable place
       • This file only changes if the route structure changes

   SECURITY MODEL:
     All authentication, session validation, and data fetching security is
     handled inside CapacitySummary — see that file for full details.
     This component intentionally contains no logic of its own.

   DEPENDENCIES:
     • CapacitySummary — @/components/layout/CapacitySummary
   ============================================================================= */

'use client';

import CapacitySummary from '@/components/layout/CapacitySummary';

export default function CapacityPage() {
  // Delegates entirely to CapacitySummary — no logic lives here
  return <CapacitySummary />;
}