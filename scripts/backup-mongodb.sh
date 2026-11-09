#!/usr/bin/env bash
set -euo pipefail
: "${MONGODB_URI:?Set MONGODB_URI in the environment before running this script}"
BACKUP_ROOT="${FORESTOS_BACKUP_DIR:-./backups}"
RETENTION_DAYS="${FORESTOS_BACKUP_RETENTION_DAYS:-30}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEST="${BACKUP_ROOT}/forestos-${STAMP}"
mkdir -p "$BACKUP_ROOT"
umask 077
mkdir -p "$DEST"
echo "Creating MongoDB dump at: $DEST"
mongodump --uri="$MONGODB_URI" --archive="${DEST}/forestos.archive.gz" --gzip
if command -v sha256sum >/dev/null 2>&1; then sha256sum "${DEST}/forestos.archive.gz" > "${DEST}/SHA256SUMS"; fi
date -u +"%Y-%m-%dT%H:%M:%SZ" > "${DEST}/created-at-utc.txt"
echo "Backup created. Copy it to protected off-site storage and test restoration."
echo "Removing local backup directories older than ${RETENTION_DAYS} days."
find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -name 'forestos-*' -mtime "+${RETENTION_DAYS}" -print -exec rm -rf -- {} +
