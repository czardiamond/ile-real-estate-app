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
        primary: '#4285F4',
        'primary-container': 'var(--color-primary-container, #D2E3FC)',
        'on-primary-container': 'var(--color-on-primary-container, #174EA6)',
        secondary: '#34A853',
        'secondary-container': 'var(--color-secondary-container, #CEEAD6)',
        'on-secondary-container': 'var(--color-on-secondary-container, #0D652D)',
        tertiary: '#FBBC05',
        'tertiary-container': '#FEF7E0',
        'on-tertiary-container': '#AF5C00',
        error: '#EA4335',
        surface: 'var(--color-surface, #F8F9FA)',
        'surface-container-low': 'var(--color-surface-container-low, #FFFFFF)',
        'surface-container': 'var(--color-surface-container, #F1F3F4)',
        'surface-container-high': 'var(--color-surface-container-high, #E8EAED)',
        'on-surface': 'var(--color-on-surface, #202124)',
        'on-surface-variant': 'var(--color-on-surface-variant, #5F6368)',
        outline: 'var(--color-outline, #DADCE0)',
        'outline-variant': 'var(--color-outline-variant, #E8EAED)',
      },
      fontFamily: {
        sans: ['Google Sans', 'Roboto', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '32px',
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
};
