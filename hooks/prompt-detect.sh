#!/usr/bin/env bash
# UserPromptSubmit hook — detect SQLiteData-related questions and nudge toward skills.
# Returns additionalContext suggestions; never blocks.

P="$CLAUDE_USER_PROMPT"

# Exit early if prompt is empty or very short
[ ${#P} -lt 5 ] && exit 0

HINT=""

# --- SQLiteData / general routing ---
if echo "$P" | grep -qiE '\b(sqlitedata|sqlite.?data|@Table|@FetchAll|@FetchOne|@Fetch)\b'; then
  HINT="SQLiteData question detected — use /sqlitedata-swift:ask for guided routing"
# --- SyncEngine / CloudKit ---
elif echo "$P" | grep -qiE '\b(SyncEngine|sync.?engine|CloudKit.*sync|CKSyncEngine|SyncMetadata|metadatabase)\b'; then
  HINT="SyncEngine/CloudKit question — try /skill sqlitedata-swift-cloudkit"
# --- Migration / schema ---
elif echo "$P" | grep -qiE '\b(DatabaseMigrator|migration|ALTER TABLE|no such column|no such table)\b.*\b(sqlite|grdb|sqlitedata)\b'; then
  HINT="Database migration question — try /skill sqlitedata-swift-core for migration patterns"
# --- Errors / debugging ---
elif echo "$P" | grep -qiE '\b(DatabaseError|SQLITE_|constraint.*fail|blank.*database|prepareDependencies)\b'; then
  HINT="SQLiteData error — try /skill sqlitedata-swift-diag for troubleshooting"
# --- StructuredQueries ---
elif echo "$P" | grep -qiE '\b(StructuredQueries|@Column|@Selection|#sql|FetchKeyRequest)\b'; then
  HINT="StructuredQueries question — try /skill sqlitedata-swift-core for query patterns"
fi

if [ -n "$HINT" ]; then
  cat <<ENDJSON
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "${HINT}"
  }
}
ENDJSON
fi

exit 0
