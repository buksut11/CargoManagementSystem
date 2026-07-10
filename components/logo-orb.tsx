import type { SVGProps } from "react";

/**
 * The CargoBook "materialized" logo: a glowing orange cargo cube set into a
 * metallic glass orb, rendered as pure SVG gradients so it stays crisp at any
 * size and needs no raster asset. Matches the login reference art in both
 * themes (the orb face is dark glass, which reads well on light and dark).
 */
export function LogoOrb(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden {...props}>
      <defs>
        {/* Soft orange halo bleeding past the ring. */}
        <radialGradient id="orb-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fb923c" stopOpacity="0.5" />
          <stop offset="65%" stopColor="#fb923c" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
        </radialGradient>
        {/* Metallic bezel: lit from above, falling into shadow below. */}
        <linearGradient id="orb-ring" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="30%" stopColor="#94a3b8" />
          <stop offset="70%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        {/* Dark glass face behind the cube. */}
        <radialGradient id="orb-face" cx="50%" cy="32%" r="80%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="55%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#020617" />
        </radialGradient>
        {/* The orange cube tile. */}
        <linearGradient id="orb-cube" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#fdba74" />
          <stop offset="40%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#c2410c" />
        </linearGradient>
        {/* Glossy sheen across the top of the cube. */}
        <linearGradient id="orb-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <circle cx="60" cy="60" r="58" fill="url(#orb-glow)" />
      <circle cx="60" cy="60" r="45" fill="url(#orb-ring)" />
      <circle cx="60" cy="60" r="40" fill="url(#orb-face)" />
      {/* Glass highlight on the upper face. */}
      <ellipse cx="60" cy="38" rx="28" ry="13" fill="#ffffff" opacity="0.12" />

      <rect x="39" y="39" width="42" height="42" rx="11" fill="url(#orb-cube)" />
      <rect x="41" y="41" width="38" height="19" rx="9" fill="url(#orb-sheen)" />

      {/* Cargo box glyph (same mark as BoxIcon), centered on the tile. */}
      <g
        fill="none"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(47 47) scale(1.08)"
      >
        <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
        <path d="M3 8l9 5 9-5" />
        <path d="M12 13v8" />
      </g>
    </svg>
  );
}
