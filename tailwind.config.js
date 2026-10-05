/** @type {import('tailwindcss').Config} */
module.exports = {
  // 'class' because the driver picks the scheme (system / light / dark), not
  // just following the OS. useColorScheme.set() from nativewind drives it.
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}', './app.json'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Light is the base; the dark overrides live under theme.dark below.
        bg: '#F4F6F9',
        surface: '#FFFFFF',
        'surface-alt': '#EAEFF5',
        line: '#D3DCE6',

        ink: '#0E1720',
        'ink-muted': '#55626F',
        'ink-faint': '#8492A0',

        good: '#0F7A46',
        'good-dim': '#DCF1E6',
        warn: '#8A5A00',
        'warn-dim': '#FBEFD6',
        bad: '#BE262C',
        'bad-dim': '#FAE1E2',

        accent: '#1B4DD8',
        'accent-dim': '#E2E9FD',
        scrim: '#1F293355',
      },
      fontFamily: {
        sans: ['ProductSans_400Regular'],
        medium: ['ProductSans_500Medium'],
        bold: ['ProductSans_700Bold'],
      },
      fontSize: {
        hero: ['44px', { letterSpacing: '-1' }],
        title: ['20px'],
        body: ['16px'],
        small: ['14px'],
        tiny: ['12px'],
      },
      borderRadius: {
        card: '16px',
        control: '12px',
        chip: '999px',
      },
    },
    // Applied when the driver switches to dark.
    dark: {
      colors: {
        bg: '#0B0F14',
        surface: '#141A22',
        'surface-alt': '#1C2430',
        line: '#26303D',

        ink: '#F2F5F8',
        'ink-muted': '#8A97A6',
        'ink-faint': '#5A6673',

        good: '#2FBF71',
        'good-dim': '#12341F',
        warn: '#E8A33D',
        'warn-dim': '#33260F',
        bad: '#E5484D',
        'bad-dim': '#3A1517',

        accent: '#3B82F6',
        'accent-dim': '#12233F',
        scrim: '#000000AA',
      },
    },
  },
  plugins: [],
};
