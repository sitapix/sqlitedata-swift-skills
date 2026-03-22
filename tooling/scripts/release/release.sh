#!/bin/sh

# Usage: python3 tooling/scripts/dev/tasks.py release -- 1.1.0
#        or directly: bash tooling/scripts/release/release.sh 1.1.0

set -eu

VERSION="${1:-}"

if [ -z "$VERSION" ]; then
  echo "Usage: bash tooling/scripts/release/release.sh X.Y.Z"
  echo ""
  CURRENT=$(python3 -c "import json; print(json.load(open('.claude-plugin/plugin.json'))['version'])")
  echo "Current version: $CURRENT"
  exit 1
fi

echo "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$' || {
  echo "ERROR: version must be X.Y.Z format"
  exit 1
}

ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"

echo "=== Releasing SQLiteData Skills v${VERSION} ==="
echo ""

echo "1. Bumping version..."
python3 tooling/scripts/release/set_version.py "$VERSION"
echo ""

echo "2. Rebuilding derived files..."
node scripts/build-agents.mjs
echo ""

echo "3. Running full validation..."
python3 tooling/scripts/dev/tasks.py check
echo ""

echo "4. Committing..."
git add -A
git commit -m "version ${VERSION}"
echo ""

echo "5. Tagging..."
git tag "v${VERSION}"
git tag "mcp-v${VERSION}"
echo ""

echo "6. Pushing..."
git push origin main "v${VERSION}" "mcp-v${VERSION}"
echo ""

echo "=== Released SQLiteData Skills v${VERSION} ==="
echo ""
echo "CI will now:"
echo "  - Validate (validate.yml)"
echo "  - Publish MCP to npm (publish-mcp.yml)"
