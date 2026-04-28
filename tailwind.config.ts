import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        jakarta: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: '#003D82',
        'primary-light': '#0052A3',
        'primary-dark': '#002960',
        accent: '#FF6B35',
        'accent-light': '#FF8555',
        secondary: '#60a5fa',
        blueGrey: '#64748b',
        lightGrey: '#f1f5f9',
        mediumGrey: '#e2e8f0',
        dark: '#0F172A',
        darkAlt: '#1E293B',
        light: '#ffffff',
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #001f4d 0%, #003D82 50%, #005BB5 100%)',
      },
    },
  },
  plugins: [],
}
export default config
