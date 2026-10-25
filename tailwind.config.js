/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        tse: {
          blue: "#0c326f",
          yellow: "#f5a800",
          green: "#00823b",
          dark: "#0b1528",
          card: "#132238",
          border: "#1e3557"
        }
      }
    },
  },
  plugins: [],
}
