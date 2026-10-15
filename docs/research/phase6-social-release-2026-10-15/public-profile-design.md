# Phase 6 public character accomplishments

Design source: `codex/retention-main-sync`, parent-provided base `5181c91a8274f0616b5cb6740971598fd97814ad`, inspected 2026-10-15. This is a source-backed implementation contract, not runtime acceptance. Parent owns integration and deployment. No new tests are proposed.

## Product decision

Expose one character's earned achievements and completed story/project/collection history through its existing public ID. Listed characters are visible; the existing civic `directory: true` opt-out hides the entire public profile. A visitor can read a shared profile without creating a character. Character identity must explicitly say **Human character** or **Agent character**. A human character played through a delegated key remains human; individual accomplishment origins still state delegated assistance.

Public history means earned game accomplishments. It does not mean the private My Life view, activity/event logs, unfinished story choices, current location, conversations, relationships or resident/agent memory. A new account, permission system, profile database, custom biography editor and extra public map coordinates are unnecessary.

Use the established directory default (missing preference = listed), not an inferred new opt-in. Explain next to the owner Share control: “Your public profile shows earned achievements and completed stories. Hide it through Neighbours.” Update Neighbours explanatory copy to explicitly include the public profile in the existing hide effect. Preserve the existing toggle labels to avoid needless existing-test churn. A hidden owner can still read private My Life, but the public endpoint remains unavailable even to self; this makes the shared result honest.

## Current seams and source evidence

- `server/types.ts`: `SessionRecord.publicId` is the only externally exposed character identity; `agent.char` permanently distinguishes an agent character from transient delegated play. Sessions also contain secrets, account IDs, legacy lives and salts; never spread a session or city record into this response.
- `server/character.ts:characterCity`: selects the canonical active character life. Travel moves that same life; `legacyLives` are separate recoverable lives, not history to merge.
- `server/civic/data.ts`, `server/types.ts:CivicCollection`: `prefs[id].directory === true` means hidden, absence means listed. The preference follows the person across cities.
- `server/social/service.ts:profile`: existing authenticated person response includes relationship context and whereabouts, calls mutable `enter`, and is not a public projection. Its `blockedEither` condition is the relevant in-game boundary, but the new reader must inspect existing data without creating/touching social records.
- `server/agents/service.ts:profile`: existing `/agents/<slug>` exposes its legacy agent league figures, current city and recent public activity. Do not reuse that payload for the new profile. Keep those old URLs working; new accomplishment sharing uses the same public-ID URL as humans.
- `src/app/scene/MapWorld.vue`: single People pin and neighbour selection already open `person`; `PersonApp.vue` selects `PlayerCard.vue`. `PeopleApp.vue` and `WorldLgaPanel.vue` also open this card. Add accomplishments there, without changing map/live-friend payloads or granting strangers friend locations.
- `src/map3d/people.ts`: non-friend venue counts deliberately carry no IDs; do not turn anonymous counts into discoverable people.
- `src/types/achievements.ts`, `episodes.ts`, `projects.ts`: permanent earned receipts are distinct from progress/proof/history records. `src/game/journeys.ts` validates receipt membership and preserves earned legacy collections. Its raw result includes unearned/current-city collections, so filter complete collections and project a safe subset.
- `server/residents/life.ts`: `resident.<city>.<key>` identities are authored simulation residents, not UUID-backed player sessions. Their private `story`/memory includes family, faith and private goals. They have no player achievement ledger. Do not impersonate a human or invent achievements. Preserve current resident/NPC interactions, and explicitly render “AI resident — no earned accomplishment records are available” on these cards. Do not silently omit the requested profile feature. `NpcCard.vue` needs this honest empty state; non-UUID resident/house-agent identities reaching `PlayerCard.vue` need it too, independent of the ordinary UUID social request result. These actors have no shareable accomplishment profile yet, so explain that state instead of offering a broken /p URL. Agent-character support in this finite release means actual user-created/claimable agent characters with persistent lives. Broader resident accomplishment design would be a separate product feature, not a blocker for these profiles.
- `server/types.ts:PageHandler`: HTML page hooks intentionally have no cookies. `deploy/cloudflare-worker.ts:PAGE_PREFIXES` currently includes `/s/`, `/e/`, `/shop/`, `/agents/`, so `/p/` must be added explicitly. Node already dispatches registered prefix handlers.

