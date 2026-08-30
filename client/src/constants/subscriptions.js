// Popular subscription providers for the Subscription Tracker.
// `color` drives the logo glow / fallback tile, `typicalAmount` is a
// quick-fill suggestion for the monthly price (always editable).
export const SUBSCRIPTION_PROVIDERS = [
  { key: 'netflix', name: 'Netflix', typicalAmount: 199, color: '#E50914' },
  { key: 'amazon-prime', name: 'Amazon Prime', typicalAmount: 299, color: '#00A8E1' },
  { key: 'hotstar', name: 'Disney+ Hotstar', typicalAmount: 149, color: '#1F80E0' },
  { key: 'zee5', name: 'ZEE5', typicalAmount: 99, color: '#8230C9' },
  { key: 'sonyliv', name: 'SonyLIV', typicalAmount: 99, color: '#4F7DF9' },
  { key: 'jiocinema', name: 'JioCinema', typicalAmount: 99, color: '#E11D48' },
  { key: 'spotify', name: 'Spotify', typicalAmount: 119, color: '#1DB954' },
  { key: 'youtube-premium', name: 'YouTube Premium', typicalAmount: 129, color: '#FF0000' },
  { key: 'apple-tv', name: 'Apple TV+', typicalAmount: 99, color: '#A3A3A3' },
  { key: 'other', name: 'Other', typicalAmount: null, color: '#A855F7' },
];

export const getProvider = (key) =>
  SUBSCRIPTION_PROVIDERS.find((p) => p.key === key) || null;

export const getProviderColor = (key) => getProvider(key)?.color || '#A855F7';
