import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#2563EB",
          deep: "#1D4ED8",
          pale: "#DBEAFE",
          bg: "#F8FAFC",
          surface: "#FFFFFF",
          text: "#0F172A",
          muted: "#64748B",
          border: "#E2E8F0",
          conflict: "#DC2626",
          warning: "#D97706",
          success: "#16A34A",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
