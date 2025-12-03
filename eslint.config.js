import baseConfig from '@kitiumai/config/eslint.config.base.js';

export default [
  ...baseConfig,
  {
    rules: {
      // Allow flexible typing for CLI and configuration files
      '@typescript-eslint/no-explicit-any': 'off',
      // Allow flexible function return types for CLI actions
      '@typescript-eslint/explicit-function-return-type': 'off',
      // Allow relative imports in tests
      'no-restricted-imports': 'off',
      // Disable naming convention for eslint rule names
      '@typescript-eslint/naming-convention': 'off',
    },
  },
  {
    ignores: ['.prettierrc.cjs', 'lint-staged.config.cjs'],
  },
];
