#!/usr/bin/env bash
# UserPromptSubmit hook — detect SQLiteData-related questions and nudge toward skills.
# Returns additionalContext suggestions; never blocks.

P="$CLAUDE_USER_PROMPT"

# Exit early if prompt is empty or very short
[ ${#P} -lt 5 ] && exit 0

HINT=""

# Detect any SQLiteData-related question and point at the router
if echo "$P" | grep -qiE '\b(sqlitedata|sqlite.?data|@Table|@FetchAll|@FetchOne|@Fetch|SyncEngine|sync.?engine|CKSyncEngine|SyncMetadata|metadatabase|DatabaseMigrator|StructuredQueries|@Column|@Selection|FetchKeyRequest|prepareDependencies)\b'; then
  HINT="SQLiteData question detected — invoke /skill sqlitedata-swift for routing"
elif echo "$P" | grep -qiE '\b(DatabaseError|SQLITE_|constraint.*fail|blank.*database)\b'; then
  HINT="Possible SQLiteData error — invoke /skill sqlitedata-swift for routing"
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
