# Phase 95 test plan

1. Reject unauthenticated requests and missing/inactive organization membership.
2. Reject tasks outside the selected organization.
3. Enforce assigned-worker or manager submission policy.
4. Same clientSubmissionId in one organization is idempotent; same ID in another organization does not reveal the first record.
5. Validate capture type, title, notes length and maximum evidence count.
6. Reject unsupported MIME types, malformed SHA-256, zero/oversized file sizes and invalid filenames.
7. Verify that no location is persisted unless locationConsent=true.
8. Validate latitude/longitude boundaries and malformed coordinates.
9. Only manager/supervisor roles can review submissions.
10. Review notes/status validation and organization-scoped lookup.
11. Simulate concurrent submissions with same clientSubmissionId and normalize duplicate-key response.
12. Test mobile offline retry flow once a frontend queue is added.
13. Security test actual file upload/storage integration before enabling binary evidence.
