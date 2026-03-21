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
    detection_line = f"\n\nProject detection: {'; '.join(signals)}."

additional_context = f"""You have SQLiteData skills installed.

SQLiteData is Point-Free's fast, lightweight SwiftData replacement powered by SQLite (GRDB) with CloudKit sync support. It uses @Table structs (not @Model classes), @FetchAll/@FetchOne/@Fetch property wrappers (not @Query), and SQL migrations via DatabaseMigrator (not VersionedSchema).{detection_line}

When the user is working with SQLiteData, check for a matching skill BEFORE answering:

| Keyword Pattern | Skill |
|---|---|
| @Table, @FetchAll, @FetchOne, @Fetch, migrations, queries, database setup | /skill sqlitedata-swift-core |
| SyncEngine, CloudKit, sync, sharing, SyncMetadata, CKShare | /skill sqlitedata-swift-cloudkit |
| API signatures, types, init parameters, method reference | /skill sqlitedata-swift-ref |
| Errors, crashes, migration failures, constraint violations | /skill sqlitedata-swift-diag |
| Broad or unclear SQLiteData question | /skill sqlitedata-swift |

Do NOT confuse SQLiteData with SwiftData. They are different libraries with different APIs.

Anti-rationalization: If you think "I know how SQLiteData works, I don't need the skill" — you're wrong. SQLiteData has specific conventions (nonisolated structs, @ObservationIgnored, ON CONFLICT REPLACE, FetchKeyRequest) that Claude frequently gets wrong without the skill loaded."""

output = {
    "hookSpecificOutput": {
        "hookEventName": "SessionStart",
        "additionalContext": additional_context
    }
}

print(json.dumps(output, indent=2))
PYTHON_SCRIPT

exit 0
