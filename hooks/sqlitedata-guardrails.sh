#!/usr/bin/env bash
# PostToolUse hook for Write|Edit — check SQLiteData-specific guardrails on Swift files.
# Returns additionalContext warnings; never blocks.

TOOL_INPUT="$CLAUDE_TOOL_INPUT"
FILE_PATH=""

# Extract file_path from tool input JSON
if command -v python3 &>/dev/null; then
  FILE_PATH=$(echo "$TOOL_INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('file_path',''))" 2>/dev/null)
fi

# Only check Swift files
[[ "$FILE_PATH" != *.swift ]] && exit 0
[ ! -f "$FILE_PATH" ] && exit 0

# Only check files that import SQLiteData
grep -q "import SQLiteData" "$FILE_PATH" 2>/dev/null || exit 0

HINTS=""

# --- CRITICAL: NOT NULL without default in migration ---
if grep -qE "\.notNull\(\)|NOT NULL" "$FILE_PATH" 2>/dev/null; then
  if ! grep -qE "\.defaults\(to:|DEFAULT " "$FILE_PATH" 2>/dev/null; then
    HINTS="${HINTS}WARNING: NOT NULL column without DEFAULT detected. This will crash on existing devices during migration. Add a default value.\n"
  fi
fi

# --- CRITICAL: UNIQUE constraint on synced table ---
if grep -qE "\.unique\(\)|UNIQUE" "$FILE_PATH" 2>/dev/null; then
  if grep -qE "SyncEngine|CloudKit|sync" "$FILE_PATH" 2>/dev/null; then
    HINTS="${HINTS}WARNING: UNIQUE constraint on a CloudKit-synced table. SyncEngine uses ON CONFLICT REPLACE — UNIQUE constraints cause silent data loss. Remove the constraint.\n"
  fi
fi

# --- WARNING: Missing @ObservationIgnored on fetch wrappers ---
if grep -qE "@Observable" "$FILE_PATH" 2>/dev/null; then
  if grep -qE "@FetchAll|@FetchOne|@Fetch" "$FILE_PATH" 2>/dev/null; then
    if ! grep -qE "@ObservationIgnored" "$FILE_PATH" 2>/dev/null; then
      HINTS="${HINTS}WARNING: @FetchAll/@FetchOne/@Fetch in @Observable class without @ObservationIgnored. This causes double observation. Add @ObservationIgnored before the property wrapper.\n"
    fi
  fi
fi

# --- WARNING: Missing nonisolated on @Table ---
if grep -qE "@Table" "$FILE_PATH" 2>/dev/null; then
  if ! grep -qE "nonisolated" "$FILE_PATH" 2>/dev/null; then
    HINTS="${HINTS}NOTE: @Table struct may need 'nonisolated' annotation for Swift 6 strict concurrency.\n"
  fi
fi

if [ -n "$HINTS" ]; then
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
