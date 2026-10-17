# Coverage strategy (Sonar new-code gate)

**Gate:** SonarCloud Quality Gate requires **≥ 80% coverage on new code** (PR delta). Overall coverage is a health metric, not the merge gate.

## Baseline (2026-10-17, packages via `pnpm test:coverage`)

| Package | Statements | Branches | Lines |
| --- | --- | --- | --- |
| `@kc/domain` | 82.2% | 78.0% | 81.8% |
| `@kc/application` | 88.8% | 90.7% | 89.1% |
| `@kc/infrastructure-supabase` | 86.6% | 82.4% | 88.1% |
| `@kc/ui` | 90.6% | 74.5% | 92.6% |

Overall Sonar “coverage on overall code” historically read ~24.5% when UI screens / generated types were still in scope. Current `sonar.coverage.exclusions` keep the gate focused on testable packages (see `sonar-project.properties`).

## How agents hit 80% on new code

1. Prefer logic in `@kc/domain` / `@kc/application` / `infrastructure-supabase` adapters — each has vitest + fakes (`fake*Repository.ts`).
2. Add `__tests__/<Module>.test.ts` next to the module; mirror an existing neighbour test.
3. Run locally: `cd app && pnpm --filter @kc/<pkg> test:coverage`.
4. Do **not** put business rules only in Expo screens (`app/apps/mobile/app/**`) — those are coverage-excluded until RNTL (TD-150).
5. Generated / config / stories stay excluded (see Sonar `sonar.coverage.exclusions`).

## Exclusions (SSOT)

Configured in [`sonar-project.properties`](../../sonar-project.properties):

- Tests, `*.config.*`, `database.types.ts`, `**/*.d.ts`, barrel `index.ts`
- `app/scripts/**`, i18n locales, Expo routes / components / features / hooks / lib
- DI `*Composition.ts`, `devAutoSignIn.ts`, Storybook `**/*.stories.*`, `app.config.*`, `eas.json`
