/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pesantren: {
          primary: "#0F8F63", // Primary Green
          emerald: "#0F8F63", // Primary Green
          gold: "#D4AF37",    // Soft Gold
          light: "#F8F9FA",   // Soft light grey
        }
      },
      fontFamily: {
        sans: ['Poppins', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
