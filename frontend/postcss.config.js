// Tailwind and autoprefixer, declared where create-react-app's build looks for
// them. The inherited frontend had a tailwind config and no postcss config, so
// none of the directives in index.css were ever compiled.
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
