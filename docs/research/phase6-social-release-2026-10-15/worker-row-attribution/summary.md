# Worker row attribution at `8affbb21`

This is a temporary Miniflare attribution probe, not a production cost measurement. It used a fresh disposable Durable Object, one synthetic player, no real credentials, and recorded only collection names, byte counts, and truncated content hashes. The temporary test file was deleted after the run; production source and tracked tests were unchanged.

## Stable current-source result

The source identity remained exact across the run:

- HEAD: `8affbb212333edd61954e5c6ed32e9c30682fe51`
- `server/residents/resident.ts` SHA-256: `61a5e65f5303e367f24b3cc88013204cc01e14660a4c0837bac9446cf49757d0`
- Result: 1/1 diagnostic passed in 37.7 seconds.

After the warm-up snapshot labelled `QUIET`, the first five-second wait observed two newly created collections: `modelRouter` and `worldfeed`. The second five-second wait observed `bonds` and all 16 resident shard collections, `residentsS0` through `residentsSf`. No later measured wait, move, or poll changed a collection. The measured quiet window therefore contained **19 first-creation collection-row writes**, not zero.

The earlier pre-merge bundle observed three quiet-window first creations: `modelRouter`, `worldfeed`, then the former single `residents` collection. That log completed before HEAD advanced and is archived only as historical comparison.

## Writer roots

- `deploy/cloudflare-worker.ts` emits the shared `heartbeat` event every ten seconds while a socket is open.
- `server/models/service.ts` starts the weekly model-list report from that heartbeat. `server/models/weekly.ts` records the attempt and calls the router persistence hook, whose lazy save targets `modelRouter`.
- `server/world-feed/service.ts` runs its heartbeat tick, marks the connected city seen, and lazily saves `worldfeed` after its feed work.
- `server/residents/resident.ts` loads on one beat, steps the bounded resident slice on later beats, and saves at its cadence. Its first save compares 16 serialized shard objects with 16 initial empty-string fingerprints, so every `residentsS0`…`residentsSf` shard is considered changed and created, including empty shards.
- `server/residents/bonds-link.ts` starts its lazy load on one heartbeat. On the later engine tick, `server/residents/bonds.ts` rolls its initial day, becomes dirty, and lazily saves the first `bonds` row.
- In `deploy/sqlite-store.ts`, `{ durable: false }` can be held only for a collection row that already exists. A missing collection makes the transaction durable, explaining these first-creation writes.

## Risk boundary

This proves fresh-object bootstrap writes in this 37.7-second fixture. It does not quantify steady-state or production billing, prove that every future beat is write-free, or establish parity with historical main. No invariant was loosened and no runtime refactor was attempted.