## Minimal shared contract

New `src/types/public-profile.ts`, included in `HttpRoutes` and `HTTP_ROUTE_KEYS` in `src/types/protocol.ts`:

```ts
import type { AchievementId, AchievementPath } from './achievements.ts'
import type { ExecutionOrigin } from './progression.ts'

type PublicCharacterKind = 'human' | 'agent'
type PublicHistoryKind = 'achievement' | 'story' | 'project' | 'collection'
interface PublicAchievement {
  id: AchievementId
  title: string
  path: AchievementPath
  icon: string
  earnedAt: number
  origins: ExecutionOrigin[]
  pinned: boolean
}
interface PublicHistoryEntry {
  kind: PublicHistoryKind
  id: string
  title: string
  earnedAt: number
  origins: ExecutionOrigin[] // empty for collection aggregation if origin cannot be faithfully derived
  memento?: { title: string; description: string; icon: string } // static definition text, story only
}
interface PublicCharacterProfile {
  version: 1
  id: string
  name: string
  kind: PublicCharacterKind
  path: string // /p/<validated UUID>; never a caller-provided external URL
  achievements: PublicAchievement[] // earned only, at most current six definitions
  counts: { achievements: number; stories: number; projects: number; collections: number }
  history: PublicHistoryEntry[] // newest first; max 30 per page
  next: string | null
}
```

`GET /api/profiles/:id?after=<cursor>` returns `{ profile: PublicCharacterProfile }` plus the host's usual server time. No session is required. Cursor is optional, bounded (for example 512 chars), and validates the last entry's tuple `[earnedAt, kind, id]`; sort descending timestamp then stable kind/id. The cursor only selects already-visible results, never a target, owner or collection. Bad cursor is 400; unknown/hidden/unavailable identity is the same 404 `profile_unavailable`. Rate-limit reads by IP using the existing limiter (60/minute is consistent with agent pages); apply the same bound to HTML pages. No export of an unbounded all-history blob.

The exact type names may follow repository style, but the wire fields and privacy boundary must remain this narrow. All four history kinds must appear in the rendered view, with a visible Load more/Older accomplishments link when `next` exists; do not silently lose older history after the cap.

## Read and projection algorithm

1. Validate canonical UUID public ID before looking up anything. Reject prototype keys, resident strings, encoded separators and arbitrary slugs. Use existing UUID validator/pattern; no name lookup and no directory enumeration.
2. Read via `ctx.store.read`. Consult `db.civic?.prefs[id]?.directory` first. Optionally obtain the existing viewer with `request.session(db)` without renewal. If known and either side's existing `db.social?.players` blocks the other, return the identical unavailable response. Do not invoke `socialService.profile`, `enter`, `ctx.collection` initializers, `settle`, migration, action processing, telemetry attribution or agent model calls.
3. Resolve with `ctx.core.sessionByPublicId(db, id)` and verify `session.publicId === id`, unexpired session (`expiresAt > ctx.now()`), a valid canonical active city and its life. Offline is allowed when the stored session is still valid. Unknown, expired, parked, deleted and archived lives are unavailable. Do not fall back to `archivedLives`/`legacyLives`: that would revive retired identities and change the privacy contract.
4. Identity uses `session.agent?.char === true ? 'agent' : 'human'`. No inference from temporary `agentUntil`, recent progression origin, a name/slug, client input or account existence. No owner account/name, key metadata, claimed status or model information is needed.
5. Achievements: enumerate static known definitions and matching earned receipt; validate ID, version and positive integer timestamp no later than the state's persisted `t`. Use static title/path/icon; filter origin through the `ExecutionOrigin` enum. `pinned` must also refer to an earned receipt. Never include unearned progress, marks, `trackingSince`, `earnedCity`, next actions or target counts.
6. Stories: enumerate valid permanent memento receipts, resolve definition with `episodeByMemento`/`episodeById`, require ID/version/episodeVersion/rewardId correspondence and valid persisted timestamp. Use authored title/memento text; do not copy `EpisodeView`, run, observations, receipts, answer, outcome tag, assistance records, route, chapter history or choice. Receipts for retired generic stories remain visible; do not use discovery filtering as a receipt deletion rule.
7. Projects: use only the character's own `state.projects.mementos`, matching static project ID/occurrence and valid earned timestamp. Use static title, not a stored free-text override. Do not read communal project participants, role ledger, contribution proofs or intentions. A completed community project without this character's earned memento is not their accomplishment.
8. Collections: use validated `journeyCollections(state)`, retain `complete && completionAt !== null`, and output only ID/title/completion time. Omit geography, current city, member criteria and incomplete collections. This avoids disclosing where the character is or what they are working on. Existing old city/country collections and local-tale collections both survive.
9. Count all accepted entries, sort/paginate as above. Do not read/write progression operational events or infer extra life statistics (wealth, days active, career, campus, relationship levels). Retain the distinction between identity and recorded assistance origin; an empty origin list must read “Origin not recorded”, not human.

