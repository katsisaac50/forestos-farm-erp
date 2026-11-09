#!/usr/bin/env bash
set -euo pipefail
: "${RESTORE_MONGODB_URI:?Set RESTORE_MONGODB_URI to a dedicated isolated test database}"
ARCHIVE="${1:-}"
if [[ -z "$ARCHIVE" || ! -f "$ARCHIVE" ]]; then
  echo "Usage: RESTORE_MONGODB_URI='mongodb://...' ./scripts/restore-mongodb.sh /path/to/forestos.archive.gz" >&2
  exit 2
fi
if [[ "${CONFIRM_ISOLATED_RESTORE:-}" != "YES" ]]; then
  echo "Refusing to restore. Set CONFIRM_ISOLATED_RESTORE=YES only after verifying this is an isolated test database." >&2
  exit 3
fi
echo "Restoring to isolated test database. Existing data in the target database may be overwritten."
mongorestore --uri="$RESTORE_MONGODB_URI" --archive="$ARCHIVE" --gzip --drop
echo "Restore command completed. Verify application records and document the drill result."
