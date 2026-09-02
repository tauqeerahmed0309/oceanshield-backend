/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        marine: {
          950: '#f0f9ff', // Light blue background
          900: '#e0f2fe', // Light panel background
          850: '#f0f7ff', // Hover highlight
          800: '#bae6fd', // Card border
          700: '#7dd3fc', // Muted highlights
          600: '#0ea5e9', // Sky accent
          500: '#0284c7', // Deep sky accent
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
