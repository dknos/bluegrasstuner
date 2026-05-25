/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Mapped to CSS variables so the skin themes (.theme-*) can repaint everything.
        gray: {
          750: 'var(--c-gray-750)',
          800: 'var(--c-gray-800)',
          850: 'var(--c-gray-850)',
          900: 'var(--c-gray-900)',
          950: 'var(--c-gray-950)',
        },
        neon: {
          blue: 'var(--c-neon-blue)',
          pink: 'var(--c-neon-pink)',
          green: 'var(--c-neon-green)',
        },
        white: 'var(--c-text-white)',
        black: 'var(--c-text-black)',
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
