import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Helvetica Neue", "Arial", "sans-serif"],
      },
      colors: {
        rbx: {
          // Page & surface
          bg: "#eef0f7",
          surface: "#ffffff",
          elevated: "#f5f7fc",
          border: "#dde2ec",
          // Text
          text: "#1c1c2e",
          muted: "#5a6272",
          dim: "#9aa3b4",
          // Brand actions
          green: "#00b06f",
          "green-hover": "#00965e",
          "green-shadow": "#007a4d",
          blue: "#0075f5",
          "blue-hover": "#005fd0",
          "blue-shadow": "#004eaa",
          red: "#e2231a",
          "red-hover": "#c61c14",
          "red-shadow": "#9e1610",
          yellow: "#f7a900",
          "yellow-hover": "#e09800",
          "yellow-shadow": "#c07a00",
        },
        brand: {
          bg: "#eef0f7",
          primary: "#0075f5",
          "primary-hover": "#005fd0",
          secondary: "#00b06f",
          "secondary-hover": "#00965e",
          success: "#00b06f",
          warning: "#f7a900",
          danger: "#e2231a",
        },
        game: {
          mm2: "#e63946",
          adopt: "#f4a261",
          sab: "#2a9d8f",
          gag2: "#457b9d",
          other: "#6c757d",
        },
        rarity: {
          common: "#9aa3b4",
          uncommon: "#00b06f",
          rare: "#0075f5",
          epic: "#9333ea",
          legendary: "#f7a900",
          godly: "#e2231a",
        },
      },
      boxShadow: {
        "rbx-green": "0 4px 0 0 #007a4d",
        "rbx-blue": "0 4px 0 0 #004eaa",
        "rbx-red": "0 4px 0 0 #9e1610",
        "rbx-yellow": "0 4px 0 0 #c07a00",
        "rbx-card": "0 2px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
        "rbx-card-hover": "0 6px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)",
        "rbx-inset": "inset 0 1px 3px rgba(0,0,0,0.08)",
      },
      borderRadius: {
        rbx: "10px",
        "rbx-lg": "16px",
        "rbx-xl": "20px",
      },
      animation: {
        "slide-in-right": "slideInRight 0.3s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
      },
      keyframes: {
        slideInRight: {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(-4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
