// tailwind.config.js
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      backgroundImage: {
        cat: "url('/cat-bg.jpg')" // match the image file name exactly
      },
      fontFamily: {
        vintage: ['"Press Start 2P"', 'cursive']
      }
    }
  },
  plugins: [],
}
