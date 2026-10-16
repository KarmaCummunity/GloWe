#!/usr/bin/env bash
# Export EXPO_ASC_* for EAS iOS credentials / submit (after ci-write-asc-key.sh).
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
key_path="${root}/asc-api-key.p8"

if [[ ! -f "$key_path" ]]; then
  echo "Missing $key_path — run scripts/ci-write-asc-key.sh first" >&2
  exit 1
fi

: "${ASC_KEY_ID:?ASC_KEY_ID is not set}"
: "${ASC_ISSUER_ID:?ASC_ISSUER_ID is not set}"

export EXPO_ASC_API_KEY_PATH="$key_path"
export EXPO_ASC_KEY_ID="$ASC_KEY_ID"
export EXPO_ASC_ISSUER_ID="$ASC_ISSUER_ID"
export EXPO_APPLE_TEAM_ID="${EXPO_APPLE_TEAM_ID:-}"
export EXPO_APPLE_TEAM_TYPE="${EXPO_APPLE_TEAM_TYPE:-COMPANY_OR_ORGANIZATION}"

echo "Exported EXPO_ASC_* for Apple Team ${EXPO_APPLE_TEAM_ID:-<unset>} (key ${EXPO_ASC_KEY_ID})"
