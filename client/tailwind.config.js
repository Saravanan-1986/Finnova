/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'bg-base': '#020103',
        'bg-deep': '#07060C',
        'bg-glass': 'rgba(168, 85, 247, 0.06)',
        'accent-start': '#A855F7',
        'accent-end': '#D946EF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-accent': 'linear-gradient(135deg, #A855F7 0%, #D946EF 100%)',
        'gradient-hero': 'linear-gradient(150deg, #7E22CE 0%, #5B21B6 45%, #3B0764 100%)',
        'gradient-radial-glow':
          'radial-gradient(circle at 15% 15%, rgba(168, 85, 247, 0.16) 0%, transparent 50%), radial-gradient(circle at 85% 85%, rgba(217, 70, 239, 0.10) 0%, transparent 50%)',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.45)',
        'glow': '0 0 22px rgba(168, 85, 247, 0.35)',
        'glow-strong': '0 0 45px rgba(168, 85, 247, 0.5), 0 0 90px rgba(217, 70, 239, 0.25)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};