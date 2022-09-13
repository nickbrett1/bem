module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ['plugin:react/recommended', 'airbnb'],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['react', 'ejs', '@emotion'],
  rules: {
    'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    'implicit-arrow-linebreak': 'off',
    'react/no-unknown-property': ['error', { ignore: ['css'] }],
  },
};
