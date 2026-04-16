/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Design system surface/background colors
        'surface': {
          'base': '#F7F6F3',
          'container': '#EFEDE8',
          'elevated': '#FFFFFF',
        },
        'on-surface': {
          'primary': '#1A1A1A',
          'secondary': '#6B6B6B',
          'tertiary': '#9E9E9E',
        },
        'outline': {
          DEFAULT: '#D4D2CC',
          'variant': '#E8E6E0',
        },
        // Primary accent
        'primary': {
          '500': '#5B7FA6',
          '600': '#4A6B8A',
          '700': '#3A5A73',
        },
        // Semantic colors
        'success': '#4CAF50',
        'warning': '#FF9800',
        'error': '#F44336',
        'info': '#2196F3',
      },
      fontFamily: {
        'heading': ['Manrope', 'sans-serif'],
        'body': ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'sm': '0.125rem',
        'md': '0.25rem',
        'lg': '0.5rem',
        'full': '0.75rem',
      },
      boxShadow: {
        'surface': '0 4px 24px rgba(26, 26, 26, 0.04)',
        'elevated': '0 8px 40px rgba(26, 26, 26, 0.06)',
        'float': '0 8px 40px rgba(26, 26, 26, 0.08)',
      },
      backdropBlur: {
        'glass': '12px',
      },
    },
  },
  plugins: [],
}
