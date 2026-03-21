#!/usr/bin/env bash
# PostToolUse hook for Bash — pattern-match SQLiteData errors and nudge toward skills.
# Returns additionalContext suggestions; never blocks.

O="$CLAUDE_TOOL_OUTPUT"

# Exit early if output is empty or very short
[ ${#O} -lt 10 ] && exit 0

HINTS=""

# --- Migration / schema errors ---
if echo "$O" | grep -qE "no such table:|no such column:|FOREIGN KEY constraint|NOT NULL constraint|UNIQUE constraint|database is locked|ALTER TABLE"; then
  HINTS="${HINTS}Database schema or migration error detected. Use /skill sqlitedata-swift-diag for systematic diagnosis.\n"
fi

# --- CloudKit / SyncEngine errors ---
if echo "$O" | grep -qE "CKError|CKRecord.*error|SyncEngine.*error|write-permission-error|invalid-record-name|limitExceeded|batchRequestFailed|co\.pointfree\.SQLiteData\.CloudKit"; then
  HINTS="${HINTS}CloudKit sync error detected. Use /skill sqlitedata-swift-cloudkit for SyncEngine patterns, or /skill sqlitedata-swift-diag §3 for sync troubleshooting.\n"
fi

# --- SQLiteData-specific patterns ---
if echo "$O" | grep -qE "blank.*in-memory database|A blank.*database is being used"; then
  HINTS="${HINTS}prepareDependencies not called or called too late. Use /skill sqlitedata-swift-diag §4 for setup issues.\n"
fi

# --- @Table / StructuredQueries compilation errors ---
if echo "$O" | grep -qE "Cannot find type.*Table|Cannot find.*FetchAll|Cannot find.*FetchOne|Referencing static method.*buildExpression"; then
  HINTS="${HINTS}StructuredQueries macro error. Use /skill sqlitedata-swift-core §1-2 for @Table and @Selection patterns.\n"
fi

# --- Concurrency warnings on Table structs ---
if echo "$O" | grep -qE "actor-isolated.*Table|Sendable.*Table|nonisolated.*required"; then
  HINTS="${HINTS}@Table struct needs 'nonisolated' annotation. Use /skill sqlitedata-swift-core §1.\n"
fi

# --- GRDB-level errors ---
if echo "$O" | grep -qE "DatabaseError|SQLite error [0-9]|SQLITE_"; then
  HINTS="${HINTS}SQLite/GRDB runtime error. Use /skill sqlitedata-swift-diag §2 for runtime database errors.\n"
fi

# --- Observation double-fire ---
if echo "$O" | grep -qE "ObservationIgnored|double.*observation|observation.*redundant"; then
  HINTS="${HINTS}Missing @ObservationIgnored on fetch wrapper in @Observable class. Use /skill sqlitedata-swift-core §17.\n"
fi

# Output hints if any
if [ -n "$HINTS" ]; then
  # Escape for JSON
  ESCAPED=$(echo -e "$HINTS" | sed 's/"/\\"/g' | tr '\n' ' ')
  cat <<ENDJSON
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "${ESCAPED}"
  }
}
ENDJSON
fi

exit 0
