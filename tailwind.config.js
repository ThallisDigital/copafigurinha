/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'brand-blue': '#0a2a6c',
        'brand-yellow': '#FFD60A',
        'brand-green': '#006847',
      },
      fontFamily: {
        head: ['Impact', 'Anton', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
