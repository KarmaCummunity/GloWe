#!/usr/bin/env bash
# Submit latest (or given) Android AAB to Google Play internal track.
set -euo pipefail

MAX_ATTEMPTS="${EAS_SUBMIT_ATTEMPTS:-3}"
LOG_FILE="${TMPDIR:-/tmp}/eas-submit-android-$$.log"
SUBMIT_PATH="${1:-}"

submit_once() {
  if [[ -n "$SUBMIT_PATH" ]]; then
    eas submit \
      --platform android \
      --profile production \
      --path "$SUBMIT_PATH" \
      --non-interactive \
      2>&1 | tee "$LOG_FILE"
  else
    eas submit \
      --platform android \
      --profile production \
      --latest \
      --non-interactive \
      2>&1 | tee "$LOG_FILE"
  fi
}

attempt=1
while [[ "$attempt" -le "$MAX_ATTEMPTS" ]]; do
  set +e
  submit_once
  exit_code=$?
  set -e

  if [[ "$exit_code" -eq 0 ]]; then
    echo "Play internal submission scheduled (attempt ${attempt})."
    exit 0
  fi

  if grep -qE "https://expo.dev/.*/submissions/" "$LOG_FILE"; then
    echo "Submission accepted by Expo despite exit ${exit_code}; continuing."
    exit 0
  fi

  if [[ "$attempt" -eq "$MAX_ATTEMPTS" ]]; then
    echo "eas submit (Android) failed after ${MAX_ATTEMPTS} attempts." >&2
    exit "$exit_code"
  fi

  echo "eas submit attempt ${attempt} failed; retrying..."
  sleep $((attempt * 15))
  attempt=$((attempt + 1))
done
