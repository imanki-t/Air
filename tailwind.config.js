module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      backgroundImage: {
        cat: "url('/cat-bg.jpg')"
      },
      fontFamily: {
        vintage: ['"Press Start 2P"', 'cursive'],
      }
    }
  },
  plugins: [],
}
