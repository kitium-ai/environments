import {
  baseConfig,
  securityConfig,
  typeScriptConfig,
} from "@kitiumai/lint/eslint";

export const eslintConfig = [
  {
    ignores: [
      "dist/",
      "node_modules/",
      "coverage/",
      ".husky/",
      "**/*.d.ts",
      "lint-staged.config.cjs",
      ".prettierrc.cjs",
      ".editorconfig",
      "vitest.config.ts",
      "vitest.logger.mock.ts",
    ],
  },
  ...baseConfig,
  ...typeScriptConfig,
  securityConfig,
  {
    name: "envkit/overrides",
    rules: {
      "security/detect-object-injection": "off",
      "no-restricted-imports": "off",
      "@typescript-eslint/naming-convention": "off", // Disabled due to parser config issues
    },
  },
  {
    name: "envkit/overrides",
    rules: {
      "security/detect-object-injection": "off",
      "no-restricted-imports": "off",
      // '@typescript-eslint/naming-convention': 'off', // Temporarily disabled due to parser config issues

      // Expand naming rules for constants and quoted keys (e.g. hook maps).
      // '@typescript-eslint/naming-convention': [
      //   'error',
      //   {
      //     selector: 'default',
      //     format: ['camelCase', 'PascalCase'],
      //     leadingUnderscore: 'allow',
      //     trailingUnderscore: 'allow',
      //   },
      //   {
      //     selector: 'typeLike',
      //     format: ['PascalCase'],
      //   },
      //   {
      //     selector: 'enumMember',
      //     format: ['UPPER_CASE'],
      //   },
      //   {
      //     selector: 'variable',
      //     types: ['boolean'],
      //     format: ['PascalCase'],
      //     prefix: ['is', 'has', 'can', 'should', 'will', 'did'],
      //   },
      //   {
      //     selector: 'parameter',
      //     format: ['camelCase', 'PascalCase'],
      //     leadingUnderscore: 'allow',
      //     trailingUnderscore: 'allow',
      //   },
      //   {
      //     selector: 'variable',
      //     modifiers: ['const'],
      //     format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
      //     leadingUnderscore: 'allow',
      //     trailingUnderscore: 'allow',
      //   },
      //   {
      //     selector: 'objectLiteralProperty',
      //     format: ['PascalCase', 'camelCase', 'UPPER_CASE'],
      //     leadingUnderscore: 'allow',
      //     trailingUnderscore: 'allow',
      //   },
      //   {
      //     selector: 'typeProperty',
      //     format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
      //     leadingUnderscore: 'allow',
      //     trailingUnderscore: 'allow',
      //   },
      //   {
      //     selector: ['objectLiteralProperty', 'typeProperty'],
      //     modifiers: ['requiresQuotes'],
      //     format: null,
      //   },
      //   {
      //     selector: 'typeMethod',
      //     modifiers: ['requiresQuotes'],
      //     format: null,
      //   },
      // ],
    },
  },
  {
    name: "envkit/fs-path-overrides",
    files: [
      "src/cli.ts",
      "src/config.ts",
      "src/state.ts",
      "src/application/commands/handlers/**/*.{ts,tsx}",
      "src/infrastructure/storage/**/*.{ts,tsx}",
    ],
    rules: {
      "security/detect-non-literal-fs-filename": "off",
    },
  },
  {
    name: "envkit/test-overrides",
    files: [
      "src/**/__tests__/**/*.{ts,tsx}",
      "src/**/*.{test,spec}.{ts,tsx}",
      "src/**/test/**/*.{ts,tsx}",
    ],
    rules: {
      "max-lines-per-function": "off",
      "max-statements": "off",
      "sonarjs/cognitive-complexity": "off",
      "sonarjs/no-duplicate-string": "off",
      "unicorn/prevent-abbreviations": "off",
      "security/detect-non-literal-fs-filename": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
    },
  },
];

// eslint-disable-next-line import/no-default-export
export default eslintConfig;
