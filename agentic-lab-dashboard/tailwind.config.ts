import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: "#111111",
        card: "#1c1c1e",
        card2: "#242424",
        line: "#383838",
        gold: "#c9a84c",
        goldlight: "#e5c87a",
        ink: "#e8e4dc",
        muted: "#a8a49c",
        ok: "#1da87e",
        warn: "#e0a030",
        bad: "#d45828",
      },
    },
  },
  plugins: [],
};

export default config;
