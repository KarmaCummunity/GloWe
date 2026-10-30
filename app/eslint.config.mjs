import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';

// ESLint v9 flat config for the Karma Community monorepo.
//
// First-pass policy: keep the rule wall friendly to existing code — most
// "code smell" rules (no-explicit-any, no-unused-vars, no-require-imports)
// run at `warn` so CI is not blocked. Tighten incrementally per package.
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.expo/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/build/**',
      'apps/mobile/expo-env.d.ts',
      'apps/mobile/public/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // eslint 10 promoted `no-useless-assignment` into js.recommended; keep it at
  // `warn` to match this repo's smell-as-warning policy (tighten incrementally).
  { rules: { 'no-useless-assignment': 'warn' } },
  // Node-environment TS packages: domain / application / infrastructure.
  {
    files: [
      'packages/domain/src/**/*.ts',
      'packages/application/src/**/*.ts',
      'packages/infrastructure-supabase/src/**/*.ts',
    ],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  // React Native + RN-web TSX packages: ui / mobile.
  {
    files: [
      'packages/ui/src/**/*.{ts,tsx}',
      'apps/mobile/src/**/*.{ts,tsx}',
      'apps/mobile/app/**/*.{ts,tsx}',
    ],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      // eslint-plugin-react-hooks v7's `recommended` enables the opinionated
      // React-Compiler rule set (set-state-in-effect, refs, use-memo) at error.
      // Keep the classic two rules; adopt the rest deliberately later (repo policy).
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/display-name': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // `require('./asset.png')` is the canonical RN/Expo asset pattern.
      // We don't ban it monorepo-wide; flag it at `warn` for visibility.
      '@typescript-eslint/no-require-imports': 'warn',
      'prefer-const': 'warn',
      // FR-SETTINGS-018 — importing a locale bundle directly hardcodes one
      // language, so the text ignores the active UI locale. Use
      // useTranslation()/t() or the useLocaleBundle()/localeBundle() accessor.
      // (The i18n internals that legitimately import the bundles are exempted
      // by the override block below.)
      'no-restricted-imports': [
        'error',
        {
          // Spec 17 §4 (D66) — text renders in the brand font only through @kc/ui.
          paths: [
            {
              name: 'react-native',
              importNames: ['Text', 'TextInput'],
              message: 'Import Text / TextInput from @kc/ui so text uses the brand font (spec 17 §4).',
            },
          ],
          patterns: [
            {
              group: [
                '**/i18n/locales/he',
                '**/i18n/locales/he/**',
                '**/i18n/locales/en',
                '**/i18n/locales/en/**',
              ],
              message:
                'Do not import locale bundles directly (text will not follow the active UI language, FR-SETTINGS-018). Use useTranslation()/t(), or useLocaleBundle()/localeBundle() from src/i18n/useLocaleBundle.',
            },
          ],
        },
      ],
    },
  },
  // The brand Text / TextInput wrap the react-native primitives.
  {
    files: ['packages/ui/src/components/BrandText.tsx'],
    rules: { 'no-restricted-imports': 'off' },
  },
  // i18n internals legitimately compose/select the raw locale bundles.
  {
    files: ['apps/mobile/src/i18n/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': 'off' },
  },
  // CommonJS config files (babel.config.js, metro.config.js, *.config.cjs).
  {
    files: [
      '**/*.config.{js,cjs}',
      'apps/mobile/babel.config.js',
      'apps/mobile/metro.config.js',
    ],
    languageOptions: {
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  // ESM config files (.mjs).
  {
    files: ['**/*.config.mjs', 'eslint.config.mjs', 'scripts/**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
      globals: globals.node,
    },
  },
  // Hono web-server (Node.js ESM, not a React-Native browser env).
  {
    files: ['apps/mobile/web-server/**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      'no-undef': 'off',
    },
  },
);
