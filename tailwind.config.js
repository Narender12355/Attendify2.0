/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // Classes built dynamically in the UI (e.g. `text-${tone}`) must be safelisted.
  safelist: ['text-good', 'text-warn', 'text-bad', 'text-muted', 'text-accent'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)', card: 'var(--card)', solid: 'var(--card-solid)', line: 'var(--line)',
        ink: 'var(--text)', muted: 'var(--muted)', accent: 'var(--accent)', accent2: 'var(--accent2)',
        good: 'var(--good)', warn: 'var(--warn)', bad: 'var(--bad)', field: 'var(--field)'
      },
      fontFamily: { sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'] }
    }
  },
  plugins: []
};
