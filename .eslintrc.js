module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  plugins: ['@typescript-eslint', 'prettier'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  overrides: [
    {
      files: ['*.js'],
      parser: 'espree',
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/prefer-nullish-coalescing': 'off',
        '@typescript-eslint/prefer-optional-chain': 'off',
      },
    },
    {
      files: ['examples/**/*.ts', 'tests/**/*.ts'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
  rules: {
    'prettier/prettier': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'off', // Allow any for API flexibility
    '@typescript-eslint/explicit-function-return-type': 'off', // Let TypeScript infer
    '@typescript-eslint/no-non-null-assertion': 'warn', // Warn instead of error
    '@typescript-eslint/prefer-nullish-coalescing': 'warn', // Warn instead of error
    '@typescript-eslint/prefer-optional-chain': 'warn', // Warn instead of error
    'no-console': 'warn',
  },
  env: {
    node: true,
    es2020: true,
  },
};
