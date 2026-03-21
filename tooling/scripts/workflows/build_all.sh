#!/usr/bin/env bash

set -euo pipefail

ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
cd "$ROOT"

python3 tooling/scripts/dev/tasks.py check

echo "Build complete."
