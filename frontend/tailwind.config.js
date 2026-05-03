/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // F1 Official Colors
        'f1-red': '#E10600',
        'f1-dark': '#15151e',
        'f1-gray': '#1a1a1a',
        'f1-silver': '#f0f0f0',
      },
      backgroundImage: {
        'f1-gradient': 'linear-gradient(135deg, #15151e 0%, #0a0a0f 100%)',
      },
      boxShadow: {
        'f1-glow': '0 0 20px rgba(225, 6, 0, 0.3)',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
