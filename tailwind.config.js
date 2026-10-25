/** @type {import('tailwindcss').Config} */
// Neutral colours come from CSS variables (src/index.css) so the light / dark toggle can swap them.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 950: '#06142b', 900: '#0a1f40', 800: '#10305e', 700: '#17427f', 600: '#1f56a3' },
        harbor: { 500: '#1e7fd8', 400: '#3b9cf0', 300: '#7cc0f7', 100: v('harbor-100'), 50: v('harbor-50') },
        nexus: { 400: '#22c3e6', 300: '#5ad6f0', 100: v('nexus-100') },
        ink: { 900: v('ink-900'), 700: v('ink-700'), 500: v('ink-500'), 300: v('ink-300'), 200: v('ink-200'), 100: v('ink-100') },
        /** Cards, panels and inputs. */
        surface: v('surface'),
        /** Headings and strong text. */
        heading: { DEFAULT: v('heading'), soft: v('heading-soft') },
      },
      fontFamily: {
        display: ['"Sora"', 'system-ui', 'sans-serif'],
        sans: ['"Inter Tight"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Menlo', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 2px rgba(10,31,64,.06), 0 8px 28px rgba(10,31,64,.12)',
      },
    },
  },
  plugins: [],
};
