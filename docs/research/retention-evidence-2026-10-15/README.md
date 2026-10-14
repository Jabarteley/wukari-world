# Retention acceptance evidence

This directory contains local evidence for the joined runtime at `899c60439022b2cb7082a1e88c930a3e4c41db36` (`899c`), based on the fetched agent-play integration at `c921b8d9`. The runtime changes are still uncommitted in this checkout. Hashes identify the archived artifacts; they do not establish a released source revision or production behaviour.

## Current joined evidence

- `allworld-main-sync-typecheck.txt` — joined source typecheck: five projects, zero TypeScript/Vue errors.
- `allworld-main-sync-focused.txt` — existing focused test run: 84 passed, 0 failed. These are local Node test fixtures, not production HTTP or browser evidence.
- `allworld-agent-play-accepted.txt` — existing agent-play compatibility suite: 74 passed, 0 failed. This is local server/Worker test coverage, not a production agent session.
- `allworld-main-sync-progression.txt` — deterministic direct-engine diagnostic. It covers both authored episode branches, callbacks, exact-once mementos, no-clock reconstruction, achievement display, travel, and completed views. It is not HTTP idempotency, persistence-I/O, browser, or production evidence.
- `allworld-main-sync-project-check.txt` — real local HTTP project proof: owner-role race dedupe, guest uniqueness exclusion, rollback, quiet fallback, once-only memento, and route authority.
- `allworld-main-sync-cadence-http-check.txt` — real local HTTP cadence proof: flag projection, enrollment rollback/retry, no-login credit, action stamping, opt-out, and rest/lapse transitions.
- `allworld-main-sync-season-check.txt` — real local HTTP season proof: enrollment/claim rollback/retry, meaningful-day gate, reminders, late join, archived claim, frozen window, and travel-preserved receipts. Canonical project receipts are seeded for isolated season eligibility.

The current joined build and browser reload passed; their dedicated final artifacts are being added. Final download-budget acceptance, production deployment, real cohort, and physical-phone acceptance remain pending. The HTTP probes use synthetic local actors and do not establish retention lift.

## Older evidence boundary

The pre-existing `allworld-integrated-*`, `allworld-progression-acceptance.txt`, registry, phone-art, baseline, and poll artifacts retain their original provenance. In particular, artifacts produced against the earlier `8ac05891` retention base must remain labelled `8ac` evidence and must not be presented as proof of the joined `899c`/`c921` runtime. Re-run relevant checks against the received source when a current acceptance claim depends on them.

All files are local copies from the originating host. A `/tmp` path is not portable evidence until its artifact is copied here and its manifest entry is checked.
