/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#071B3A',
          800: '#0B3A75',
          700: '#0E4A94',
          600: '#1260B3',
        },
        brand: {
          orange: '#FF6A00',
          'orange-dark': '#E83A00',
          navy: '#071B3A',
          blue: '#0B3A75',
        },
        surface: '#F5F7FA',
        'text-primary': '#071B3A',
        'text-muted': '#4B5563',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(7,27,58,0.08), 0 1px 2px -1px rgba(7,27,58,0.05)',
        'card-hover': '0 4px 12px 0 rgba(7,27,58,0.12)',
      },
    },
  },
  plugins: [],
}
