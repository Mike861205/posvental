import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
        },
      },
      backgroundImage: {
        "gradient-violet": "linear-gradient(135deg,#7c3aed 0%,#ec4899 100%)",
        "gradient-blue": "linear-gradient(135deg,#0ea5e9 0%,#6366f1 100%)",
        "gradient-emerald": "linear-gradient(135deg,#10b981 0%,#06b6d4 100%)",
        "gradient-amber": "linear-gradient(135deg,#f59e0b 0%,#ef4444 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
