module.exports = {
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  useTabs: false,
  trailingComma: 'es5',
  bracketSpacing: true,
  jsxBracketSameLine: false,
  arrowParens: 'avoid',
  printWidth: 80,
  proseWrap: 'always',
  plugins: ['prettier-plugin-tailwindcss'],
}

//npx prettier --write "src/**/*.{js,jsx,ts,tsx}"
