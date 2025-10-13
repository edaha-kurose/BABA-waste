module.exports = {
  root: false, // Don't use as root to avoid conflicts with next-app
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'next-app', 'node_modules'],
  parser: '@typescript-eslint/parser',
  plugins: [],
  rules: {},
}
