# Phase 81 test plan
- GET provider-health with missing, malformed, HTTPS and localhost HTTP endpoint configurations.
- Ensure endpoint never makes outbound network calls.
- POST replay: missing/short/oversized reason; unknown event; queued/sent/logged-only event; failed event.
- Verify conditional update prevents duplicate simultaneous replay transitions.
- Verify `manualReplayCount`, `lastReplayReason`, `lastReplayedBy`, `lastReplayedAt`.
- Verify route is owner-only and delivery worker subsequently handles queued events.
- Build API and web app; run MongoDB integration tests in a disposable database.
