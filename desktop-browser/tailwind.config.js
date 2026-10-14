/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        tamizhi: {
          chrome: "#1a1040",
          chromeLight: "#2a1d5a",
          accent: "#00d4ff",
          accentDim: "#0099bb",
        },
      },
    },
  },
  plugins: [],
};
