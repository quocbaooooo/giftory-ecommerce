/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        inter: ['Inter', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif']
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
        'shop-card': '0 10px 30px -5px rgba(0, 0, 0, 0.05), 0 4px 10px -2px rgba(0, 0, 0, 0.02)',
        'floating': '0 20px 40px -10px rgba(15, 23, 42, 0.12)',
        'pill': '0 4px 20px -2px rgba(0, 0, 0, 0.06)',
        'admin-card': '0 10px 25px -5px rgba(124, 58, 237, 0.08)'
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ],
}
