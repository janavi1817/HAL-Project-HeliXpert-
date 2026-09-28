/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary gold colors
        'primary': {
          50: 'rgb(var(--primary-50) / <alpha-value>)',
          100: 'rgb(var(--primary-100) / <alpha-value>)',
          200: 'rgb(var(--primary-200) / <alpha-value>)',
          300: 'rgb(var(--primary-300) / <alpha-value>)',
          400: 'rgb(var(--primary-400) / <alpha-value>)',
          500: 'rgb(var(--primary-500) / <alpha-value>)',
          600: 'rgb(var(--primary-600) / <alpha-value>)',
          700: 'rgb(var(--primary-700) / <alpha-value>)',
          800: 'rgb(var(--primary-800) / <alpha-value>)',
          900: 'rgb(var(--primary-900) / <alpha-value>)',
        },
        
        // System colors
        'background': 'rgb(var(--background) / <alpha-value>)',
        'foreground': 'rgb(var(--foreground) / <alpha-value>)',
        'surface': 'rgb(var(--surface) / <alpha-value>)',
        'surface-variant': 'rgb(var(--surface-variant) / <alpha-value>)',
        'border': 'rgb(var(--border) / <alpha-value>)',
        'accent': 'rgb(var(--accent) / <alpha-value>)',
        'muted': 'rgb(var(--muted) / <alpha-value>)',

        // Status colors for both themes
        'success': {
          light: '#22c55e',
          dark: '#4ade80',
        },
        'warning': {
          light: '#f59e0b', 
          dark: '#fbbf24',
        },
        'error': {
          light: '#ef4444',
          dark: '#f87171',
        },
        'info': {
          light: '#3b82f6',
          dark: '#60a5fa', 
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'gold-glow': '0 0 20px rgba(255, 204, 51, 0.3)',
        'gold-glow-strong': '0 0 30px rgba(255, 204, 51, 0.5)',
      },
      animation: {
        'pulse-gold': 'pulse-gold 3s ease-in-out infinite',
      },
      keyframes: {
        'pulse-gold': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(0.98)' },
        },
      },
    },
  },
  plugins: [],
}