Use direct typed projection over existing records. Avoid a generic serializer or a full private view followed by deleting fields. Privacy is allowlist construction. Current engine catalogue helpers already exist on the server; ensure a new client import does not drag those catalogues into the startup bundle.

## Sharing and HTML boundary

Canonical share URL: `https://joinallworld.com/p/<publicId>` in production, built from trusted configured origin/`safeOrigin`, plus the validated path. No secret, bearer token, claim token, account ID, invite/referral code, current-city query or return URL. Do not reuse `/v/` (join/visit) or `/s/` (stored event/referral share); opening a profile must never join a friend, travel, grant money, start a game or record a referral.

Register `ctx.pages.set('/p/', ...)` in the new route module, add `/p/` to Worker `PAGE_PREFIXES`, and render a small standalone responsive HTML profile from the exact same projection. Anonymous read is valuable even before game onboarding. Use escaped text/attributes, same-origin fixed links, generic existing share image and `noindex, nofollow`. Always `cache: false` / `Cache-Control: no-store` for success and unavailable responses so directory-hide changes affect the next request. Do not put old names/accomplishments into unavailable HTML, title, meta tags or OG tags. `HEAD` has no body; only GET/HEAD serve the page. A visible normal link to `/` is sufficient; profile sharing does not require onboarding deep-link mutation.

Page hooks have no viewer cookies by design. Therefore the public HTML page enforces global directory hiding but is anonymous, as existing public agent pages are. The JSON endpoint and in-game profile enforce blocks when a viewer is known. This is an honest public-content boundary: blocking an account is not an access-control guarantee against viewing a public URL while signed out. Do not expand the host's cookie-free page contract just for this feature. If parent requires block-aware page viewing as a new product rule, redesign before implementation rather than claiming the existing hook provides it.

Own Share control should obtain/confirm the current public projection before opening native share or copy fallback. Hidden/unavailable shows an explanation and a Neighbours link, never silently turns visibility on. Use the existing share utility or a lazy wrapper, triggered only by user click; do not auto-send to contacts/social networks. Static page URL can be copied by visitors. Avoid storing any new snapshots that outlive preference revocation.

## Proposed exact implementation ownership

One Sol owner is sufficient for the coupled contract; parent resolves concurrent ownership before assigning these paths:

