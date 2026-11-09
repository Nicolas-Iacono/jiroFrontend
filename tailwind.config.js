/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'Segoe UI', 'sans-serif'] },
      colors: {
        app: 'rgb(var(--app) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        sunken: 'rgb(var(--sunken) / <alpha-value>)',
        raise: 'rgb(var(--raise) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        faint: 'rgb(var(--faint) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          soft: 'rgb(var(--accent-soft) / <alpha-value>)',
        },
        fill: {
          DEFAULT: 'rgb(var(--fill) / <alpha-value>)',
          hover: 'rgb(var(--fill-hover) / <alpha-value>)',
        },
        onfill: 'rgb(var(--onfill) / <alpha-value>)',
        inverse: 'rgb(var(--inverse) / <alpha-value>)',
        oninverse: 'rgb(var(--oninverse) / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
