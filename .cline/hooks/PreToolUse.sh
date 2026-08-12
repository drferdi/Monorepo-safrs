#!/usr/bin/env bash
# SAFRS PreToolUse hook — thin shell that pipes the event into the pinned
# Node bridge; every decision lives in tools/automation/src/guard.mjs.
set -uo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "${script_dir}/bridge.mjs"
