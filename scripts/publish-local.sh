#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Prefer the project's Node version when nvm is installed; never install silently.
if [[ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]]; then
  source "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
  nvm use --silent 24.22.1
fi
exec node scripts/publish-local.mjs "$@"
