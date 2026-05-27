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
        accent: "var(--accent)",
        bg: "var(--bg)",
        "bg-card": "var(--bg-card)",
        "bg-navbar": "var(--bg-navbar)",
        "border-color": "var(--border-color)",
        text: "var(--text)",
        "text-secondary": "var(--text-secondary)",
      },
      borderRadius: {
        card: "var(--radius-card)",
        btn: "var(--radius-btn)",
      },
      fontFamily: {
        clash: "var(--font-clash)",
        syne: "var(--font-syne)",
        dm: "var(--font-dm)",
      },
      borderWidth: {
        DEFAULT: "0.5px",
      },
    },
  },
  plugins: [],
};
export default config;
