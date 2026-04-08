/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        paper: '#f5f0e8',
        ink: '#1a1423',
        mist: '#e8e2d8',
        plum: '#5b4b8a',
        coral: '#e85d4c',
        sand: '#d4cbbf',
      },
      boxShadow: {
        soft: '0 4px 24px -4px rgba(26, 20, 35, 0.12)',
        lift: '0 12px 40px -12px rgba(91, 75, 138, 0.25)',
      },
    },
  },
  plugins: [],
}
