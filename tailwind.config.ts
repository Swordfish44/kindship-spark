import type { Config } from "tailwindcss";

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1rem', screens: { '2xl': '1280px' } },
    extend: {
      colors: {
        border: 'hsl(214 32% 91%)',
        input: 'hsl(214 32% 91%)',
        ring: 'hsl(221 83% 53%)',
        background: 'hsl(0 0% 100%)',
        foreground: 'hsl(222 47% 11%)',
        primary: { DEFAULT: 'hsl(222 47% 11%)', foreground: 'hsl(0 0% 100%)' },
        muted: { DEFAULT: 'hsl(210 40% 96%)', foreground: 'hsl(215 16% 47%)' },
        accent: { DEFAULT: 'hsl(210 40% 96%)', foreground: 'hsl(222 47% 11%)' },
        success: { DEFAULT: '#16a34a' },
        warning: { DEFAULT: '#d97706' },
        danger: { DEFAULT: '#b91c1c' }
      },
      borderRadius: { '2xl': '1rem' },
      boxShadow: { card: '0 8px 24px rgba(0,0,0,0.06)' },
    }
  },
  plugins: []
} satisfies Config;
