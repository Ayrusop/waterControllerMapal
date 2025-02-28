/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'rgba(49,57,133,1)',
        primary1: 'rgba(49,57,133,1)',
        secondary: "rgba(49, 57, 133, 0.25)"  
      },
    },
  },
  plugins: [],
}

