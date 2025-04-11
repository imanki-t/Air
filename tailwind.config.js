export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      backgroundImage: {
        cat: "url('/cat-bg.jpg')" // match your public image name
      },
      fontFamily: {
        vintage: ['"Press Start 2P"', 'cursive'],     // default vintage
        crt: ['"VT323"', 'monospace'],                // for CRT access screen
      },
      animation: {
        retro: 'retro-fade 0.5s ease-out',
      },
      keyframes: {
        'retro-fade': {
          '0%': { transform: 'scale(0.9)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        }
      }
    }
  },
  plugins: [],
}
