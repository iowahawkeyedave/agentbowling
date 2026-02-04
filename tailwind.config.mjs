/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        lane: {
          100: '#f5e6d3',
          200: '#e8d4b8',
          300: '#d4a574',
          400: '#c4956a',
          500: '#b88460',
          600: '#a67356',
        },
        pin: {
          white: '#fefefe',
          red: '#e63946',
        },
        ball: {
          black: '#1a1a1a',
          blue: '#457b9d',
          purple: '#7b2cbf',
          green: '#2a9d8f',
        }
      },
      animation: {
        'pin-fall': 'pinFall 0.5s ease-out forwards',
        'ball-roll': 'ballRoll 1s ease-in-out forwards',
      },
      keyframes: {
        pinFall: {
          '0%': { transform: 'translateY(0) rotate(0deg)' },
          '100%': { transform: 'translateY(20px) rotate(15deg)', opacity: '0.5' },
        },
        ballRoll: {
          '0%': { transform: 'translateX(0) rotate(0deg)' },
          '100%': { transform: 'translateX(300px) rotate(720deg)' },
        },
      },
    },
  },
  plugins: [],
};
