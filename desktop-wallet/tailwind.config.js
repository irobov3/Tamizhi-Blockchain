/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        indigo: {
          deep: "#1a1040",
          night: "#13092e",
          mid: "#2a1a5e",
        },
        gold: {
          DEFAULT: "#d4a017",
          bright: "#f0c040",
          dim: "#a07c11",
        },
        cream: "#fdf6e3",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        tamil: ["'Noto Sans Tamil'", "sans-serif"],
      },
      boxShadow: {
        gold: "0 8px 24px -8px rgba(212,160,23,0.45)",
      },
    },
  },
  plugins: [],
};
