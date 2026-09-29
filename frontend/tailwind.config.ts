import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        app: {
          bg: "#DCE6F5",
          sidebar: "#F4F7FC",
          header: "#F4F7FC",
          card: "#FFFFFF",
          table: "#FFFFFF",
          "table-header": "#F1F5FB",
          border: "#D5DFED",
          primary: "#2155D9",
          "primary-text": "#17243B",
          "secondary-text": "#64748B",
        },
        cpcl: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2155D9",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        }
      },
      boxShadow: {
        subtle: "0 2px 8px rgba(30, 64, 120, 0.06)",
      },
    },
  },
  plugins: [],
};
export default config;
