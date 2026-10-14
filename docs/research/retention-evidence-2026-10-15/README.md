# Retention acceptance evidence

Local diagnostic and existing-test output captured on 14–15 October 2026, using detached online-main base `8ac05891c117ed32f1629757d60893f0e543095e` plus uncommitted retention work. Hashes identify these log artifacts, not a released source revision. See [the current work record](../../agent-work/retention-20261014.md) for the latest result and source ownership.

- `allworld-integrated-{project,cadence,season}.txt`: local HTTP probes using synthetic local actors. These verify authority, retries, rollback and durable state. Season probes seed canonical keepsake receipts; they do not prove a complete human playthrough.
- `allworld-progression-acceptance.txt`: direct engine diagnostic covering both stories, Help/Work callbacks and solo endings, repeat finish, permanent records, no-clock reconstruction, achievement display and travel. It supplies events and locations to exercise the state machine; it is not browser/API completion evidence. Original disposable script: `/tmp/allworld-progression-acceptance.ts` on the originating host.
- `allworld-poll-focused-tests.txt`: existing `server/trust.test.ts` and `server/failed-write.test.ts`, 20 passes after the quiet-poll correction.
- `allworld-registry-final.txt`: existing `server/registry.test.ts`, 13 passes.
- `allworld-phone-art-final.txt`: focused existing artwork assertion after the Gist/Passport aliases.
- `allworld-main-baseline-regressions.txt`: exact clean-main comparison, three reproduced Node failures and passing quiet-poll case.
- `allworld-main-baseline-edge.txt`: exact clean-main comparison, four reproduced Durable Object eviction failures.

These logs preceded the final browser loading repair. Re-run relevant checks against the received source before integration. Browser proof is in [the UI evidence directory](../retention-ui-evidence-2026-10-14/). All results are local; none establish production release or retention lift.
