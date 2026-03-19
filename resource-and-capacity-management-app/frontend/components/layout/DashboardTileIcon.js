'use client';

export default function DashboardTileIcon({ defaultSrc, darkSrc, alt, width = 96, height = 96 }) {
  return (
    <picture>
      <source srcSet={darkSrc} media="(prefers-color-scheme: dark)" />
      <img src={defaultSrc} alt={alt} width={width} height={height} />
    </picture>
  );
}