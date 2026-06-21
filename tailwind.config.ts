import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#e8f4fc",
          primary: "#f97316",
          "primary-hover": "#ea580c",
          secondary: "#2563eb",
          "secondary-hover": "#1d4ed8",
          success: "#16a34a",
          warning: "#dc2626",
        },
      },
    },
  },
  plugins: [],
};

export default config;
