#!/usr/bin/env bash
#
# Direct-REST Gemini — use this instead of the `gemini` CLI in this sandbox.
#
# Why: the `gemini` CLI (v0.49.0) returns persistent 503 "experiencing high
# demand" / hangs here, regardless of model. Diagnosis showed Gemini itself is
# fine — direct REST returns HTTP 200 on models.list, gemini-2.5-flash and
# gemini-2.5-pro (generateContent AND streamGenerateContent), "standard" tier,
# with the same key. The CLI is the broken link: GEMINI_API_KEY in this sandbox
# is an OAuth-style token (AQ.…, not an AIza… AI Studio key), and the CLI routes
# it through the Code-Assist/OAuth backend that 503s, instead of the working
# generativelanguage ?key= path. curl (which correctly uses the egress proxy +
# CA bundle) hits the working path directly.
#
# Usage:
#   scripts/gemini.sh [model] < prompt.txt        # default model: gemini-2.5-pro
#   printf '%s' "$PROMPT" | scripts/gemini.sh gemini-2.5-flash
#
# REST has no autonomous file-reading like the CLI, so assemble the context
# (file contents, diffs) INTO the prompt you pipe in.
#
# Env: GEMINI_API_KEY (required), GEMINI_CA_BUNDLE (optional, defaults to the
# sandbox proxy CA so curl trusts the re-terminating egress proxy).
set -euo pipefail

model="${1:-gemini-2.5-pro}"
ca="${GEMINI_CA_BUNDLE:-/root/.ccr/ca-bundle.crt}"

if [ -z "${GEMINI_API_KEY:-}" ]; then
  echo "gemini.sh: GEMINI_API_KEY is not set" >&2
  exit 2
fi

curl_args=(-s --max-time 240 -H "Content-Type: application/json")
[ -f "$ca" ] && curl_args+=(--cacert "$ca")

jq -Rs '{contents:[{parts:[{text:.}]}]}' \
| curl "${curl_args[@]}" \
    -X POST "https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}" \
    -d @- \
| jq -r '.candidates[0].content.parts[]?.text // (.error|tostring)'
