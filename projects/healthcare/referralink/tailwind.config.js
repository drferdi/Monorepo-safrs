/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './App.tsx', './index.tsx', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'monospace'],
        mono: ['var(--font-mono)', 'monospace'],
        technical: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        background: 'var(--bg)',
        surface: 'var(--surface)',
        foreground: 'var(--fg)',
        muted: 'var(--muted)',
        border: 'var(--border)',
        accent: 'var(--accent)',
        chart: {
          1: 'var(--chart-1)',
          2: 'var(--chart-2)',
          3: 'var(--chart-3)',
          4: 'var(--chart-4)',
        },
        severity: {
          critical: 'var(--severity-critical)',
          urgent: 'var(--severity-urgent)',
          warning: 'var(--severity-warning)',
          info: 'var(--severity-info)',
          safe: 'var(--severity-safe)',
        },
      },
    },
  },
  plugins: [],
}
