#!/usr/bin/env bash
#
# Direct-REST Gemini — use this instead of the `gemini` CLI in this sandbox.
#
# Why: the `gemini` CLI (v0.49.0) returns persistent 503 "experiencing high
# demand" / hangs here. Diagnosis: Gemini itself is reachable via direct REST,
# but the CLI routes the OAuth-style GEMINI_API_KEY (AQ.…, not an AIza… AI Studio
# key) through a Code-Assist/OAuth backend that 503s instead of the working
# generativelanguage ?key= path. So this wrapper hits REST directly (curl uses
# the egress proxy + CA) and, if the requested model is unavailable, automatically
# falls back to a reliable model.
#
# Model choice (verified 2026-06-29 against THIS key's generateContent, after the
# pipeline's "Gemini-3 on the shared key" HQ note):
#   - `gemini-3.1-pro-preview`  — strongest reasoning that ACTUALLY works for us;
#     default for independent reviews.
#   - `gemini-3.5-flash`        — fast/cheap, reliable; the fallback.
#   NOTE: `gemini-3-pro-preview` (the id the pipeline cited) is listed by models.list
#   on our key but **404s "no longer available" on generateContent** via this REST
#   path — use `gemini-3.1-pro-preview` instead. (The 2.5 line still works too.)
#   Deep Research agents (deep-research-*-preview) are NOT generateContent models —
#   they need the async /v1beta/interactions endpoint; not handled by this wrapper.
#
# Usage:
#   scripts/gemini.sh [model] < prompt.txt        # default model: gemini-3.1-pro-preview
#   printf '%s' "$PROMPT" | scripts/gemini.sh gemini-3.5-flash
#
# REST has no autonomous file-reading like the CLI, so assemble the context
# (file contents, diffs, token values, surrounding surfaces) INTO the prompt.
#
# Env: GEMINI_API_KEY (required), GEMINI_CA_BUNDLE (optional; defaults to the
# sandbox proxy CA so curl trusts the re-terminating egress proxy),
# GEMINI_FALLBACK_MODEL (optional; default gemini-3.5-flash; set empty to disable).
set -uo pipefail

model="${1:-gemini-3.1-pro-preview}"
fallback="${GEMINI_FALLBACK_MODEL-gemini-3.5-flash}"
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
    # Retry/fall back on overload (503/UNAVAILABLE) AND on a deprecated/missing
    # model (404/NOT_FOUND) — e.g. a model that models.list shows but that no
    # longer supports generateContent. Surface any other error verbatim.
    if ! printf '%s' "$resp" | jq -e '.error.code==503 or .error.status=="UNAVAILABLE" or .error.code==404 or .error.status=="NOT_FOUND"' >/dev/null 2>&1; then
      printf '%s' "$resp" | jq -r '.error // . | tostring' >&2
      return 1
    fi
    # A 404 won't recover on retry — break to the fallback immediately.
    if printf '%s' "$resp" | jq -e '.error.code==404 or .error.status=="NOT_FOUND"' >/dev/null 2>&1; then
      return 2
    fi
    sleep 3
  done
  return 2
}

if attempt "$model" 3; then
  exit 0
fi
if [ -n "$fallback" ] && [ "$fallback" != "$model" ]; then
  echo "gemini.sh: ${model} unavailable; falling back to ${fallback}" >&2
  attempt "$fallback" 3 && exit 0
fi
echo "gemini.sh: all attempts failed (model unavailable / overloaded)" >&2
exit 1
