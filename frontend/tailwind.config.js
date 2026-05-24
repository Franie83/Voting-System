/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ican: {
          primary: '#1a365d',
          secondary: '#2c5282',
          accent: '#d69e2e',
          success: '#38a169',
          danger: '#e53e3e',
          warning: '#dd6b20',
          light: '#f7fafc',
          dark: '#1a202c'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
