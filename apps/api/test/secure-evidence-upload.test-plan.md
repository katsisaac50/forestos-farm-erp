# Phase 73 test plan — run before deployment

1. Owner can upload a small valid PDF/PNG/JPEG for an existing case.
2. Missing case, missing file, missing evidence code, and duplicate evidence code are rejected.
3. File > 10 MiB is rejected by Multer before service execution.
4. Spoofed extension/MIME with unsupported magic bytes is rejected.
5. Evidence record stores SHA-256 and byte length matching an independent local calculation.
6. Stored bytes are not reachable through the web frontend/static server.
7. Authenticated owner download succeeds and matches original bytes.
8. Modify stored bytes: download is withheld; record is marked quarantined and event is created.
9. Missing storage file returns a not-found error and never returns bytes.
10. Non-owner/unauthenticated upload, history, quarantine, review, and download are rejected.
11. Restart API and confirm evidence persists on the configured durable volume.
12. Simulate Mongo failure after file creation and verify best-effort cleanup.
13. Test filenames with path separators, quotes, control characters, and Unicode.
14. Verify response includes `X-Content-Type-Options: nosniff` and `Cache-Control: no-store`.
