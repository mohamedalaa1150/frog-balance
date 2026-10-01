import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex:
                '^(?!\\.\\./config(?:\\.ts)?$|\\./(?!\\.\\./)[^/]+(?:\\.ts)?$|zod$).+',
              message:
                'Core may import only sibling core modules, plain config, and zod; no Phaser/DOM/rendering dependencies.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportExpression',
          message: 'Core uses static pure imports only.',
        },
      ],
      'no-restricted-globals': [
        'error',
        'window',
        'document',
        'localStorage',
        'navigator',
      ],
    },
  },
  prettier,
);
