export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      backgroundImage: {
        cat: "url('/cat-bg.jpg')", // match your public image name
      },
      fontFamily: {
        vintage: ['"Press Start 2P"', 'cursive'], // default vintage
        crt: ['"VT323"', 'monospace'],            // for CRT access screen
      },
      animation: {
        retro: 'retro-fade 0.5s ease-out',
        'fade-out': 'fadeOut 0.5s ease-in forwards',
        flicker: 'flicker 1.5s infinite alternate',
      },
      keyframes: {
        'retro-fade': {
          '0%': { transform: 'scale(0.9)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
        fadeOut: {
          '0%': { opacity: 1 },
          '100%': { opacity: 0, visibility: 'hidden' },
        },
        flicker: {
          '0%': { opacity: '1' },
          '10%': { opacity: '0.95' },
          '20%': { opacity: '0.85' },
          '30%': { opacity: '0.75' },
          '40%': { opacity: '0.9' },
          '50%': { opacity: '0.6' },
          '60%': { opacity: '0.9' },
          '70%': { opacity: '0.75' },
          '80%': { opacity: '0.95' },
          '90%': { opacity: '0.85' },
          '100%': { opacity: '1' },
        }
      }
    }
  },
  plugins: [],
}
