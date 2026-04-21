import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        accent: { DEFAULT: '#1a3a2a', 2: '#2d6a4a', light: '#e8f2ec' },
        gold: { DEFAULT: '#b8860b', light: '#fdf8e8' },
        ink: { DEFAULT: '#0f0f0f', 2: '#3a3a3a', 3: '#888888' },
        surface: { DEFAULT: '#ffffff', 2: '#f6f5f2', 3: '#eeecea' },
        'haven-border': { DEFAULT: '#e0ddd8', 2: '#ccc9c3' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
        'card-lg': '0 4px 16px rgba(0,0,0,0.1), 0 12px 40px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
}

export default config
