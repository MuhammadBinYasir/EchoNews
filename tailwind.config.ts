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
        primary: {
          DEFAULT: "#c0152f",
          hover: "#a31126",
          dark: "#841021",
          light: "#fae9e7",
          subtle: "#fcedeb",
          border: "#ebc2bc",
          50: "#fdf2f2",
          100: "#fbe4e5",
          200: "#f8cbce",
          300: "#f1a4a9",
          400: "#e56c75",
          500: "#d33a49",
          600: "#c0152f",
          700: "#9f0e24",
          800: "#841021",
          900: "#6e121f",
          950: "#3d040c",
        },
        secondary: {
          DEFAULT: "#f5f0e6",
          paper: "#f7f3ea",
          cream: "#f4efe6",
          card: "#ffffff",
          border: "#ded7cb",
          line: "#e5ded3",
          dark: "#1a1917",
          charcoal: "#2a2723",
          muted: "#716c64",
          50: "#fcfaf7",
          100: "#f7f3ea",
          200: "#eee6d6",
          300: "#ded7cb",
          400: "#b5ab9c",
          500: "#8f8474",
          600: "#716c64",
          700: "#555049",
          800: "#3d3933",
          900: "#1a1917",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "Cambria", "Times New Roman", "Times", "serif"],
        sans: ["var(--font-geist-sans)", "Inter", "-apple-system", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
