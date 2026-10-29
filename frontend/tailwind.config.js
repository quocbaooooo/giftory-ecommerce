/** @type {import('tailwindcss').Config} */
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
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          purple: '#7C3AED'
        },
        surface: {
          page: '#E9DCF8',
          card: '#FFFFFF',
          ink: '#1E1B4B',
          muted: '#5B587E',
          slate: '#6B7280',
          border: '#DDD6FE',
          light: '#F5EEFD',
          container: '#EFE7FA'
        },
        jade: {
          DEFAULT: '#10B981',
          50: '#ecfdf5',
          500: '#10B981',
          600: '#059669'
        },
        giftory: {
          primary: {
            DEFAULT: '#7C3AED',
            dark: '#6D28D9',
            light: '#DDD6FE'
          },
          sale: {
            DEFAULT: '#E11D48',
            hover: '#BE123C'
          },
          amber: '#F59E0B',
          emerald: '#10B981',
          ink: '#1E1B4B',
          canvas: '#F5EEFD',
          surface: '#F5EEFD',
          border: '#DDD6FE'
        }
      },
      boxShadow: {
        DEFAULT: '0 4px 16px rgba(30, 27, 75, 0.06)',
        sm: '0 4px 16px rgba(30, 27, 75, 0.06)',
        md: '0 4px 16px rgba(30, 27, 75, 0.06)',
        lg: '0 4px 16px rgba(30, 27, 75, 0.06)',
        xl: '0 4px 16px rgba(30, 27, 75, 0.06)',
        'shop-card': '0 4px 16px rgba(30, 27, 75, 0.06)',
        'floating': '0 8px 24px rgba(30, 27, 75, 0.10)',
        'pill': '0 4px 16px rgba(30, 27, 75, 0.06)',
        'admin-card': '0 4px 16px rgba(30, 27, 75, 0.06)'
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
