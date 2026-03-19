'use client';

import { Geist, Geist_Mono, Outfit } from "next/font/google";
import "../styles/globals.css";

import HeaderWrapper from "@/components/layout/HeaderWrapper";

/* ---------------------------------------------------------
   FONT CONFIGURATION
   ---------------------------------------------------------
   • Loads project-wide font families using Next.js font loader
   • Exposes each font as a CSS variable for consistent usage
   • Ensures fonts are preloaded and optimized for performance
--------------------------------------------------------- */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`
          ${geistSans.variable}
          ${geistMono.variable}
          ${outfit.variable}
          antialiased bg-background text-foreground
        `}
      >

        {/* -----------------------------------------------------
           GLOBAL HEADER WRAPPER
           -----------------------------------------------------
           • Renders the authenticated header across all pages
           • Automatically hides on routes where header is disabled
           • Centralizes navigation and user session UI
        ----------------------------------------------------- */}
        <HeaderWrapper />

        {/* -----------------------------------------------------
           MAIN CONTENT WRAPPER
           -----------------------------------------------------
           • Provides consistent horizontal padding across breakpoints
           • Ensures content is centered and readable on all screens
           • Acts as the primary container for all page-level content
        ----------------------------------------------------- */}
        <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>

      </body>
    </html>
  );
}