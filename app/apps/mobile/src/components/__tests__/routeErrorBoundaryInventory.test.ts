// Regression guard: the main route segments keep their own error boundary, so a
// render error in one screen does not take down the whole app shell. Audit P1-8.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const APP = join(__dirname, '..', '..', '..', 'app');
const SEGMENT_ROUTES = ['(tabs)/_layout.tsx', '(admin)/_layout.tsx', 'chat/index.tsx', 'chat/[id].tsx', 'post/[id].tsx'];
const EXPORTS_BOUNDARY = /export\s*\{\s*RouteErrorBoundary as ErrorBoundary\s*\}/;

describe('route error boundary inventory', () => {
  it.each(SEGMENT_ROUTES)('%s exports the shared route ErrorBoundary', (route) => {
    expect(readFileSync(join(APP, route), 'utf8')).toMatch(EXPORTS_BOUNDARY);
  });
});
