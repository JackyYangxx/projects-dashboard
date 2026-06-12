/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Surface - Notion/Linear-style clean white
        'surface': {
          'base': '#FFFFFF',       // Main bg (pure white)
          'container': '#FFFFFF',  // Cards
          'elevated': '#FFFFFF',   // Elevated
          'hover': '#F4F4F5',      // Hover (zinc-100)
          'subtle': '#FAFAFA',     // Subtle dividers (zinc-50)
        },
        'on-surface': {
          'primary': '#18181B',    // Primary text (zinc-900)
          'secondary': '#52525B',  // Secondary (zinc-600)
          'tertiary': '#A1A1AA',   // Tertiary (zinc-400)
        },
        'outline': {
          DEFAULT: '#E4E4E7',      // zinc-200, clean light border
          'variant': '#F4F4F5',    // Subtle dividers (zinc-100)
          'strong': '#A1A1AA',     // Emphasis (zinc-400)
        },
        // Sidebar - Light cool (zinc)
        'sidebar': {
          'bg': '#F4F4F5',         // zinc-100
          'bg-hover': '#E4E4E7',   // zinc-200
          'border': '#E4E4E7',     // zinc-200
          'text': '#71717A',       // zinc-500
          'text-strong': '#18181B',// zinc-900
          'text-active': '#1F4F95',// primary-600 (deep trust blue for contrast on light)
          'active-bg': '#DCE7F5',  // primary-100 solid
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
        // Cool slate shadows
        'surface': '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)',
        'elevated': '0 4px 8px -2px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)',
        'float': '0 12px 28px -4px rgba(15, 23, 42, 0.10), 0 4px 8px -2px rgba(15, 23, 42, 0.05)',
        'card': '0 0 0 1px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.04)',
        'soft': '0 1px 2px rgba(15, 23, 42, 0.04), 0 0 0 1px rgba(15, 23, 42, 0.04)',
        // Brand glow (trust blue)
        'glow-sm': '0 0 0 1px rgba(46, 107, 184, 0.18), 0 4px 12px rgba(46, 107, 184, 0.12)',
        'glow-md': '0 0 0 1px rgba(46, 107, 184, 0.22), 0 8px 24px rgba(46, 107, 184, 0.18)',
        'glow-lg': '0 0 0 1px rgba(46, 107, 184, 0.28), 0 12px 40px rgba(46, 107, 184, 0.22)',
        // Sidebar depth shadow (subtle right shadow on light bg)
        'sidebar': '1px 0 0 0 #E2E8F0, 4px 0 12px -4px rgba(15, 23, 42, 0.04)',
      },
      backdropBlur: {
        'glass': '12px',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'breath': 'breath 7s ease-in-out infinite',
        'shimmer': 'shimmer 3s linear infinite',
        'ping-slow': 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite',
        'drift-a': 'driftA 24s ease-in-out infinite',
        'drift-b': 'driftB 30s ease-in-out infinite',
        'drift-c': 'driftC 22s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        breath: {
          '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
          '50%': { opacity: '0.55', transform: 'scale(1.08)' },
        },
        shimmer: {
          '0%': { strokeDashoffset: '0' },
          '100%': { strokeDashoffset: '-200' },
        },
        driftA: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(80px, -40px) scale(1.08)' },
          '66%': { transform: 'translate(-30px, 60px) scale(0.95)' },
        },
        driftB: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(-60px, 50px) scale(0.92)' },
          '66%': { transform: 'translate(50px, -30px) scale(1.1)' },
        },
        driftC: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(40px, 40px) scale(1.12)' },
        },
      },
    },
  },
  plugins: [],
}
