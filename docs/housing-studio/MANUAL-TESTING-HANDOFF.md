# Housing manual-testing handoff

Historical stop checkpoint. The later direct instruction "integrate it yourself and deploy" resumes integration/release execution. Follow the current housing work record for release state; the incomplete manual checks below remain incomplete.

Automated tests, browser QA and monitoring are stopped under the coordination stop instruction. Do not restart test workers or schedule follow-ups. Preserve the running servers, isolated browser session and all tracked/untracked evidence. Housing is integrated locally, not adopted or deployed to production.

## Open the actual game

Local built game: http://127.0.0.1:4441/

If this browser has no local fixture login, first open http://127.0.0.1:4441/api/account/open-dev/operator, then return to the game link. This recovers the existing synthetic Operator only. Do not create a production guest.

Current fixture: Lagos, owned duplex,13 placed objects. The last automated position was the upper stair landing at(5.91,3.43,7.02); the walking key was released. The chair was deliberately moved/stored/restored through normal UI; it is back at its original(2,2,rot0,floor0), with canonical new instancef14 replacingf7. Bungalow and duplex upgrades were normal test commands; those costs and the higher tier are intentional synthetic-save changes.

Standalone review remains http://127.0.0.1:4435/housing-studio.html. It is separate from the actual game.

## Exact source and resources

- Checkout: /Users/anthonyakpan/.codex/worktrees/housing-studio-20261015/JoinAllworld
- Reviewed housing wiring: c9947af3c8ee0246e90899503cbcf6d5767481a5
- Tested product/source merge: f8bbaab7d6b7fefdde20d07c062b6bcd98752002
- Latest documentation commit: bf82de38497c98f75c95fde9b7cf2c3c228b0fbe; runtime paths unchanged.
- Built4441: session61052, canonical server/server.ts, same synthetic DATA_DIR /private/tmp/allworld-housing-game-20261015-p9gqt5wn/data,1000x local clock, outside services disabled. Earlier Vite10498 stopped; no other owner's process touched.
- Preserved standalone4435: session22501.
- Preserved independent headless session: Astra housing_visual_qa node_repl globals browser/context/page. Fresh local profile; no user Chrome/Incognito/CDP/native/production access. No PID recorded; do not guess or kill unrelated browser processes.

## Completed evidence

76/76 focused runtime checks, scoped strict TypeScript, full game build and all measurable unchanged download budgets passed. Shared scene host70,545/71,000 gzip bytes; startup220,828/223,000 gzip. Full local five-project TypeScript was incomplete because its test compiler exceeded the explicit3072MB cap; normal hosted full qualification remains open. See actual-game-candidate.md and /tmp/housing-final-* logs.

Actual isolated browser1440x1000/Chromium145/SwiftShader verified enrichedbq default third person; dev first-person enclosure and return; manual frontdoor open/close without travel; overview; canonical Buy selection/green ghost; chair move/store/return and reload persistence; built bq, bungalow, duplex; real stair ascent to upper landing. Last read console errors[]; no outside-origin requests. Built JavaScript SHA256 matches actual-game-build.json. Actual total GPU figures: bq third person33draws/9,104triangles; duplex overview32draws/10,796triangles. These totals do not independently separate scenery and characters. Headless results are not native/physical-device/hosted acceptance.

No confirmed runtime blocker. A Storage click timed out under the diagnostics overlay and reset the first automation kernel; the replacement isolated context restored the chair. A guest-toilet click missed after the avatar continued walking, so that attempt is not a door test pass or confirmed product failure.

## Remaining manual checks

1. In the duplex, walk downstairs and back upstairs in normal third person and built first person. Verify landings/collisions and room visibility.
2. Approach a room door, use the nearby door control orF, and check open/close clearance. From inside a closed private room, try going outside: expect blocked feedback, no travel. Reopen and verify ordinary exit/reentry.
3. Use the front-door control independently of going outside; verify the player stays in place.
4. Select furniture, use a TV/activity, move/store/place an item in Buy mode, change house appearance, and reload. Verify saved layout and avatar look stay consistent with intentional edits.
5. Phone → Houses → owned house: upgrade the same local fixture to villa, then check all floors, roof terrace, doors and furniture. No extra player is required.
6. Native browser/phone usability, frame rates and hosted flows remain unaccepted.

## Integration boundary

Existing integration owner Research Allworld game retention(01a13bea-138b-7b91-ac44-c49bc3d836ec) retains final source adoption, hosted fullCI, main and protected deployment. No new PR or competing deployment. Housing source is a candidate, not production ready. Current integration-owner test identities/cleanup are outside this local fixture and remain pending; housing performed no production cleanup SQL or real-save mutation.
