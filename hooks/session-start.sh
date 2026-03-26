#!/usr/bin/env bash
# SessionStart hook for SQLiteData skills plugin
# Detects SQLiteData projects and injects skill-first guidance.
# Avoiding 'set -euo pipefail' for robustness — hooks must not block startup.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

python3 - "$PLUGIN_ROOT" <<'PYTHON_SCRIPT'
import json, sys, os, subprocess

plugin_root = sys.argv[1]

# Detect if this is a SQLiteData project
def detect_sqlitedata():
    """Check if the working directory uses SQLiteData."""
    signals = []

    # Check Package.swift for sqlite-data dependency
    if os.path.isfile("Package.swift"):
        try:
            with open("Package.swift", "r") as f:
                content = f.read()
            if "sqlite-data" in content or "SQLiteData" in content:
                signals.append("Package.swift imports sqlite-data")
        except Exception:
            pass

    # Check for SQLiteData imports in Swift files
    try:
        result = subprocess.run(
            ["grep", "-rl", "import SQLiteData", "--include=*.swift", "."],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0 and result.stdout.strip():
            count = len(result.stdout.strip().split("\n"))
            signals.append(f"{count} file(s) import SQLiteData")
    except Exception:
        pass

    # Check for @Table macro usage
    try:
        result = subprocess.run(
            ["grep", "-rl", "@Table", "--include=*.swift", "."],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0 and result.stdout.strip():
            count = len(result.stdout.strip().split("\n"))
            signals.append(f"{count} file(s) use @Table")
    except Exception:
        pass

    return signals

signals = detect_sqlitedata()
project_type = "sqlitedata" if signals else "general"

# Build context
detection_line = ""
if signals:
    detection_line = f" Project detection: {'; '.join(signals)}."

additional_context = f"""You have SQLiteData skills installed.{detection_line}

Do NOT confuse SQLiteData with SwiftData — they are different libraries. See CLAUDE.md for skill routing."""

output = {
    "hookSpecificOutput": {
        "hookEventName": "SessionStart",
        "additionalContext": additional_context
    }
}

print(json.dumps(output, indent=2))
PYTHON_SCRIPT

exit 0
