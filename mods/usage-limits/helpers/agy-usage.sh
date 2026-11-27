#!/bin/sh
# Prints Antigravity's quota limits (one JSON line from `agy -p "/usage"`) and exits.
#
# Runs your own `agy` CLI in non-interactive print mode for the read-only `/usage`
# slash command; the CLI authenticates itself. This script reads no tokens or
# credential files, sends no model prompt, spends no quota, and leaves no conversation.
#
# Exit: 0 = printed the reply, 127 = agy CLI not found, 1 = no reply in 20 s.
# Override the binary with HERDR_USAGE_AGY_BIN.

AGY=$(command -v "${HERDR_USAGE_AGY_BIN:-agy}" 2>/dev/null) || exit 127

dir=$(mktemp -d "${TMPDIR:-/tmp}/herdr-agy-usage.XXXXXX") || exit 1
out="$dir/out"

"$AGY" --output-format json -p "/usage" </dev/null >"$out" 2>/dev/null &
pid=$!

i=0
while [ "$i" -lt 100 ]; do
  if grep -q '"command":' "$out" 2>/dev/null; then break; fi
  kill -0 "$pid" 2>/dev/null || break
  sleep 0.2
  i=$((i + 1))
done
kill "$pid" 2>/dev/null
wait "$pid" 2>/dev/null

status=1
if grep -m1 '"command":' "$out"; then status=0; fi
rm -rf "$dir"
exit $status
