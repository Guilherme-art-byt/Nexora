/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--ink) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        raised: "rgb(var(--raised) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        paper: "rgb(var(--paper) / <alpha-value>)",
        mute: "rgb(var(--mute) / <alpha-value>)",
        lamp: "rgb(var(--lamp) / <alpha-value>)",
        ember: "rgb(var(--ember) / <alpha-value>)",
        ok: "rgb(var(--ok) / <alpha-value>)",
      },
      fontFamily: {
        display: ['"Big Shoulders Display"', '"Arial Narrow"', "Impact", "sans-serif"],
        sans: ["Manrope", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      screens: { xs: "420px" },
    },
  },
  plugins: [],
};
