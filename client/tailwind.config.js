/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'bg-base': '#0B0B14',
        'bg-deep': '#121225',
        'bg-glass': 'rgba(255, 255, 255, 0.05)',
        'accent-start': '#6D5DFC',
        'accent-end': '#4F8CFF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-accent': 'linear-gradient(135deg, #6D5DFC 0%, #4F8CFF 100%)',
        'gradient-radial-glow':
          'radial-gradient(circle at 20% 20%, rgba(109, 93, 252, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(79, 140, 255, 0.12) 0%, transparent 50%)',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'glow': '0 0 20px rgba(109, 93, 252, 0.3)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};