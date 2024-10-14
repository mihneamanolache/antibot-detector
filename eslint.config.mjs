import path from 'path';
import { fileURLToPath } from 'url';

import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
});

export default tseslint.config(
  {
    ignores: ['*.config.*', 'dist', 'node_modules'],
  },
  js.configs.recommended,
  // TypeScript ESLint
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
  {
    rules: {
      "@typescript-eslint/ban-ts-comment": "error",
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/no-unnecessary-condition': [
        'error',
        {
          allowConstantLoopConditions: true,
        },
      ],
    },
  },

  {
    rules: {
      "multiline-comment-style": ["error", "starred-block"],
      "object-curly-spacing": ["error", "always"],
      "@typescript-eslint/prefer-optional-chain": "off",
      "@typescript-eslint/no-inferrable-types": "off",
      "quotes": ["error", "double"],
      "@typescript-eslint/typedef": [
        "error",
        {
          "parameter": true,
          "propertyDeclaration": true,
          "variableDeclaration": true,
          "memberVariableDeclaration": true
        }
      ],
      "@typescript-eslint/array-type": [
        "error",
        {
          "default": "generic",
          "readonly": "generic"
        }
      ],
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        {
          "allowExpressions": false,
          "allowTypedFunctionExpressions": false,
          "allowHigherOrderFunctions": false,
          "allowDirectConstAssertionInArrowFunctions": true,
          "allowConciseArrowFunctionExpressionsStartingWithVoid": true
        }
      ],

    }
  },

  comments.recommended,
  eslintConfigPrettier,
);
