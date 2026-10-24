/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 950: '#06142b', 900: '#0a1f40', 800: '#10305e', 700: '#17427f', 600: '#1f56a3' },
        harbor: { 500: '#1e7fd8', 400: '#3b9cf0', 300: '#7cc0f7', 100: '#e3f1fd', 50: '#f3f8fe' },
        nexus: { 400: '#22c3e6', 300: '#5ad6f0', 100: '#d9f6fc' },
        ink: { 900: '#0f1c2e', 700: '#34465e', 500: '#62748c', 300: '#a9b7c9', 200: '#d5dee9', 100: '#eaf0f6' },
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
