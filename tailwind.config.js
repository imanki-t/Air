export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      backgroundImage: {
        cat: "url('./public/cat-bg.jpg')" // Updated path to be more specific
      },
      fontFamily: {
        vintage: ['"Press Start 2P"', 'cursive'],
      }
    }
  },
  plugins: [],
}
