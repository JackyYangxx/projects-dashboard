/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Light Tech Theme - Clean with subtle gradients
        'surface': {
          'base': '#F8FAFC',      // Light background
          'container': '#FFFFFF',   // Card/elevated surface
          'elevated': '#FFFFFF',    // Elevated elements
          'hover': '#F1F5F9',      // Hover state
        },
        'on-surface': {
          'primary': '#0F172A',    // Primary text - dark
          'secondary': '#475569',   // Secondary text
          'tertiary': '#94A3B8',    // Tertiary text
        },
        'outline': {
          DEFAULT: '#E2E8F0',
          'variant': '#F1F5F9',
        },
        // Primary - Vibrant blue
        'primary': {
          DEFAULT: '#3B82F6',
          '50': '#EFF6FF',
          '100': '#DBEAFE',
          '200': '#BFDBFE',
          '300': '#93C5FD',
          '400': '#60A5FA',
          '500': '#3B82F6',
          '600': '#2563EB',
          '700': '#1D4ED8',
          '800': '#1E40AF',
          '900': '#1E3A8A',
        },
        // Accent - Purple/Violet for tech highlights
        'accent': {
          DEFAULT: '#8B5CF6',
          '50': '#F5F3FF',
          '100': '#EDE9FE',
          '200': '#DDD6FE',
          '300': '#C4B5FD',
          '400': '#A78BFA',
          '500': '#8B5CF6',
          '600': '#7C3AED',
          '700': '#6D28D9',
          '800': '#5B21B6',
          '900': '#4C1D95',
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
        'info': '#3B82F6',
      },
      fontFamily: {
        'heading': ['Fira Code', 'monospace'],
        'body': ['Fira Sans', 'sans-serif'],
        'mono': ['Fira Code', 'monospace'],
      },
      borderRadius: {
        'sm': '0.125rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        'full': '9999px',
      },
      boxShadow: {
        // Light tech shadows
        'surface': '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
        'elevated': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'float': '0 10px 25px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
        'card': '0 0 0 1px rgba(0, 0, 0, 0.02), 0 2px 4px rgba(0, 0, 0, 0.04)',
        'glow-sm': '0 0 15px rgba(59, 130, 246, 0.15)',
        'glow-md': '0 0 30px rgba(59, 130, 246, 0.2)',
        'glow-lg': '0 0 50px rgba(59, 130, 246, 0.25)',
      },
      backdropBlur: {
        'glass': '12px',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flow-1': 'flow1 8s ease infinite',
        'flow-2': 'flow2 10s ease infinite',
        'flow-3': 'flow3 12s ease infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        flow1: {
          '0%, 100%': { transform: 'translate(0%, 0%)' },
          '25%': { transform: 'translate(5%, 5%)' },
          '50%': { transform: 'translate(0%, 10%)' },
          '75%': { transform: 'translate(-5%, 5%)' },
        },
        flow2: {
          '0%, 100%': { transform: 'translate(0%, 0%)' },
          '25%': { transform: 'translate(-5%, -5%)' },
          '50%': { transform: 'translate(-10%, 0%)' },
          '75%': { transform: 'translate(-5%, -10%)' },
        },
        flow3: {
          '0%, 100%': { transform: 'translate(0%, 0%) scale(1)' },
          '50%': { transform: 'translate(5%, -5%) scale(1.05)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
