# Capital spend concurrency test plan

Use a disposable MongoDB database and two concurrent requests.

1. Create an approved proposal of UGX 100,000.
2. Create two submitted spend records of UGX 70,000 each linked to that proposal.
3. Submit both verification requests concurrently.
4. Assert no more than one request succeeds, verified spend is no more than UGX 100,000, and the rejected request leaves its spend record submitted.
5. Retry verification on the successfully verified record; expect 409 Conflict and no second counter increment.
6. Reject a submitted spend record; assert the verified counter does not change.
7. For a legacy proposal missing `verifiedSpendUgx`, seed verified spend rows, trigger a verification, and assert the counter starts from the legacy verified total.
8. Compare the denormalised counter against `SUM(amountUgx)` for all verified spend records and investigate any mismatch.
9. Inject a failure between proposal counter increment and spend record save to demonstrate why a transaction/reconciliation repair job is still required.