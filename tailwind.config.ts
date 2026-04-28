import type { Config } from 'tailwindcss';

/**
 * Tailwind v4 — most config is now CSS-first via @theme in globals.css.
 * This file is kept minimal for IDE/tooling compatibility.
 */
const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {},
  plugins: [],
};

export default config;
