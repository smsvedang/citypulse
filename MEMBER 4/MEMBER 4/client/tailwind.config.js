/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        civic: {
          ink: '#0f172a',
          muted: '#64748b',
          accent: '#0ea5e9',
          warn: '#f59e0b',
          bad: '#ef4444',
          ok: '#22c55e',
        },
      },
    },
  },
  plugins: [],
};
