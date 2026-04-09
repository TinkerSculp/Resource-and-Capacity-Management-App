'use client';

/* =============================================================================
   DashboardTileIcon.js
   -----------------------------------------------------------------------------
   PURPOSE:
     Renders an image icon that adapts to the user's color scheme preference.
     Displays a dark-themed image when system prefers dark mode, otherwise
     displays the default light-themed image.

   HOW IT WORKS:
     1. Accepts image sources for both light (default) and dark modes
     2. Uses HTML <picture> element for responsive color scheme handling
     3. CSS media query (prefers-color-scheme: dark) determines which source to use
     4. Falls back to defaultSrc if dark mode is not preferred

   PROPS:
     • defaultSrc (required) — Image URL for light mode
     • darkSrc (required)    — Image URL for dark mode
     • alt (required)        — Alt text for accessibility
     • width (optional)      — Image width in pixels (default: 96)
     • height (optional)     — Image height in pixels (default: 96)

   DEPENDENCIES:
     • None (uses native HTML and CSS media queries)
   ============================================================================= */

export default function DashboardTileIcon({ defaultSrc, darkSrc, alt, width = 96, height = 96 }) {
  return (
    <picture>
      <source srcSet={darkSrc} media="(prefers-color-scheme: dark)" />
      <img src={defaultSrc} alt={alt} width={width} height={height} />
    </picture>
  );
}