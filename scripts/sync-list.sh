#!/usr/bin/env bash
# Generate the extension's synchronous list module from the canonical CC-BY JSON.
# The extension loads list-data.js at document_start (before content.js) so default rules
# apply flash-free. This keeps a single source of truth: lists/blaikhole-core.json.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
src="$root/lists/blaikhole-core.json"
dst="$root/extension/src/list-data.js"

# validate JSON first
python3 -c "import json,sys; json.load(open('$src'))" || { echo "invalid JSON: $src" >&2; exit 1; }

mkdir -p "$(dirname "$dst")"
{
  printf '// GENERATED from lists/blaikhole-core.json by scripts/sync-list.sh. Do not edit by hand.\n'
  printf 'window.__BLAIKHOLE_LIST__ = '
  cat "$src"
  printf ';\n'
} > "$dst"
echo "synced $src -> $dst"
