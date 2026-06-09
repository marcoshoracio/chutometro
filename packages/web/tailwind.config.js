/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pitch: {
          DEFAULT: '#1a7a4a',
          light: '#22c55e',
        },
        navy: {
          DEFAULT: '#0f1923',
          card: '#1c2b3a',
          border: '#243447',
        },
        gold: '#f59e0b',
        muted: '#94a3b8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