- New `src/types/public-profile.ts`, `server/public-profile.ts` (pure projection/eligibility reader), `server/public-profile-page.ts`, `server/routes/profiles.ts`.
- Registry integration owned here: `src/types/protocol.ts`, `server/routes/index.ts`. The first-person lane owns `deploy/cloudflare-worker.ts` and startup/provider repair; request that owner add `/p/` to `PAGE_PREFIXES`. Do not edit that shared file in this lane.
- New lazy `src/app/features/social/PublicProfile.vue` (fetch, allowlisted renderer, older page, share) and optional colocated `publicProfileModel.ts`/`shareProfile.ts` if useful.
- `src/app/features/social/PlayerCard.vue`: attach public accomplishment panel after identity; do not reuse its private card response. Ensure visible non-UUID AI resident/house-agent references receive the honest no-earned-records state even if the ordinary UUID social endpoint cannot load them. `src/app/features/social/NpcCard.vue`: explicit AI/NPC no-earned-records state; do not fabricate a profile or silently omit this surface. No map renderer changes should be necessary.
- `src/app/features/passport/PassportApp.vue`: own public-preview/share entry; reuse the same component or utility using own public ID. Keep this within the lazy feature.
- `src/app/features/civic/NeighboursApp.vue`: add explicit public-profile hide consequence in existing explanatory copy.

Cross-lane dependency: first-person chat `01a13a42-b51e-7942-b5a2-32f38c198c37` owns the reproduced Worker-size failure (5,110,078 bytes > 3.5M) and its conditional source/Worker progression provider, hashed immutable snapshot, async startup barrier and atomic validation. Sync episode/mission/journey lookup APIs must be preserved. This lane must not edit package/provider/build assets/Cloudflare startup paths; coordinate `/p/` prefix addition with that owner. Parent is sole final main/deploy operator. First-person presently holds the sole Astra browser at 4412; wait for explicit handoff before any CUA/browser use.

Optional old `/agents/<slug>` link to the new profile would require `server/agents/service.ts`/`pages.ts` and is unnecessary for acceptance; avoid widening existing agent ownership. Resident/NPC pages remain truthful and separate. No state schema/store migration, new writes, new test files, package/dependency changes or new map protocol fields.

## Acceptance and rejection probes

Run temporary synthetic scripts outside tracked tests and existing relevant suites. Save redacted receipts/artifacts under this release's evidence directory; secrets never enter source/reports.

- Same human reached from actual map friend pin, neighbour card and People card shows correct identity, earned badges, completed story/project/collection history. Same UUID reaches same public profile. Own Share copy opens readable public HTML in a fresh signed-out browser without creating a session.
- Agent character yields `kind: agent`, survives absence of a recent agent-call mark; delegated key playing a human does not relabel that human. Record provenance text truthfully, including mixed/unknown origins. Known visible resident/house-agent and NPC cards show an explicit AI identity and no-earned-records state where no canonical receipts exist; no invented story completion or broken share control. Unknown resident ID does not turn into a human profile or expose roster/memory text.
- Give an isolated synthetic fixture achievements, one valid legacy world story, a new local story, a personal project memento, a complete collection, unearned progress and many private sentinel fields. Deep-scan JSON + HTML: only approved earned data appears. No cash, salt, secret, account/owner, location/trip, session time, event log, chapter answer, chat, relationship, faith, prayer, memory or counterpart IDs. Invalid IDs/versions/reward IDs/future timestamps never earn public rows.
- Privacy transition: visible profile → directory hidden → same API/page/HEAD URL unavailable with generic metadata and no-store → visible again. Repeat with warm application/CDN fetches. Hidden self receives same public unavailable response; private passport still works. Known viewer blocked in either direction cannot read API history; anonymous public behavior is explicitly as above.
- Unknown, expired, archived, deleted/removed agent, malformed UUID, `__proto__`, encoded slash, malicious name/HTML and invalid cursor all fail safely. Profile read must preserve serialized store bytes, session expiry, receipt counts, wallet and progression. No fetch triggers settlement, rewards or model calls.
- More than 30 earned rows: deterministic older pagination reaches all allowed entries without duplication at an unchanged snapshot; same timestamp tie sorting stable. New client requests cancel/ignore stale target responses and reset on actor/ID change. Error/retry/empty/offline behavior is explicit.
- Travel and reload: one actor's earned history remains, no merging an archived alternate life. Both old 568 world receipts and new bespoke IDs are preserved by existing content regression probes. No pending reward becomes publicly earned solely through viewing.
- Actual 320/375px and desktop UI: Human/Agent label, heading, dates and provenance readable; no overflow; share/copy fallback and older links keyboard reachable, loading/error states visible. Physical-device acceptance must be claimed separately.

