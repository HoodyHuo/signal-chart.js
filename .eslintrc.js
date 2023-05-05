// .eslintrc
module.exports = {
  plugins: ['prettier'], // prettier 一定要是最后一个，才能确保覆盖
  rules: {
    'prettier/prettier': 'error',
  },
  extends: ['plugin:prettier/recommended'],
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  ignorePatterns: ['!.lintstagedrc.js'],
}
