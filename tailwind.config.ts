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
          bg: "#111216",
          surface: "#232527",
          elevated: "#2d2f36",
          border: "#494a4d",
          text: "#ffffff",
          muted: "#bdbebe",
          dim: "#686868",
          green: "#00b06f",
          "green-hover": "#00965e",
          "green-shadow": "#008653",
          blue: "#00a2ff",
          "blue-hover": "#0084cc",
          "blue-shadow": "#0066a3",
          red: "#e2231a",
          "red-hover": "#c61c14",
          "red-shadow": "#9e1610",
          yellow: "#f7d040",
          "yellow-hover": "#e6bc2f",
        },
        brand: {
          bg: "#111216",
          primary: "#00b06f",
          "primary-hover": "#00965e",
          secondary: "#00a2ff",
          "secondary-hover": "#0084cc",
          success: "#00b06f",
          warning: "#ff5c5c",
        },
      },
      boxShadow: {
        "rbx-green": "0 4px 0 0 #008653",
        "rbx-blue": "0 4px 0 0 #0066a3",
        "rbx-red": "0 4px 0 0 #9e1610",
        "rbx-card": "0 8px 24px rgba(0, 0, 0, 0.35)",
      },
      borderRadius: {
        rbx: "8px",
      },
    },
  },
  plugins: [],
};

export default config;
