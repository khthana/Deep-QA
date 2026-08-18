/** @type {import('tailwindcss').Config} */

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        thai: ['"Noto Sans Thai"', 'sans-serif'],
      },
      colors: {
        primary: '#0F2A60',
        primary_hover: '#0D2047',
        secondary: '#003296',
        secondary_hover: '#0039AA',
      },
    },
  },
  plugins: [],
}
