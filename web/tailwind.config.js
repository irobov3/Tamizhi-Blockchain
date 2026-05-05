/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#EE2E31', // Vibrant Modern Red
          50: '#FDEEEE',
          100: '#FBDDDD',
          200: '#F7BBBC',
          300: '#F3999B',
          400: '#EF7779',
          500: '#EE2E31',
          600: '#D51417',
          700: '#A10F11',
          800: '#6D0A0B',
          900: '#390506',
          950: '#1F0303',
        },
        secondary: {
          DEFAULT: '#1A1A1B', // Deep Charcoal
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
          950: '#030712',
        },
        accent: {
          DEFAULT: '#FFD700', // Bright Modern Gold
          50: '#FFFEF2',
          100: '#FFFDE5',
          200: '#FFFBC2',
          300: '#FFF99F',
          400: '#FFF77C',
          500: '#FFD700',
          600: '#CCAC00',
          700: '#998100',
          800: '#665600',
          900: '#332B00',
          950: '#1A1500',
        },
        background: {
          DEFAULT: '#FFFFFF',
          card: '#F8F9FA',
          elevated: '#FFFFFF',
          border: '#E5E7EB',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['"Playfair Display"', 'serif'],
        tamil: ['"Noto Sans Tamil"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'vibrant-gradient': 'linear-gradient(135deg, #EE2E31 0%, #FFD700 100%)',
        'soft-glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.4))',
      },
      boxShadow: {
        'premium': '0 20px 50px -12px rgba(0, 0, 0, 0.08)',
        'premium-hover': '0 30px 60px -12px rgba(0, 0, 0, 0.12)',
      }
    },
  },
  plugins: [],
};
