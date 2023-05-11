// .eslintrc
module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['prettier'],
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  rules: {
    'prettier/prettier': 'error',
  },
  ignorePatterns: ['!.lintstagedrc.js', '!.eslintrc.js'],

  // plugins: ['@typescript-eslint/eslint-plugin','prettier'], // prettier 一定要是最后一个，才能确保覆盖
  // rules: {
  //   'prettier/prettier': 'error',
  // },
  // extends: ['plugin:prettier/recommended'],
  // parserOptions: {
  //   parser: '@typescript-eslint/parser',
  //   ecmaVersion: 'latest',
  //   sourceType: 'module',
  // },
  // ignorePatterns: ['!.lintstagedrc.js'],
}
