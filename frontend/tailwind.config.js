/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: "#070a14",
          800: "#0d1224",
          700: "#131b36",
          600: "#1a254a"
        },
        brand: {
          primary: "#6366f1",
          secondary: "#8b5cf6",
          accent: "#ec4899",
          emerald: "#10b981",
          amber: "#f59e0b"
        }
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 10px rgba(99, 102, 241, 0.3)' },
          '100%': { boxShadow: '0 0 25px rgba(236, 72, 153, 0.6)' }
        }
      }
    },
  },
  plugins: [],
}
