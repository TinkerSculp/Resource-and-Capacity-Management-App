import { Geist, Geist_Mono, Outfit } from "next/font/google";
// Import custom Google fonts using Next.js font optimization

import "./globals.css";
// Global stylesheet applied to the entire app

// Load Geist Sans font and expose it as a CSS variable
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Load Geist Mono font and expose it as a CSS variable
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Load Outfit font and expose it as a CSS variable
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

// Root layout applied to every page in the Next.js app
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        // Apply all font variables + antialiasing for smoother text rendering
        className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} antialiased`}
      >
        {/* Render the page content */}
        {children}
      </body>
    </html>
  );
}
