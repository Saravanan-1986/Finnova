// Brand marks for popular subscriptions, drawn as inline SVG — crisp at any
// size, no network requests, and they read well on the dark theme.
import { getProviderColor } from '../../constants/subscriptions.js';

const TILE_STYLES = {
  netflix: { background: '#000000', border: 'rgba(229, 9, 20, 0.45)' },
  'amazon-prime': { background: '#0F171E', border: 'rgba(0, 168, 225, 0.45)' },
  hotstar: { background: '#0B1220', border: 'rgba(31, 128, 224, 0.45)' },
  zee5: { background: 'linear-gradient(135deg, #4C0D86 0%, #A21CAF 100%)', border: 'rgba(162, 28, 175, 0.5)' },
  sonyliv: { background: '#0B0F1A', border: 'rgba(79, 125, 249, 0.45)' },
  jiocinema: { background: '#050A1F', border: 'rgba(225, 29, 72, 0.45)' },
  spotify: { background: '#0B0B0B', border: 'rgba(29, 185, 84, 0.45)' },
  'youtube-premium': { background: '#0B0B0B', border: 'rgba(255, 0, 0, 0.45)' },
  'apple-tv': { background: '#000000', border: 'rgba(255, 255, 255, 0.25)' },
};

const MARKS = {
  netflix: (
    <g fill="#E50914">
      <rect x="6.4" y="3" width="2.7" height="18" />
      <rect x="14.9" y="3" width="2.7" height="18" />
      <polygon points="6.4,3 9.1,3 17.6,21 14.9,21" />
    </g>
  ),
  'amazon-prime': (
    <g>
      <text
        x="12"
        y="11.6"
        textAnchor="middle"
        fontSize="6.4"
        fontWeight="700"
        fill="#FFFFFF"
        fontFamily="Inter, system-ui, sans-serif"
        letterSpacing="0.2"
      >
        prime
      </text>
      <path
        d="M5 13.8c4.4 3.3 9.6 3.3 14 0"
        stroke="#00A8E1"
        strokeWidth="1.7"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M17.9 12.9l2.1 0.5-1 1.9"
        stroke="#00A8E1"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  ),
  hotstar: (
    <g>
      <defs>
        <linearGradient id="fn-hotstar-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7DD3FC" />
          <stop offset="55%" stopColor="#1F80E0" />
          <stop offset="100%" stopColor="#E0F2FE" />
        </linearGradient>
      </defs>
      <path d="M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z" fill="url(#fn-hotstar-grad)" />
      <path
        d="M18.4 16v4.2M16.3 18.1h4.2"
        stroke="#7DD3FC"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </g>
  ),
  zee5: (
    <text
      x="12"
      y="15.4"
      textAnchor="middle"
      fontSize="7.4"
      fontWeight="800"
      fill="#FFFFFF"
      fontFamily="Inter, system-ui, sans-serif"
      letterSpacing="0.4"
    >
      ZEE5
    </text>
  ),
  sonyliv: (
    <g>
      <defs>
        <linearGradient id="fn-liv-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#818CF8" />
        </linearGradient>
      </defs>
      <text
        x="12"
        y="15.4"
        textAnchor="middle"
        fontSize="7.4"
        fontWeight="800"
        fill="url(#fn-liv-grad)"
        fontFamily="Inter, system-ui, sans-serif"
        letterSpacing="0.5"
      >
        LIV
      </text>
    </g>
  ),
  jiocinema: (
    <g>
      <text
        x="9.2"
        y="15.2"
        textAnchor="middle"
        fontSize="7"
        fontWeight="800"
        fill="#FFFFFF"
        fontFamily="Inter, system-ui, sans-serif"
      >
        JIO
      </text>
      <polygon points="14.8,8.8 20,12 14.8,15.2" fill="#E11D48" />
    </g>
  ),
  spotify: (
    <g>
      <circle cx="12" cy="12" r="9.2" fill="#1DB954" />
      <path d="M7.2 9.5c3.4-1 7.2-.6 9.9 1.1" stroke="#0B0B0B" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M7.7 12.4c2.8-.8 5.8-.4 8.1 1" stroke="#0B0B0B" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M8.1 15.1c2.3-.6 4.6-.3 6.5.8" stroke="#0B0B0B" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </g>
  ),
  'youtube-premium': (
    <g>
      <rect x="3.6" y="7" width="16.8" height="10" rx="3" fill="#FF0000" />
      <polygon points="10.4,9.6 15.2,12 10.4,14.4" fill="#FFFFFF" />
    </g>
  ),
  'apple-tv': (
    <text
      x="12"
      y="15.4"
      textAnchor="middle"
      fontSize="7.6"
      fontWeight="700"
      fill="#FFFFFF"
      fontFamily="Inter, system-ui, sans-serif"
    >
      tv
    </text>
  ),
};

const SubscriptionLogo = ({ serviceKey = '', name = '', size = 40, className = '' }) => {
  const tile = TILE_STYLES[serviceKey];
  const mark = MARKS[serviceKey];
  const color = getProviderColor(serviceKey);

  // Unknown/custom service -> gradient tile with the first letter
  if (!tile || !mark) {
    return (
      <div
        className={`shrink-0 rounded-xl overflow-hidden flex items-center justify-center bg-gradient-accent border border-white/10 ${className}`}
        style={{ width: size, height: size, boxShadow: '0 0 14px rgba(168, 85, 247, 0.35)' }}
        title={name}
      >
        <span className="font-extrabold text-white leading-none" style={{ fontSize: size * 0.42 }}>
          {(name || '?').trim().charAt(0).toUpperCase() || '?'}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`shrink-0 rounded-xl overflow-hidden flex items-center justify-center border ${className}`}
      style={{
        width: size,
        height: size,
        background: tile.background,
        borderColor: tile.border,
        boxShadow: `0 0 14px ${color}40`,
      }}
      title={name}
    >
      <svg width={size * 0.72} height={size * 0.72} viewBox="0 0 24 24" role="img" aria-label={name}>
        {mark}
      </svg>
    </div>
  );
};

export default SubscriptionLogo;
