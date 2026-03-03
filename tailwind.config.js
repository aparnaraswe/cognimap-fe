/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Premium warm palette — color psychology:
        // Ivory/cream = trust, warmth, sophistication
        // Deep charcoal = authority, professionalism
        // Amber/copper = energy, confidence, warmth
        // Sage = growth, balance, intelligence
        
        ivory:   { 50: '#FEFDFB', 100: '#FDF9F3', 200: '#FAF0E4', 300: '#F5E4CC', 400: '#EDD5B3' },
        ink:     { DEFAULT: '#1C1917', soft: '#44403C', dim: '#78716C', faint: '#A8A29E' },
        copper:  { DEFAULT: '#B45309', light: '#D97706', bright: '#F59E0B', pale: '#FEF3C7', deep: '#92400E' },
        sage:    { DEFAULT: '#4D7C5E', light: '#6B9B7D', pale: '#ECFDF5', deep: '#1B4332' },
        slate:   { DEFAULT: '#334155', light: '#64748B', pale: '#F1F5F9' },
        
        // Domain colors — each represents cognitive function character
        gf: '#6366F1',    // Indigo — abstract thinking
        gv: '#0891B2',    // Cyan — spatial awareness  
        gq: '#D97706',    // Amber — analytical precision
        gc: '#059669',    // Emerald — language, growth
        gs: '#DC2626',    // Red — speed, urgency
        
        danger: '#DC2626',
        success: '#059669',
        warning: '#D97706',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body:    ['"Source Sans 3"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'soft': '0 1px 3px rgba(28, 25, 23, 0.06), 0 1px 2px rgba(28, 25, 23, 0.04)',
        'card': '0 4px 16px rgba(28, 25, 23, 0.06)',
        'elevated': '0 10px 40px rgba(28, 25, 23, 0.1)',
        'glow-copper': '0 4px 24px rgba(180, 83, 9, 0.15)',
        'glow-sage': '0 4px 24px rgba(77, 124, 94, 0.15)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out both',
        'fade-in': 'fadeIn 0.4s ease-out both',
        'scale-in': 'scaleIn 0.3s ease-out both',
        'slide-in': 'slideIn 0.4s ease-out both',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: { '0%': { opacity: 0, transform: 'translateY(16px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        scaleIn: { '0%': { opacity: 0, transform: 'scale(0.95)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
        slideIn: { '0%': { opacity: 0, transform: 'translateX(-12px)' }, '100%': { opacity: 1, transform: 'translateX(0)' } },
        pulseSoft: { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.7 } },
      },
    },
  },
  plugins: [],
}
