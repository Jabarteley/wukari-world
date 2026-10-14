# Phase 4 shared per-city project integration

This is a bounded seam inventory for one shared, per-city project. It does not propose a new
runtime or a client-owned ledger. The safest shape is one server-owned collection updated inside
the existing store transaction and command path.

## Existing contracts to preserve

- A city life is currently nested under a device session: `CityLifeRecord` contains the life
  state, per-character progression, settlement timestamp, and salt
  ([server/types.ts:60-72](../../server/types.ts#L60-L72)). The session's public identity is
  `publicId`; its cookie secret is explicitly private
  ([server/types.ts:74-87](../../server/types.ts#L74-L87)). A project must never key a participant
  or receipt by `secret`.
- A session may have one current character and archived/put-aside lives. `characterCity()` trusts
  an explicit v2 pin only when it names a stored city, otherwise it selects the newest life
  ([server/character.ts:7-27](../../server/character.ts#L7-L27)). Travel files the old city and
  writes `character = { v: 2, city, from, movedAt }`; a collision is archived rather than merged
  ([server/character.ts:40-73](../../server/character.ts#L40-L73)). A project occurrence should
  therefore carry an immutable `cityId` and resolve the active life at operation time; it should
  not treat a city-keyed life slot as a permanent human identity.
- Account ownership is separate from character identity. `SessionRecord.account` is the account
  id and is reached through an account device binding, while `agent` carries agent-character and
  owner/week markers ([server/types.ts:100-124](../../server/types.ts#L100-L124)). Agent reporting
  resolves the character through `sessionByPublicId`, then uses the character account or session
  account to find the owner ([server/agents/service.ts:573-584](../../server/agents/service.ts#L573-L584)).
  Participant grouping must normalize in this order: authenticated account id when present; for
  an unaccounted human, the stable session `publicId`; for an agent, its resolved character id is
  provenance, but its owner account is the distinct-human grouping key when available. Never count
  agent key ids or multiple owned characters as additional humans.

## Best route and transaction seam

`server/routes/campus.ts` is the closest existing pattern. Reads derive identity from the stored
session and life (`authority()`), not request fields ([server/routes/campus.ts:14-22](../../server/routes/campus.ts#L14-L22)).
The election is a city-adjacent server collection read through `ctx.collection()`
([server/routes/campus.ts:23-27](../../server/routes/campus.ts#L23-L27)). Writes go through
`ctx.command(..., { internal: true, scope, afterAction })`; the callback rate-limits by the
authoritative public id, derives the participant again from the resulting state, and writes the
shared collection in the same operation ([server/routes/campus.ts:66-77](../../server/routes/campus.ts#L66-L77)).
This is the recommended project write seam: route validates city/role/action id, command validates
the gameplay action, and `afterAction` settles one project contribution and its receipt atomically.

The project route must be server-only for contribution and completion. The existing campus tests
already establish the intended boundary: public action dispatch cannot invoke a server-only campus
vote, while repeated action ids are idempotent (`server/campus.test.ts`, the tests around lines
61-143). A direct client `projectId`, participant id, account id, role completion, or reward claim
must be treated as a selector at most; all eligibility and participant identity must come from the
resolved session/life and server-side project state.

The origin bridge gives the route an additional trusted distinction: agent MCP requests are
wrapped with an execution origin and resolved against the transactional session. The wrapper is
created with `Object.create(request)` and the resolved session is bound during `find()`
([server/agents/mcp.ts:1-22](../../server/agents/mcp.ts#L1-L22); the `asAgent`/`find` implementation
in that file). Use that provenance for human-versus-delegated-agent-versus-agent-character
reporting; do not infer it from temporary public `agent.at`/`agent.week` marks.

## Proposed durable record shape

Add one namespaced collection, for example `cityProjects`, with a bounded map keyed by
`<cityId>:<occurrenceId>`. Keep the occurrence id stable across retries, restarts, travel, and
week/day changes; it is not a timestamp generated per request. Each occurrence should contain:

```text
{ v, cityId, occurrenceId, phase, openedAt, updatedAt,
  roles: { exploration, activity, hosting },
  participants: { <groupKey>: { accountId?, publicIds[], origins[], roles[], contributionCount } },
  contributions: { <contributionKey>: { groupKey, publicId, origin, role, actionId, at, value } },
  entitlements: { <groupKey>: { cosmeticId, grantedAt, claimedAt? } },
  outcome?: { at, summary, settledBy }
}
```

The exact field names are design decisions for the parent. The invariants are the important part:

1. `contributionKey` is a stable server-derived key such as `occurrenceId + role + groupKey`
   (or a role-specific bounded ordinal), so retrying the same role cannot pay twice. A request's
   action id remains useful as the command receipt, but is not sufficient: `ctx.once` is scoped to
   one player/session and explicitly does not protect the same operation sent under two different
   ids ([server/routes/once.ts:8-41](../../server/routes/once.ts#L8-L41)).
2. Role caps are checked against the occurrence's contribution map, inside the same transaction as
   the append. Distinct roles may be filled by one participant, but one role cannot be farmed by
   repeated characters or agent keys.
3. `groupKey` is account-level for signed-in people and owner-account-level for owned agents. Keep
   `publicId` and `origin` in the contribution for attribution and audit, but never use either as
   the distinct-human counter when an account owner is known.
4. Completion writes the outcome and cosmetic entitlement in the same transaction as the final
   accepted contribution. Entitlement delivery is a state transition (`grantedAt` then optional
   `claimedAt`), not a second cash-like side effect. A repeat request reads the existing receipt or
   entitlement and returns the settled result.

## Storage and migration implications

`Database` already permits feature collections, and `Db` is the transaction view
([server/types.ts:865-917](../../server/types.ts#L865-L917)). Node stores the document and
namespaced collections through the common store; Worker SQLite stores collection JSON in
`collections` plus chunk rows in `collection_parts`, and can also maintain per-entry `entries`
([deploy/sqlite-schema.ts:13-35](../../deploy/sqlite-schema.ts#L13-L35); [deploy/sqlite-store.ts:28-52](../../deploy/sqlite-store.ts#L28-L52)).
Use `ctx.collection(db, 'cityProjects', ...)` through the store abstraction so both hosts serialize
the same value. Do not add ad hoc SQL in a route.

The current SQLite schema is migration-versioned and validates required tables/columns before
serving requests ([deploy/sqlite-schema.ts:38-67](../../deploy/sqlite-schema.ts#L38-L67)); adding a
new physical table would therefore require a schema migration and Node parity. A namespaced JSON
collection avoids that migration, but it still needs bounded record growth. The store may split a
large collection into parts, and entry-layout migration copies collections incrementally and can
refuse an over-large or repeatedly interrupted copy ([deploy/sqlite-store.ts:479-516](../../deploy/sqlite-store.ts#L479-L516)).
Keep one occurrence small, cap participants/contributions, and archive or expire old occurrences
under an explicit policy rather than appending an unbounded history.

Both stores guarantee the useful failure behavior: Worker transactions expose a fresh draft and
only a successful commit plus durability barrier makes sessions, receipts, archives, and
collections durable; a rejected callback has no effect, while an uncertain failed barrier refuses
further writes until restart ([deploy/sqlite-store.ts:1-26](../../deploy/sqlite-store.ts#L1-L26)).
The Node/Worker route must return the committed outcome only after the normal transaction promise;
do not publish a cosmetic grant or completion notification before commit. A lazy transaction is
only appropriate for invisible polling; `TransactOptions` says visible outcomes default to durable
([server/types.ts:919-929](../../server/types.ts#L919-L929)).

## Existing project-like patterns and their limits

- `server/records/store.ts` provides a bounded-page, append-only, hash-chained public record with
  `seq`, `head`, per-entry `prev/hash`, and one-time `terms`
  ([server/records/store.ts:1-9](../../server/records/store.ts#L1-L9);
  [server/records/store.ts:48-74](../../server/records/store.ts#L48-L74)). It is a good pattern
  for an optional public outcome/audit projection, but not the authoritative project ledger: it has
  no role caps, participant grouping, or entitlement state.
- Campus game scans are explicitly per-life projections. The route scans current-week stored lives,
  labels human/agent families from `session.agent`, and records `lifeId`/student data
  ([server/routes/campus.ts:28-55](../../server/routes/campus.ts#L28-L55)). This is useful for
  presentation but cannot be reused for distinct-human project accounting because one account may
  own multiple characters and the projection is not a retry-safe write ledger.
- `world/service.ts` demonstrates a durable shared world index keyed by `publicId:cityId`, with
  serialized registry transactions, re-keying after travel, and a one-sync-at-a-time guard
  ([server/world/service.ts:134-154](../../server/world/service.ts#L134-L154);
  [server/world/service.ts:195-217](../../server/world/service.ts#L195-L217)). It is a useful
  concurrency model, but its resident/plot registry is not a suitable reward ledger.

## Minimum ownership map for implementation

| Concern | Smallest likely owner | Boundary |
| --- | --- | --- |
| Stable occurrence definition, role caps, participant normalization, completion and entitlement transitions | one new server project service/module | pure reducer plus bounded collection value; no client identity authority |
| Durable collection typing/default/sanitizing | `server/types.ts` and the new service's `empty/sanitize` helpers | use `ctx.collection`; no Worker-only SQL |
| Human route and server-only command | `server/routes/<project>.ts` plus route registration | mirror campus `ctx.command`/`afterAction`; require current city and stored life |
| Agent invocation | existing agent wrapper/tool route | pass trusted origin and resolved session; do not mint distinct humans per key/character |
| Optional public outcome projection | existing records/world projection only after durable commit | never make the projection the source of truth |
| UI/view | parent-owned client files | read projection and entitlement state; no eligibility or payout logic |

The parent should decide whether the new collection is called `cityProjects` or becomes a typed
`Database` field. The smallest safe implementation is still one collection entry per stable
occurrence, one transactional reducer, and one server route. A separate append-only log would add
ordering/hash and migration surface without solving account-level deduplication or idempotent
role caps; use the existing records chain only as a derived audit/outcome view if that view is
needed.
