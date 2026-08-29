import { useId } from 'react';

/**
 * FINNOVA brand mark — a neon purple→pink "growth zigzag" that flows into
 * an integrated letter F and finishes in a crystal cluster, optionally set
 * inside the dark rounded-square app tile.
 *
 * Props:
 *  - size:      rendered width/height in px (default 40)
 *  - boxed:     include the dark rounded-square tile background (default true)
 *  - animated:  apply splash-screen animation classes (line draw + gem pop);
 *               only meaningful for the intro splash
 *  - className: extra classes on the <svg>
 */
const FinnovaLogo = ({ size = 40, boxed = true, animated = false, className = '' }) => {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const ids = {
    line: `fin-line-${uid}`,
    fGrad: `fin-f-${uid}`,
    gemLight: `fin-gem-light-${uid}`,
    gemDark: `fin-gem-dark-${uid}`,
    box: `fin-box-${uid}`,
    boxGlow: `fin-box-glow-${uid}`,
    boxEdge: `fin-box-edge-${uid}`,
    filterLine: `fin-filter-line-${uid}`,
    filterGem: `fin-filter-gem-${uid}`,
  };

  const gem = (x, y, s, r, i) => (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <g
        className={animated ? 'splash-gem' : undefined}
        style={animated ? { animationDelay: `${1.02 + i * 0.12}s` } : undefined}
      >
        <polygon points="0,-40 27,0 0,36 -27,0" fill={`url(#${ids.gemLight})`} />
        <polygon points="-27,0 0,36 27,0" fill={`url(#${ids.gemDark})`} opacity="0.92" />
        <path
          d="M0,-40 L0,36 M-27,0 L27,0"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    </g>
  );

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="FINNOVA logo"
    >
      <defs>
        {/* Rising chart line: deep purple → violet → pink */}
        <linearGradient id={ids.line} x1="106" y1="377" x2="348" y2="170" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6D28D9" />
          <stop offset="0.55" stopColor="#A855F7" />
          <stop offset="1" stopColor="#F0ABFC" />
        </linearGradient>
        {/* Letter F: bright at the top, deep at the hook */}
        <linearGradient id={ids.fGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C084FC" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
        {/* Crystal facets */}
        <linearGradient id={ids.gemLight} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FBE8FF" />
          <stop offset="0.55" stopColor="#E9A8FF" />
          <stop offset="1" stopColor="#C084FC" />
        </linearGradient>
        <linearGradient id={ids.gemDark} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B45DF9" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
        {/* App tile */}
        <linearGradient id={ids.box} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1D1533" />
          <stop offset="1" stopColor="#0A0714" />
        </linearGradient>
        <radialGradient id={ids.boxGlow} cx="0.5" cy="0.14" r="0.8">
          <stop offset="0" stopColor="#A855F7" stopOpacity="0.32" />
          <stop offset="1" stopColor="#A855F7" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={ids.boxEdge} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F0ABFC" stopOpacity="0.75" />
          <stop offset="0.5" stopColor="#A855F7" stopOpacity="0.35" />
          <stop offset="1" stopColor="#7C3AED" stopOpacity="0.18" />
        </linearGradient>
        {/* Neon glow */}
        <filter id={ids.filterLine} x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="0" stdDeviation="9" floodColor="#A855F7" floodOpacity="0.5" />
        </filter>
        <filter id={ids.filterGem} x="-80%" y="-80%" width="260%" height="260%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#E879F9" floodOpacity="0.55" />
        </filter>
      </defs>

      {boxed && (
        <>
          <rect x="20" y="20" width="472" height="472" rx="110" fill={`url(#${ids.box})`} />
          <rect x="20" y="20" width="472" height="472" rx="110" fill={`url(#${ids.boxGlow})`} />
          <rect
            x="21.5"
            y="21.5"
            width="469"
            height="469"
            rx="108.5"
            fill="none"
            stroke={`url(#${ids.boxEdge})`}
            strokeWidth="3"
          />
        </>
      )}

      <g filter={`url(#${ids.filterLine})`}>
        {/* Rising market zigzag — drawn on during the splash */}
        <polyline
          points="106,377 179,261 203,306 260,214 287,257 348,170"
          fill="none"
          stroke={`url(#${ids.line})`}
          strokeWidth="30"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="1"
          className={animated ? 'splash-line' : undefined}
        />
        {/* The F hanging off the zigzag */}
        <path
          d="M272 268 L246 366 Q240 392 216 396 M258 300 L316 292"
          fill="none"
          stroke={`url(#${ids.fGrad})`}
          strokeWidth="26"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={animated ? 'splash-f' : undefined}
        />
      </g>

      {/* Crystal cluster where the line takes off */}
      <g filter={`url(#${ids.filterGem})`}>
        {gem(392, 172, 1.05, 0, 0)}
        {gem(348, 208, 0.62, -14, 1)}
        {gem(436, 208, 0.55, 12, 2)}
        {gem(362, 248, 0.4, -8, 3)}
      </g>
    </svg>
  );
};

export default FinnovaLogo;
