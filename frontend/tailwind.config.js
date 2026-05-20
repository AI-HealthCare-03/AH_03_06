/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      sans: ['Pretendard', 'sans-serif'],
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          dark: '#1D4ED8',
          soft: '#EFF6FF',
        },
        text: {
          body: '#18181B',
          sub: '#71717A',
        }
      }
    }
  },
  plugins: [],
}