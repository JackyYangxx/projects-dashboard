/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Surface - Light main area, layered for depth
        'surface': {
          'base': '#F1F5F9',       // Main bg (slate-100) - cards pop on this
          'container': '#FFFFFF',  // Cards
          'elevated': '#FFFFFF',   // Elevated
          'hover': '#E2E8F0',      // Hover (slate-200)
          'subtle': '#F8FAFC',     // Subtle dividers inside cards
        },
        'on-surface': {
          'primary': '#0F172A',    // Primary text
          'secondary': '#475569',  // Secondary
          'tertiary': '#94A3B8',   // Tertiary
        },
        'outline': {
          DEFAULT: '#CBD5E1',      // Visible on Windows (slate-300)
          'variant': '#E2E8F0',    // Subtle dividers
          'strong': '#94A3B8',     // Emphasis
        },
        // Sidebar - Dark theme
        'sidebar': {
          'bg': '#0F172A',         // slate-900
          'bg-hover': '#1E293B',   // slate-800
          'border': '#1E293B',     // slate-800
          'text': '#94A3B8',       // slate-400
          'text-strong': '#F1F5F9',// slate-100
          'text-active': '#5A87C9',// trust-blue-400
          'active-bg': 'rgba(0, 45, 98, 0.12)',
        },
        // Primary - Trust Blue (brand color)
        'primary': {
          DEFAULT: '#2E6BB8',
          '50': '#F0F5FC',
          '100': '#DCE7F5',
          '200': '#B8CFEB',
          '300': '#8FB1DD',
          '400': '#5A87C9',
          '500': '#2E6BB8',
          '600': '#1F4F95',
          '700': '#002D62',        // Trust Blue
          '800': '#001F47',
          '900': '#001428',
        },
        // Accent - Cyan/Teal (gradient partner)
        'accent': {
          DEFAULT: '#06B6D4',
          '50': '#ECFEFF',
          '100': '#CFFAFE',
          '200': '#A5F3FC',
          '300': '#67E8F9',
          '400': '#22D3EE',
          '500': '#06B6D4',
          '600': '#0891B2',
          '700': '#0E7490',
          '800': '#155E75',
          '900': '#164E63',
        },
        // Semantic colors
        'success': {
          DEFAULT: '#10B981',
          'light': '#34D399',
          'dark': '#059669',
        },
        'warning': {
          DEFAULT: '#F59E0B',
          'light': '#FBBF24',
          'dark': '#D97706',
        },
        'error': {
          DEFAULT: '#EF4444',
          'light': '#F87171',
          'dark': '#DC2626',
        },
        'info': '#06B6D4',
      },
      fontFamily: {
        'heading': ['"Fira Code"', '"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        'body': ['"Fira Sans"', '"Inter"', 'system-ui', '-apple-system', '"Segoe UI"', '"Microsoft YaHei"', 'sans-serif'],
        'mono': ['"Fira Code"', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'sm': '0.25rem',   // 4px
        'md': '0.5rem',    // 8px
        'lg': '0.75rem',   // 12px
        'xl': '1rem',      // 16px
        '2xl': '1.25rem',  // 20px
        '3xl': '1.5rem',   // 24px
        'full': '9999px',
      },
      boxShadow: {
        // Stronger shadows render well on Windows
        'surface': '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)',
        'elevated': '0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)',
        'float': '0 10px 25px -3px rgba(15, 23, 42, 0.12), 0 4px 6px -2px rgba(15, 23, 42, 0.06)',
        'card': '0 0 0 1px rgba(15, 23, 42, 0.04), 0 2px 4px rgba(15, 23, 42, 0.04)',
        // Brand glow (trust blue)
        'glow-sm': '0 0 0 1px rgba(46, 107, 184, 0.2), 0 4px 12px rgba(46, 107, 184, 0.15)',
        'glow-md': '0 0 0 1px rgba(46, 107, 184, 0.25), 0 8px 24px rgba(46, 107, 184, 0.2)',
        'glow-lg': '0 0 0 1px rgba(46, 107, 184, 0.3), 0 12px 40px rgba(46, 107, 184, 0.25)',
        // Sidebar depth shadow
        'sidebar': '1px 0 0 0 #1E293B',
      },
      backdropBlur: {
        'glass': '12px',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
}
