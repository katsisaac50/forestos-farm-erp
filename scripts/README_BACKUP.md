# ForestOS backup scripts

Optional operator-run examples. Install MongoDB Database Tools (`mongodump`, `mongorestore`) first.

## Create a database backup
```bash
export MONGODB_URI='mongodb://...'
export FORESTOS_BACKUP_DIR='/protected/local/path'
export FORESTOS_BACKUP_RETENTION_DAYS=30
./scripts/backup-mongodb.sh
```
Creates a compressed archive and SHA-256 checksum when available. It does not encrypt or upload off-site. Configure secure storage and encryption for your environment.

## Restore to an isolated test database
```bash
export RESTORE_MONGODB_URI='mongodb://.../forestos_restore_test'
export CONFIRM_ISOLATED_RESTORE=YES
./scripts/restore-mongodb.sh /path/to/forestos.archive.gz
```
**Safety:** `mongorestore --drop` can delete collections in the target database. Never point this command at production. Inspect the target URI and confirm the database is disposable before setting the confirmation variable.

This backs up MongoDB only, not uploaded files, environment secrets, certificates, or external storage. Back those up separately. Never commit credentials or backup archives to source control.
