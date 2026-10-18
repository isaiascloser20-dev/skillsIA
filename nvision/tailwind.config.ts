import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Color de marca del proyecto (definido en globals.css como --brand).
        // Uso: bg-brand, text-brand, ring-brand, border-brand, bg-brand/10, etc.
        brand: 'rgb(var(--brand) / <alpha-value>)',
        'brand-contrast': 'rgb(var(--brand-contrast) / <alpha-value>)',
      },
    },
  },
  plugins: [],
}

export default config
