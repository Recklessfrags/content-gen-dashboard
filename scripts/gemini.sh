#!/usr/bin/env bash
#
# Direct-REST Gemini — use this instead of the `gemini` CLI in this sandbox.
#
# Why: the `gemini` CLI (v0.49.0) returns persistent 503 "experiencing high
# demand" / hangs here. Diagnosis: Gemini itself is reachable via direct REST,
# but (1) the CLI routes the OAuth-style GEMINI_API_KEY (AQ.…, not an AIza… AI
# Studio key) through a Code-Assist/OAuth backend that 503s instead of the
# working generativelanguage ?key= path, AND (2) gemini-2.5-pro has REAL
# intermittent capacity 503s, while gemini-2.5-flash is reliably available.
# So this wrapper hits REST directly (curl uses the egress proxy + CA) and, if
# the requested model 503s, automatically falls back to a reliable model.
#
# Usage:
#   scripts/gemini.sh [model] < prompt.txt        # default model: gemini-2.5-pro
#   printf '%s' "$PROMPT" | scripts/gemini.sh gemini-2.5-flash
#
# REST has no autonomous file-reading like the CLI, so assemble the context
# (file contents, diffs, token values, surrounding surfaces) INTO the prompt.
#
# Env: GEMINI_API_KEY (required), GEMINI_CA_BUNDLE (optional; defaults to the
# sandbox proxy CA so curl trusts the re-terminating egress proxy),
# GEMINI_FALLBACK_MODEL (optional; default gemini-2.5-flash; set empty to disable).
set -uo pipefail

model="${1:-gemini-2.5-pro}"
fallback="${GEMINI_FALLBACK_MODEL-gemini-2.5-flash}"
ca="${GEMINI_CA_BUNDLE:-/root/.ccr/ca-bundle.crt}"

if [ -z "${GEMINI_API_KEY:-}" ]; then
  echo "gemini.sh: GEMINI_API_KEY is not set" >&2
  exit 2
fi

# Read the prompt once and reuse across attempts/fallback.
payload="$(jq -Rs '{contents:[{parts:[{text:.}]}]}')"

call() {
  local m="$1"
  local args=(-s --max-time 240 -H "Content-Type: application/json")
  [ -f "$ca" ] && args+=(--cacert "$ca")
  printf '%s' "$payload" | curl "${args[@]}" \
    -X POST "https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${GEMINI_API_KEY}" \
    -d @-
}

# Try the requested model with a couple of quick retries, then fall back.
attempt() {
  local m="$1" tries="$2" resp
  for ((i = 1; i <= tries; i++)); do
    resp="$(call "$m")"
    if printf '%s' "$resp" | jq -e '.candidates[0].content.parts[0].text' >/dev/null 2>&1; then
      printf '%s' "$resp" | jq -r '.candidates[0].content.parts[]?.text'
      return 0
    fi
    # Only retry/fall back on overload/unavailable; surface other errors verbatim.
    if ! printf '%s' "$resp" | jq -e '.error.code==503 or .error.status=="UNAVAILABLE"' >/dev/null 2>&1; then
      printf '%s' "$resp" | jq -r '.error // . | tostring' >&2
      return 1
    fi
    sleep 3
  done
  return 2
}

if attempt "$model" 3; then
  exit 0
fi
if [ -n "$fallback" ] && [ "$fallback" != "$model" ]; then
  echo "gemini.sh: ${model} unavailable (503); falling back to ${fallback}" >&2
  attempt "$fallback" 3 && exit 0
fi
echo "gemini.sh: all attempts failed (model overloaded)" >&2
exit 1
