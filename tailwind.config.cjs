module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EEF3FB",
          100: "#D8E5F7",
          500: "#1B3A6B",
          600: "#16335F",
          700: "#122C53"
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
