// Writes a one-line pass/fail summary of the Playwright JSON report to the job summary.
import { appendFileSync, existsSync, readFileSync } from 'node:fs';

const file = 'test-results/results.json';
if (existsSync(file)) {
  const s = JSON.parse(readFileSync(file, 'utf8')).stats ?? {};
  const line = `E2E dev: ${s.expected ?? 0} passed, ${s.unexpected ?? 0} failed, ${s.flaky ?? 0} flaky, ${s.skipped ?? 0} skipped`;
  console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### ${line}\n`);
}
