import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        rimal: {
          primary: "#EDA155",
          "primary-hover": "#F0B171",
          "primary-hover-dark": "#BE8144",
          "primary-gradient-end": "#D69046",
          secondary: "#734F96",
          "secondary-hover": "#8B5FC8",
          "secondary-hover-alt": "#5C3F7A",
          "secondary-hover-dark": "#5E3D7A",
          "secondary-gradient-mid": "#9B6CB8",
          "secondary-gradient-light": "#8A6CA8",
          dark: "#2D2D2D",
          "dark-hover": "#444444",
          "dark-text": "#1C1622",
        },
      },
      backgroundImage: {
        "rimal-purple-section":
          "linear-gradient(135deg, #734F96 0%, #5C3F78 55%, #4A3260 100%)",
        "rimal-badge": "linear-gradient(90deg, #EDA155 0%, #D69046 100%)",
        "rimal-soft-end":
          "linear-gradient(135deg, rgba(92,63,120,0.6) 0%, rgba(0,0,0,0) 50%, rgba(138,108,168,0.3) 100%)",
      },
      fontFamily: {
        sans: ["var(--font-ge-ss-two)", "sans-serif"],
        en: ["var(--font-ge-ss-two)", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      keyframes: {
        "bubble-in": {
          "0%": { opacity: "0", transform: "scale(0.85) translateY(8px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "bubble-out": {
          "0%": { opacity: "1", transform: "scale(1) translateY(0)" },
          "100%": { opacity: "0", transform: "scale(0.85) translateY(8px)" },
        },
        "dot-bounce": {
          "0%, 80%, 100%": { transform: "scale(0.6)", opacity: "0.4" },
          "40%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "bubble-in": "bubble-in 220ms ease-out forwards",
        "bubble-out": "bubble-out 180ms ease-in forwards",
        "dot-bounce": "dot-bounce 1.2s infinite ease-in-out",
      },
    },
  },
  plugins: [],
};

export default config;
