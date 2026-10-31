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
          50: '#FFFDF7',
          100: '#FFF5E1',
          200: '#F5E4C4',
          300: '#E2BD96',
          400: '#B83D59',
          500: '#991B33',
          600: '#800020',
          700: '#660019',
          800: '#540015',
          900: '#3D000F',
          burgundy: '#800020',
          cream: '#FFF5E1',
          purple: '#800020',
          blue: '#800020'
        },
        burgundy: {
          50: '#FFFDF7',
          100: '#FFF5E1',
          200: '#F5E4C4',
          300: '#E2BD96',
          400: '#B83D59',
          500: '#991B33',
          600: '#800020',
          700: '#660019',
          800: '#540015',
          900: '#3D000F',
          DEFAULT: '#800020'
        },
        cream: {
          DEFAULT: '#FFF5E1',
          50: '#FFFDF8',
          100: '#FFF9ED',
          200: '#FFF5E1',
          300: '#FDF0D5',
          400: '#F5E4C4',
          500: '#EBD3AE',
          600: '#D4B889',
          ink: '#2B1A1A'
        },
        surface: {
          page: '#FFF5E1',
          card: '#FFFFFF',
          ink: '#2B1A1A',
          muted: '#6E5656',
          slate: '#7A6262',
          border: '#EBD3AE',
          light: '#FFFBF2',
          container: '#FDF0D5'
        },
        jade: {
          DEFAULT: '#10B981',
          50: '#ecfdf5',
          500: '#10B981',
          600: '#059669'
        },
        giftory: {
          primary: {
            DEFAULT: '#800020',
            dark: '#660019',
            light: '#F5E4C4'
          },
          sale: {
            DEFAULT: '#C41E3A',
            hover: '#9E142B'
          },
          amber: '#D97706',
          emerald: '#10B981',
          ink: '#2B1A1A',
          canvas: '#FFF5E1',
          surface: '#FFF5E1',
          border: '#EBD3AE',
          cream: '#FFF5E1'
        },
        blue: {
          50: '#FFFDF7',
          100: '#FDF0D5',
          200: '#F5E4C4',
          300: '#EBD3AE',
          400: '#B83D59',
          500: '#991B33',
          600: '#800020',
          700: '#660019',
          800: '#540015',
          900: '#3D000F',
          950: '#26000A',
          DEFAULT: '#800020'
        },
        purple: {
          50: '#FFFDF7',
          100: '#FDF0D5',
          200: '#F5E4C4',
          300: '#EBD3AE',
          400: '#B83D59',
          500: '#991B33',
          600: '#800020',
          700: '#660019',
          800: '#540015',
          900: '#3D000F',
          950: '#26000A',
          DEFAULT: '#800020'
        }
      },
      boxShadow: {
        DEFAULT: '0 4px 16px rgba(43, 26, 26, 0.06)',
        sm: '0 4px 16px rgba(43, 26, 26, 0.06)',
        md: '0 4px 16px rgba(43, 26, 26, 0.06)',
        lg: '0 4px 16px rgba(43, 26, 26, 0.06)',
        xl: '0 4px 16px rgba(43, 26, 26, 0.06)',
        'shop-card': '0 4px 16px rgba(43, 26, 26, 0.06)',
        'floating': '0 8px 24px rgba(43, 26, 26, 0.10)',
        'pill': '0 4px 16px rgba(43, 26, 26, 0.06)',
        'admin-card': '0 4px 16px rgba(43, 26, 26, 0.06)'
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
