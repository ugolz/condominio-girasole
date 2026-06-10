/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        stone: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
        },
        terracotta: {
          50: '#fdf3ef',
          100: '#fbe0d4',
          200: '#f5bfa8',
          300: '#ee9470',
          400: '#e56840',
          500: '#d44e26',
          600: '#b83b1b',
          700: '#982e18',
          800: '#7d2819',
          900: '#67231a',
        },
        sage: {
          50: '#f3f6f3',
          100: '#e3eae3',
          200: '#c7d5c8',
          300: '#9eb8a0',
          400: '#6f9374',
          500: '#4e7554',
          600: '#3b5d40',
          700: '#304b35',
          800: '#283d2c',
          900: '#223325',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Georgia', 'serif'],
      }
    },
  },
  plugins: [],
}
