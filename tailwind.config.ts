import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#4a0e0e',
        background: '#fff8f0',
        accent: '#d4af37',
      },
      fontFamily: {
        body: ['DM Sans', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
        'fade-in': 'fadeIn .4s ease-out forwards',
      },
    },
  },
  plugins: [],
} satisfies Config;
