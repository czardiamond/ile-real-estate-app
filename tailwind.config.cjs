/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './App.tsx',
    './components/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
    './services/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary, #28503F)',
        'primary-container': 'var(--color-primary-container, #E2EBE3)',
        'on-primary-container': 'var(--color-on-primary-container, #1E3B2E)',
        secondary: 'var(--color-secondary, #956D37)',
        'secondary-container': 'var(--color-secondary-container, #F1E8D6)',
        'on-secondary-container': 'var(--color-on-secondary-container, #4D3615)',
        tertiary: '#B78A45',
        'tertiary-container': '#F1E8D6',
        'on-tertiary-container': '#4D3615',
        error: '#B42318',
        surface: 'var(--color-surface, #F8F6F1)',
        'surface-container-low': 'var(--color-surface-container-low, #FFFEFB)',
        'surface-container': 'var(--color-surface-container, #F0EEE7)',
        'surface-container-high': 'var(--color-surface-container-high, #E6E3DA)',
        'on-surface': 'var(--color-on-surface, #202923)',
        'on-surface-variant': 'var(--color-on-surface-variant, #565F59)',
        outline: 'var(--color-outline, #C8CCC4)',
        'outline-variant': 'var(--color-outline-variant, #E1E2DB)',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
      },
      borderRadius: {
        '4xl': '32px',
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
};
