/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'station-orange': '#FFA500',
        'railway-red': '#FF0000',
        'popup-yellow': '#FFEB3B',
      },
    },
  },
  plugins: [],
}
