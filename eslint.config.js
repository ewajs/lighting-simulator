import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

const appsImport = {
  group: ['**/apps/**', '@lighting-sim/demo'],
  message: 'packages/ must not import from apps/ (ADR 0006).',
};

export default defineConfig(
  { ignores: ['**/dist/**', 'packages/ui/src/generated/**'] },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  { files: ['**/*.js'], extends: [tseslint.configs.disableTypeChecked] },

  // Dependency direction: demo → ui → core (ADR 0006).
  {
    files: ['packages/core/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            appsImport,
            {
              group: ['@lighting-sim/ui', '@lighting-sim/ui/*', '**/packages/ui/**'],
              message: 'core must not import ui (ADR 0006).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/ui/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: [appsImport] }] },
  },

  prettier,
);
