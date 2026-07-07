/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Fonds — style Untitled UI : blanc pour les surfaces, gris très clair pour la page
        cream: {
          50: '#FFFFFF',
          100: '#FAFAFA',
          200: '#F5F5F5',
          300: '#E9EAEB',
        },
        // Échelle de gris Untitled UI (texte, bordures, éléments sombres)
        ink: {
          50: '#FAFAFA',
          100: '#E9EAEB',
          200: '#D5D7DA',
          300: '#A4A7AE',
          400: '#717680',
          500: '#535862',
          600: '#535862',
          700: '#414651',
          800: '#252B37',
          900: '#181D27',
          950: '#0A0D12',
        },
        // Violet — couleur de marque (échelle Untitled UI, décalée pour que
        // accent-500 soit le primaire des boutons)
        accent: {
          50: '#F9F5FF',
          100: '#F4EBFF',
          200: '#E9D7FE',
          300: '#D6BBFB',
          400: '#9E77ED',
          500: '#7F56D9',
          600: '#6941C6',
          700: '#53389E',
          800: '#42307D',
          900: '#2C1C5F',
        },
        success: {
          50: '#ECFDF3',
          200: '#ABEFC6',
          500: '#17B26A',
          600: '#079455',
          700: '#067647',
        },
        danger: {
          50: '#FEF3F2',
          200: '#FECDCA',
          500: '#F04438',
          600: '#D92D20',
          700: '#B42318',
        },
        warn: {
          50: '#FFFAEB',
          200: '#FEDF89',
          500: '#F79009',
          600: '#DC6803',
          700: '#B54708',
        },
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(10, 13, 18, 0.05)',
        sm: '0 1px 3px 0 rgba(10, 13, 18, 0.10), 0 1px 2px -1px rgba(10, 13, 18, 0.10)',
        md: '0 4px 6px -1px rgba(10, 13, 18, 0.10), 0 2px 4px -2px rgba(10, 13, 18, 0.06)',
        lg: '0 12px 16px -4px rgba(10, 13, 18, 0.08), 0 4px 6px -2px rgba(10, 13, 18, 0.03)',
      },
      keyframes: {
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'marquee-reverse': {
          from: { transform: 'translateX(-50%)' },
          to: { transform: 'translateX(0)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
      },
      animation: {
        marquee: 'marquee 45s linear infinite',
        'marquee-reverse': 'marquee-reverse 45s linear infinite',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
