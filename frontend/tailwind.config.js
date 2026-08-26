/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // Dynamic CSS variable-based colors for seamless theming
        primary: {
          DEFAULT: 'var(--primary, #3b82f6)',
          hover: 'var(--primary-hover, #2563eb)',
          light: 'var(--primary-light, #60a5fa)',
          dark: 'var(--primary-dark, #1d4ed8)',
          subtle: 'var(--primary-subtle, rgba(59, 130, 246, 0.1))',
          border: 'var(--primary-border, rgba(59, 130, 246, 0.2))',
        },
        secondary: {
          DEFAULT: 'var(--secondary, #14b8a6)',
          light: 'var(--secondary-light, #2dd4bf)',
          dark: 'var(--secondary-dark, #0f766e)',
        },
        text: {
          primary: 'var(--text-primary, #0f172a)',
          secondary: 'var(--text-secondary, #475569)',
          muted: 'var(--text-muted, #94a3b8)',
          inverse: 'var(--text-inverse, #f8fafc)',
          'primary-dark': '#f8fafc',
          'secondary-dark': '#94a3b8',
        },
        bg: {
          page: 'var(--bg-page, #f8fafc)',
          card: 'var(--bg-card, #ffffff)',
          'card-hover': 'var(--bg-card-hover, #f1f5f9)',
          sidebar: 'var(--bg-sidebar, #ffffff)',
          'sidebar-hover': 'var(--bg-sidebar-hover, #f1f5f9)',
          'sidebar-active': 'var(--bg-sidebar-active, #eff6ff)',
          'page-dark': '#0b0f19',
          'card-dark': '#111827',
        },
        border: {
          subtle: 'var(--border-subtle, #e2e8f0)',
          default: 'var(--border-default, #cbd5e1)',
          sidebar: 'var(--border-sidebar, #e2e8f0)',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#0ea5e9',
        'dark-charcoal': '#0f172a',
        'medium-gray': '#64748b',
        'light-gray': '#f8fafc',
        // Dark theme specific surfaces
        'dark-surface': '#1e293b',
        'dark-surface-hover': '#334155',
        'dark-border': '#1e293b',
        'dark-input': '#1e293b',
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
        'card-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.3), 0 2px 6px -1px rgba(0, 0, 0, 0.2)',
        'sidebar': '1px 0 0 0 var(--border-sidebar, #e2e8f0)',
        'sidebar-dark': '1px 0 0 0 var(--border-sidebar, #1e293b)',
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
      },
      backdropBlur: {
        'xl': '16px',
      }
    },
  },
  plugins: [],
}