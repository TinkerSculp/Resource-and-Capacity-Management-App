/* =============================================================================
   page.js  (src/app/page.js)
   -----------------------------------------------------------------------------
   PURPOSE:
     Root route handler for the "/" path. Immediately redirects to /login so
     users never land on a blank or unprotected root page. This runs as a
     Next.js Server Component — no client-side JavaScript is needed.

   WHY A SERVER-SIDE REDIRECT:
     Using Next.js redirect() from the server means the redirect happens
     before any HTML is sent to the browser — the user never sees a blank
     page or flash of unprotected content. This is more secure and faster
     than a client-side redirect (e.g. useRouter().push()) which requires
     JavaScript to load first.

   WHY NOT A next.config.js REDIRECT:
     A config-level redirect would also work, but keeping it here makes it
     explicit and visible in the route file where developers expect routing
     logic to live. It's also easier to change or add logic (e.g. redirect
     to /dashboard if already authenticated) without touching the config file.
   ============================================================================= */

import { redirect } from "next/navigation";

/* =============================================================================
   COMPONENT: Home
   -----------------------------------------------------------------------------
   Server Component — runs on the server at request time. No client-side
   state (localStorage, cookies, React hooks) is accessible here.

   redirect() throws a special Next.js exception that tells the framework
   to send a 307 Temporary Redirect response — no return value is needed
   because execution stops at the redirect() call.
   ============================================================================= */
export default function Home() {
  // Redirect immediately to the login page — no content is rendered
  redirect("/login");
}
