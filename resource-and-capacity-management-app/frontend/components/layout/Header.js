'use client';

/* =============================================================================
   Header.jsx
   -----------------------------------------------------------------------------
   PURPOSE:
     Global sticky header rendered on every page of the application.
     Displays the company logo, app title, and the authenticated user's
     profile bubble. Provides navigation to the profile page.
     Also enforces a 30-minute inactivity session timeout — if the user is
     idle for 30 minutes, a modal is shown warning them the session expired.
     They must click "Back to Login" to be redirected.
     Includes an AI chatbot button that opens a chat panel powered by
     Llama 3.1 via Hugging Face — proxied through the backend so the
     API key is never exposed in the browser.

   DARK MODE:
     The AI chatbot panel fully supports dark mode via Tailwind dark: variants.
     All chat UI elements — panel background, header, messages, input, send
     button — adapt to the system colour scheme automatically.

   SECURITY MODEL:
     • User object is read from localStorage using a safe initialiser function
       that runs only on the client — prevents SSR crashes and hydration mismatches.
     • Wrapped in try/catch: malformed or tampered JSON is caught gracefully,
       storage is cleared, and the component renders without a user rather than
       crashing the entire app.
     • Both 'user' and 'token' are cleared together on any parse failure,
       ensuring no partial/broken session data lingers in storage.
     • No sensitive data (passwords, raw tokens) is ever rendered in the UI —
       only the username initial and display name are shown.
     • Session timeout uses Date.now() timestamps — not user-controllable input.
       All localStorage is cleared on timeout to remove auth data completely.
     • Redirect only happens after the user explicitly clicks "Back to Login" —
       uses a hardcoded path, no user-controlled redirect targets.
     • AI chat messages are sent to the backend proxy (/api/ai/chat) via the
       shared Axios instance — the HF API key never touches the browser.

   HYDRATION STRATEGY:
     • useLayoutEffect + useTransition delays rendering until the client has
       hydrated, preventing a React hydration mismatch between server-rendered
       HTML (no user) and client HTML (user from localStorage).
     • Returns null until hydrated — avoids a flash of incorrect UI.

   SESSION TIMEOUT:
     • TIMEOUT_MS    = 30 * 60 * 1000 — times out after 30 minutes of inactivity
     • CHECK_EVERY_MS = 60 * 1000     — checks once every minute
     • Any mouse, keyboard, touch, or scroll activity resets the timer.
     • On expiry: localStorage is cleared and a modal is shown. The user
       must click "Back to Login" before being redirected to /login.

   DEPENDENCIES:
     • Next.js Image   — Optimised image rendering for the company logo
     • Next.js router  — Used for profile page navigation + login redirect
     • @/lib/api       — Shared Axios instance with JWT Bearer token auto-injection
   ============================================================================= */

import { useLayoutEffect, useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import api from '@/lib/api';

const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' }
};

const TIMEOUT_MS      = 30 * 60 * 1000;
const CHECK_EVERY_MS  = 60 * 1000;
const LAST_ACTIVE_KEY = 'lastActive';
const LOGIN_PATH      = '/login';

