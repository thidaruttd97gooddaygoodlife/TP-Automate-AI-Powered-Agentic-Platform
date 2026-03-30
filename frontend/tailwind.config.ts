import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brandRed: "#CC0000",
        slatePanel: "#0f172a",
        neutralBg: "#F8F9FA",
      },
      boxShadow: {
        panel: "0 18px 50px -24px rgba(15, 23, 42, 0.35)",
      },
      fontFamily: {
        display: ["\"Sarabun\"", "sans-serif"],
        body: ["\"Sarabun\"", "sans-serif"],
      },
      keyframes: {
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        riseIn: "riseIn 500ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
