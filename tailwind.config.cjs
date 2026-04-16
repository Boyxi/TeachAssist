module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EEF0FF",
          100: "#DCE1FF",
          500: "#081090",
          600: "#070E7F",
          700: "#050B66"
        },
        accent: {
          500: "#E67E22",
          600: "#CF6E1D"
        },
        surface: "#F8F9FA"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"]
      },
      boxShadow: {
        soft: "0 10px 30px rgba(0,0,0,0.06)"
      }
    }
  },
  plugins: []
};
