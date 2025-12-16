import { baseConfig, securityConfig, typeScriptConfig } from '@kitiumai/lint/eslint';

export default [
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', '.husky/', '**/*.d.ts'],
  },
  ...baseConfig,
  ...typeScriptConfig,
  securityConfig,
  {
    name: 'envkit/overrides',
    rules: {
      'security/detect-object-injection': 'off',
      'no-restricted-imports': 'off'
    },
  },
  {
    name: 'envkit/fs-path-overrides',
    files: ['src/cli.ts', 'src/config.ts', 'src/state.ts'],
    rules: {
      'security/detect-non-literal-fs-filename': 'off',
    },
  },
  {
    name: 'envkit/test-overrides',
    files: [
      'src/**/__tests__/**/*.{ts,tsx}',
      'src/**/*.{test,spec}.{ts,tsx}',
      'src/**/test/**/*.{ts,tsx}',
    ],
    rules: {
      'max-lines-per-function': 'off',
      'max-statements': 'off',
      'sonarjs/cognitive-complexity': 'off',
      'sonarjs/no-duplicate-string': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'security/detect-non-literal-fs-filename': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
];
