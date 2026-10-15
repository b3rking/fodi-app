/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./global.css', './src/**/*.{js,ts,tsx}', './app/**/*.{js,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
        '400': ['Roboto-Regular'],
        '500': ['Roboto-Medium'],
        '700': ['Roboto-Bold'],
      },
      colors: {
        surface: { light: '#FFFFFF', dark: '#121212' },
        ink: { light: '#000000', dark: '#FFFFFF' },
        line: { light: '#E0E0E0', dark: '#404040' },
        accent: { light: '#FF5722', dark: '#FF9800' },
        bg: { light: '#F5F5F5', dark: '#1E1E1E' },
        text: { light: '#212121', dark: '#E0E0E0' },
        disabled: { light: '#BDBDBD', dark: '#616161' },
      },
    },
  },
  plugins: [],
};