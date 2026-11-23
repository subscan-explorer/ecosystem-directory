#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Prefer the project's Node version when nvm is installed; never install silently.
node_bin="${NVM_DIR:-$HOME/.nvm}/versions/node/v24.22.1/bin"
if [[ -x "$node_bin/node" ]]; then
  export PATH="$node_bin:$PATH"
fi
exec node scripts/publish-local.mjs "$@"
