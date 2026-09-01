/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sky: {
          50: '#f5f9ff',
          100: '#eaf4ff',
          200: '#d0e5ff',
          300: '#a3ccff',
          400: '#6baaff',
          500: '#0f6bdc',
          600: '#1fa2ff',
          700: '#0052cc',
          800: '#003d99',
          900: '#10243f',
        },
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