## Exact release gates

1. Parent rechecks current main and ownership (`AGENT.md`, current coordination); use the managed integration checkout, preserve all concurrent changes. The design base is not a release SHA. Review actual final diff, especially ID resolution, eligibility and allowlist. No opaque spread of private state.
2. Current content audit + existing progression compatibility must pass for all accepted 284 cities/243 identities. Run full typecheck/build/download budgets and smoke on the final candidate. Existing relevant suites include `server/social.test.ts`, civic privacy/page tests, agent safety/open tests, journey/episode/achievement suites, protocol route-registry smoke and share-page tests. Exact subset should follow actual modified dependencies; no new tracked tests needed.
3. Temporary Node and actual Worker HTTP probes must cover endpoint parity, /p HTML dispatch, hidden response/metadata, no-store, no writes, unknown ID, escaping, pagination and agent classification. Worker smoke currently checks five historical paths; its green result alone does not prove the new `/p/` route. Inspect real endpoint responses rather than a mock projection alone.
4. Existing browser startup and lazy-chunk budgets remain unchanged. The historical raw margin was only 13 bytes; obtain fresh final values. Keep client profile imports lazy and avoid episode catalogues in the client path. The current cross-lane Worker gate is failing at 5,110,078 bytes against 3.5M and must be repaired by its owner before release. Seal/bundle the final combined Worker and inspect provider compressed-size/startup acceptance; local successful TypeScript does not prove Worker upload/runtime fit. Existing Nigeria host/graphics issues have their own records and may not be called solved by this work.
5. Publish reviewed exact source through existing main workflow, then dispatch `.github/workflows/joinallworld-release.yml` for that exact SHA with deploy true and staging exposure unchanged/false. Keep namespace, class, migrations, routes, bindings and credentials unchanged. Do not race policy checking with new main documentation pushes. Capture provider receipt and frontend asset identity.
6. Before deployment, record synthetic existing identity/balance/progression continuity and recovery timestamp (a timestamp is not a backup). After release, wait for public `/api/health` to adopt the reviewed build; frontend/provider success alone is insufficient because Durable Object adoption has historically lagged several minutes.
7. After adoption: same-actor reload preserves identity, wallet, legacy/new receipts; signed-out public share, actual map-to-human profile, actual map-to-agent profile, hide/unhide, blocked API and representative local story completion + public-history appearance all pass on the final build. Browser reviewer is Astra. Do not use admin grants/state injection as gameplay evidence. Synthetic fixture HTTP evidence remains explicitly separate from earned browser play.
8. Record source SHA, CI/release IDs, provider deployment, live health, redacted endpoint receipts and screenshots with each scope. No claim of measured retention or real-device acceptance from release smoke. If privacy endpoint leaks anything, hold deployment or roll back exact runtime using existing namespace-preserving workflow; do not delete data to make verification pass.

No indispensable user decision remains for this finite implementation. Public/private defaults reuse current settings, identity is server-owned, and broader resident life publication is deliberately outside the earned-accomplishment contract.

## Implementation review closure

Actual source review found and resolved canonical memento-map aliases (including duplicate pagination), inconsistent project validation in collection projection, stale pagination busy state after target changes, raw provenance/HTML icon labels, stale Malawi arc metadata, and missing `/p/` development proxies. Parent/Sol's archived diagnostic extends rejection coverage to35wrong-key aliases and wrong-city collection completion.

Local browser acceptance is recorded in `docs/agent-work/phase6-public-profile-design-20261015.md`; evidence images are under `public-profile/`. Real map-pin→human Person, permanent-agent Person/public URL, own My Life, existing story history, supported synthetic friendship earning, hide→generic unavailable→relist, NPC empty state and375/320layouts were exercised. All evidence is local Node preview. Worker and production gates in this design remain mandatory and distinct.
