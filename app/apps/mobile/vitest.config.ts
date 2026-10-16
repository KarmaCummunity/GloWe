import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Use the automatic JSX runtime so React-Testing-Library snapshot tests
  // (e.g. src/components/shell/__tests__/AppShell.snapshot.test.tsx) can
  // render components that don't `import React from 'react'` — without this,
  // esbuild defaults to the classic runtime and any transitively-rendered
  // component fails with "React is not defined".
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/__tests__/**/*.test.tsx'],
    environment: 'node',
    globals: false,
    server: {
      deps: {
        // react-native ships Flow syntax; route imports to react-native-web for tests
        inline: ['react-native'],
      },
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      // Mobile is mostly UI surfaces; there is no RNTL/jest infrastructure
      // here yet (tracked as TD-150). Limit coverage scope to the slices we
      // *do* unit-test (config/lib/store/hooks/services) and exclude raw UI
      // screens + composition wiring until TD-150 is closed.
      exclude: [
        'src/**/__tests__/**',
        'src/**/*.d.ts',
        // UI surfaces — covered (or not) via RNTL slice TD-150
        'src/components/**',
        'src/features/**',
        'src/navigation/**/*.tsx',
        'src/navigation/useShellTabBarVisibility.ts',
        // React-bound hooks need RNTL infra — out of scope until TD-150
        'src/hooks/**',
        // Localization bundles (string maps, no runtime branches)
        'src/i18n/**',
        // Composition roots — exercised end-to-end, not unit-tested
        'src/services/*Composition.ts',
        'src/services/devAutoSignIn.ts',
        'src/services/avatarUpload.ts',
        'src/services/imageUpload.ts',
        'src/services/mediaEncoding.ts',
        'src/services/postMessages.ts',
        'src/services/authMessages.ts',
        'src/services/postFormConfirm.ts',
        'src/services/hostPostSession.ts',
        // Zustand stores that are just facades over services
        'src/store/authStore.ts',
        'src/store/chatStore.ts',
        'src/store/chatStoreTypes.ts',
        'src/store/allStoresReset.ts',
        // Misc one-liners
        'src/utils/openExternalUrl.ts',
        'src/lib/container.ts',
        // Query-cache persistence wiring (singleton QueryClient + AsyncStorage
        // persister) — composition root, exercised end-to-end like container.ts
        'src/lib/queryPersist.ts',
        // Notification tap hook: IO wiring (expo-router/expo-notifications) — the
        // pure routing logic lives in tapRouting.ts and IS unit-tested.
        'src/lib/notifications/tapHandler.ts',
        'src/lib/permissionGate.ts',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
      reporter: ['text', 'json-summary', 'lcov'],
    },
  },
  resolve: {
    alias: {
      'react-native': 'react-native-web',
    },
  },
});
