# Phase 97 secure evidence test plan

1. Unauthenticated upload/download is rejected.
2. Organization A cannot upload to or download evidence attached to organization B's capture.
3. Upload requires an existing capture within the selected organization.
4. Reject files over 15 MB, empty uploads, invalid signatures, unsupported types and MIME/signature mismatches.
5. Verify client-supplied filenames never control storage paths.
6. Verify random server filenames, restrictive file permissions, and storage outside public web roots.
7. Verify SHA-256 is stored and corruption/tampering is detected at download.
8. Verify maximum 10 files per capture and upload errors do not leave unreferenced files.
9. Test concurrent uploads to one capture for manifest update races.
10. Confirm responses use nosniff and private no-store headers.
11. Test path traversal and malformed evidence IDs.
12. Verify persistent volume, backup/restore and access permissions on target deployment.
13. Add malware scanner, quotas, retention/delete policy and upload audit logs before production.
14. Verify 413 response for Multer size limits and run API build plus database integration tests.
