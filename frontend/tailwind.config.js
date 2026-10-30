/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors');

module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        serif: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        inter: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif']
      },
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          purple: '#2563eb',
          blue: '#2563eb'
        },
        surface: {
          page: '#EFF6FF',
          card: '#FFFFFF',
          ink: '#0F172A',
          muted: '#475569',
          slate: '#64748B',
          border: '#BFDBFE',
          light: '#F8FAFC',
          container: '#E0F2FE'
        },
        jade: {
          DEFAULT: '#10B981',
          50: '#ecfdf5',
          500: '#10B981',
          600: '#059669'
        },
        giftory: {
          primary: {
            DEFAULT: '#2563EB',
            dark: '#1D4ED8',
            light: '#BFDBFE'
          },
          sale: {
            DEFAULT: '#E11D48',
            hover: '#BE123C'
          },
          amber: '#F59E0B',
          emerald: '#10B981',
          ink: '#0F172A',
          canvas: '#EFF6FF',
          surface: '#EFF6FF',
          border: '#BFDBFE'
        },
        purple: colors.blue
      },
      boxShadow: {
        DEFAULT: '0 4px 16px rgba(15, 23, 42, 0.06)',
        sm: '0 4px 16px rgba(15, 23, 42, 0.06)',
        md: '0 4px 16px rgba(15, 23, 42, 0.06)',
        lg: '0 4px 16px rgba(15, 23, 42, 0.06)',
        xl: '0 4px 16px rgba(15, 23, 42, 0.06)',
        'shop-card': '0 4px 16px rgba(15, 23, 42, 0.06)',
        'floating': '0 8px 24px rgba(15, 23, 42, 0.10)',
        'pill': '0 4px 16px rgba(15, 23, 42, 0.06)',
        'admin-card': '0 4px 16px rgba(15, 23, 42, 0.06)'
      },
      borderRadius: {
        DEFAULT: '0.75rem',
        sm: '0.5rem',
        md: '0.75rem',
        lg: '0.75rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1rem'
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ],
}
