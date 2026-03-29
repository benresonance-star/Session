import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--color-bg) / <alpha-value>)',
        panel: 'rgb(var(--color-panel) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        text: 'rgb(var(--color-text) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        line: 'rgb(var(--color-line) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        next: 'rgb(var(--color-success) / <alpha-value>)',
        adjust: 'rgb(var(--color-warning) / <alpha-value>)'
      },
      fontSize: {
        'display': ['clamp(1.8rem, 8vw, 2.5rem)', { lineHeight: '1.05', fontWeight: '600' }],
        'title': ['1.75rem', { lineHeight: '1.1', fontWeight: '600' }]
      },
      letterSpacing: {
        'wide-ui': '0.08em'
      }
    }
  },
  plugins: []
};

export default config;