export default function Header() {

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

  const [hydrated, setHydrated]           = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [chatOpen, setChatOpen]           = useState(false);
  const [messages, setMessages]           = useState([
    { role: 'assistant', content: "Hi! I'm your Resource & Capacity Management assistant. Ask me anything about using this app — managing resources, allocations, initiatives, reports, or accounts." }
  ]);
  const [chatInput, setChatInput]         = useState('');
  const [chatLoading, setChatLoading]     = useState(false);
  const chatEndRef                        = useRef(null);

  const [, startTransition] = useTransition();
  const router = useRouter();

  useLayoutEffect(() => {
    startTransition(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const resetTimer = () => localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
    resetTimer();
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    const interval = setInterval(() => {
      const lastActive = parseInt(localStorage.getItem(LAST_ACTIVE_KEY) || '0', 10);
      if (Date.now() - lastActive >= TIMEOUT_MS) {
        localStorage.clear();
        setSessionExpired(true);
        clearInterval(interval);
      }
    }, CHECK_EVERY_MS);
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      clearInterval(interval);
    };
  }, [router]);

  const sendMessage = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await api.post('/ai/chat', {
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
      });
      const reply = res.data?.reply || "Sorry, I couldn't get a response. Please try again.";
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      const errMsg = err?.response?.data?.error
        || (err?.message?.includes('Network')
          ? 'Could not reach the server. Make sure your backend is running.'
          : 'Something went wrong. Please try again.');
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  if (!hydrated) return null;

  return (
    <>
      {/* SESSION EXPIRED MODAL */}
      {sessionExpired && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999] px-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="session-expired-title"
          aria-describedby="session-expired-desc"
        >
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-sm p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-[#FEE2E2] dark:bg-red-900/40 flex items-center justify-center">
                <svg className="w-7 h-7 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
            </div>
            <h2 id="session-expired-title" className="text-xl font-bold text-black dark:text-white mb-2" style={styles.outfitFont}>
              Session Expired
            </h2>
            <p id="session-expired-desc" className="text-sm text-gray-600 dark:text-slate-300 mb-6" style={styles.outfitFont}>
              Your session has timed out due to 30 minutes of inactivity. Please log in again to continue.
            </p>
            <button
              onClick={() => router.push(LOGIN_PATH)}
              className="w-full px-4 py-2 rounded text-sm bg-[#017ACB] text-white border border-black/50 hover:bg-[#017ACB]/20 hover:text-gray-700 transition shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)] active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)] relative before:content-[''] before:absolute before:inset-0 before:rounded before:pointer-events-none before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]"
              style={styles.outfitFont}
            >
              Back to Login
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-[#017ACB] shadow-sm w-full sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8 w-full">
          <div
            className="grid items-center gap-x-3 h-[clamp(4rem,5vw,5.5rem)]"
            style={{ gridTemplateColumns: '1fr auto 1fr' }}
          >
            {/* LEFT — Logo + company name */}
            <div className="flex items-center gap-2 sm:gap-3 justify-start">
              <Image
                src="/CapstoneDynamicsLogoWhite.png"
                alt="Capstone Dynamics logo"
                width={92}
                height={92}
                className="w-auto h-[clamp(3rem,4.5vw,5.2rem)] flex-shrink-0"
                priority
              />
              <h1
                className="hidden lg:block font-bold text-white leading-tight text-[clamp(1rem,1.4vw,1.75rem)] whitespace-nowrap"
                style={styles.outfitFont}
              >
                Capstone Dynamics
              </h1>
            </div>

            {/* CENTER — App title */}
            <div className="text-center">
              <h1
                className="font-bold text-white leading-snug text-[clamp(0.8rem,1.6vw,1.6rem)]"
                style={{ ...styles.outfitFont, maxWidth: '34rem', textAlign: 'center' }}
              >
                Resource &amp; Capacity Management Planner
              </h1>
            </div>

            {/* RIGHT — Username + AI chat button + avatar */}
            <div className="flex items-center gap-2 sm:gap-4 justify-end">
              {user && (
                <>
                  <span
                    className="hidden sm:block font-semibold text-white text-[clamp(0.8rem,1.1vw,1.3rem)] whitespace-nowrap"
                    style={styles.outfitFont}
                  >
                    {user.username}
                  </span>

                  {/* AI Chat button */}
                  <button
                    onClick={() => setChatOpen(o => !o)}
                    aria-label="Open AI assistant"
                    title="Ask the AI assistant"
                    className="rounded-full bg-white flex items-center justify-center flex-shrink-0 cursor-pointer transition hover:bg-[#CCE4F4] hover:shadow-[0_0_6px_#017ACB] active:scale-95 touch-manipulation w-[clamp(2rem,2.6vw,3rem)] h-[clamp(2rem,2.6vw,3rem)]"
                  >
                    <svg className="w-[55%] h-[55%] text-[#017ACB]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.849L3 20l1.18-3.54A7.956 7.956 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </button>

                  {/* Avatar bubble */}
                  <div
                    onClick={() => router.push('/profile')}
                    role="button"
                    aria-label={`View profile for ${user.username}`}
                    className="rounded-full bg-white flex items-center justify-center flex-shrink-0 cursor-pointer transition hover:bg-[#CCE4F4] hover:shadow-[0_0_6px_#017ACB] w-[clamp(2rem,2.6vw,3rem)] h-[clamp(2rem,2.6vw,3rem)]"
                  >
                    <span className="text-[#017ACB] font-bold text-[clamp(0.9rem,1.2vw,1.4rem)]" aria-hidden="true">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ===================================================================
          AI CHATBOT PANEL — dark mode fully supported
          Mobile: full-width sheet from bottom (70vh)
          Desktop (sm+): fixed bottom-right panel (360×520px)
      =================================================================== */}
      {chatOpen && (
        <div
          className="
            fixed z-[99998] flex flex-col
            bg-white dark:bg-slate-900
            shadow-2xl dark:shadow-[0_8px_40px_rgba(0,0,0,0.6)]
            border border-gray-200 dark:border-slate-700
            overflow-hidden
            bottom-0 right-0 left-0 rounded-t-xl
            sm:bottom-4 sm:right-4 sm:left-auto sm:rounded-xl
            w-full sm:w-[360px]
            h-[70vh] sm:h-[520px]
          "
          style={styles.outfitFont}
        >
          {/* Chat header */}
          <div className="bg-[#017ACB] dark:bg-[#005a96] px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.849L3 20l1.18-3.54A7.956 7.956 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">App Assistant</p>
                <p className="text-white/70 text-xs">Powered by Llama 3.1</p>
              </div>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="text-white/80 hover:text-white transition touch-manipulation"
              aria-label="Close chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 bg-gray-50 dark:bg-slate-800">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#017ACB] dark:bg-[#005a96] text-white rounded-br-sm'
                      : 'bg-white dark:bg-slate-700 text-black dark:text-slate-100 border border-gray-200 dark:border-slate-600 rounded-bl-sm shadow-sm dark:shadow-none'
                  }`}
                  style={styles.outfitFont}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl rounded-bl-sm px-4 py-2 shadow-sm dark:shadow-none flex gap-1 items-center">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 bg-[#017ACB] dark:bg-[#4DAEFF] rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input area */}
          <div className="px-3 py-3 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex gap-2 flex-shrink-0">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask a question..."
              className="
                flex-1 px-3 py-3 sm:py-2 text-sm rounded-lg
                border border-gray-300 dark:border-slate-600
                bg-gray-50 dark:bg-slate-800
                text-black dark:text-slate-100
                placeholder:text-gray-400 dark:placeholder:text-slate-400
                hover:bg-[#017ACB]/10 dark:hover:bg-[#017ACB]/20
                focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-slate-400
                focus:border-black dark:focus:border-slate-400
                transition
              "
              style={styles.outfitFont}
              disabled={chatLoading}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="sentences"
              inputMode="text"
            />
            <button
              onClick={sendMessage}
              disabled={chatLoading || !chatInput.trim()}
              className="
                px-3 py-2 rounded-lg text-sm flex-shrink-0
                bg-[#017ACB] dark:bg-[#005a96] text-white
                border border-black/50 dark:border-slate-500
                hover:bg-[#017ACB]/80 dark:hover:bg-[#017ACB]/70 transition
                shadow-[4px_4px_10px_rgba(0,0,0,0.25),-4px_-4px_10px_rgba(255,255,255,0.4)]
                dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5)]
                active:shadow-[2px_2px_6px_rgba(0,0,0,0.25),-2px_-2px_6px_rgba(255,255,255,0.4)]
                dark:active:shadow-[2px_2px_6px_rgba(0,0,0,0.5)]
                relative before:content-[''] before:absolute before:inset-0 before:rounded-lg
                before:pointer-events-none
                before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-1px_2px_rgba(0,0,0,0.15)]
                dark:before:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.45)]
                disabled:opacity-40 disabled:cursor-not-allowed
                touch-manipulation
              "
              aria-label="Send message"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}