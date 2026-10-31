import { configDefaults, defineConfig } from 'vitest/config';

// Port contract suites (G39, {{ENG:port-contracts}}) run against a live Supabase stack and need its
// credentials; without them they are not collected, instead of being skipped
// inside the file. ci-backend exports the three variables from `supabase status`.
const hasStack = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']
  .every((name) => Boolean(process.env[name]));

export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    exclude: [...configDefaults.exclude, ...(hasStack ? [] : ['src/**/*.contract.integration.test.ts'])],
    environment: 'node',
    globals: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/__tests__/**', 'src/**/*.integration.test.ts'],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
      reporter: ['text', 'json-summary', 'lcov'],
    },
  },
});
