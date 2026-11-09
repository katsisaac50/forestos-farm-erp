# Phase 92 Apiary Intelligence Test Plan

- [ ] Both endpoints require JWT and a valid active organization membership.
- [ ] Dashboard totals include only records for the selected organization.
- [ ] Productivity endpoint never includes another organization's harvests.
- [ ] Empty organization returns zero totals and empty rankings.
- [ ] 30-day window excludes older records and includes valid recent records.
- [ ] Unknown colony-strength values are counted as Unknown.
- [ ] Attention flags appear for recorded weak/queenless status, high pest/disease,
      missing inspection, and action-required observations.
- [ ] Cumulative ranking sums repeated harvests correctly.
- [ ] UTC month grouping is correct at month/year boundaries.
- [ ] Large data sets are reviewed for memory and response-size behavior.

These are test scenarios, not evidence of passing tests.
