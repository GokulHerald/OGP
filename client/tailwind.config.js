/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#080808',
          surface: '#0F0F0F',
          card: '#141414',
          border: '#242424',
          red: '#E8392A',
          orange: '#F97316',
          muted: '#525252',
          subtle: '#1A1A1A',
          light: '#F3F4F6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Barlow Condensed', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-glow': 'pulseGlow 2s infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%,100%': { boxShadow: '0 0 8px #E8392A55' },
          '50%': { boxShadow: '0 0 24px #E8392A99' },
        },
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #080808 0%, #0f0a0a 50%, #080808 100%)',
        'card-gradient': 'linear-gradient(145deg, #141414, #1a1a1a)',
      },
      boxShadow: {
        'glow-red': '0 0 20px rgba(232, 57, 42, 0.25)',
        'glow-red-strong': '0 0 40px rgba(232, 57, 42, 0.4)',
        'glow-orange': '0 0 20px rgba(249, 115, 22, 0.25)',
      },
    },
  },
  plugins: [],
}
