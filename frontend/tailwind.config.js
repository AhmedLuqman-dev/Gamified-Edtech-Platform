/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          ink: "#141922",
          coral: "#ff7043",
          mint: "#2fbf8f",
          ocean: "#2f7cf6",
          haze: "#f2f7ff"
        }
      },
      boxShadow: {
        boss: "0 0 0 2px rgba(255, 112, 67, 0.35), 0 18px 30px rgba(255, 112, 67, 0.22)",
        soft: "0 10px 30px rgba(20, 25, 34, 0.08)"
      },
      keyframes: {
        revealUp: {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        floatSlow: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" }
        }
      },
      animation: {
        revealUp: "revealUp 550ms ease-out both",
        floatSlow: "floatSlow 5s ease-in-out infinite"
      }
    }
  },
  plugins: []
};
