import type { ConfigContext, ExpoConfig } from 'expo/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Marketing version — single source of truth: `app/VERSION` (FR-GLOWE-025 / D-181). */
function readAppVersion(): string {
  const versionPath = join(__dirname, '../../VERSION');
  return readFileSync(versionPath, 'utf8').trim();
}

function resolveGitCommitSha(): string {
  const sha =
    process.env.EAS_BUILD_GIT_COMMIT_HASH ??
    process.env.GITHUB_SHA ??
    process.env.EXPO_PUBLIC_GIT_COMMIT_SHA ??
    '';
  return sha.trim().slice(0, 7);
}

function applySentryBuildDefaults(): void {
  const token = process.env.SENTRY_AUTH_TOKEN?.trim();
  if (!token) {
    process.env.SENTRY_DISABLE_AUTO_UPLOAD = 'true';
    return;
  }
  delete process.env.SENTRY_DISABLE_AUTO_UPLOAD;
  if (!process.env.SENTRY_ORG?.trim()) {
    process.env.SENTRY_ORG = 'karma-community';
  }
}

// Static base lives in app.json (icons, plugins, native ids). This file injects
// version + build metadata only so EAS/Constants never drift from app/VERSION.
export default ({ config }: ConfigContext): ExpoConfig => {
  applySentryBuildDefaults();

  return {
    ...config,
    version: readAppVersion(),
    extra: {
      ...(config.extra ?? {}),
      gitCommitSha: resolveGitCommitSha(),
    },
  } as ExpoConfig;
};
