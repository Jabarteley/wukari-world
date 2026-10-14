# Journey collection contract (2026-10-14)

This bounded registry adds one authored country/city/place pack: `ng / lagos / unilag`, titled **Friend of Akoka**. It contains four curated keepsakes: two versioned episode mementos (`hostel-hustle`, `the-quiet-hours`) and two project occurrences (`akoka-games-night`, `unilag-reading-corner`).

The definitions are finite and explicit. Each member identifies its receipt source, version or occurrence, title, and criterion. `validateJourneyCatalogue()` checks duplicate collection/version/member ids, required receipt references, and optional known episode/project/geography sets. It does not load the world catalogue or synthesize missing content.

`journeyCollections(state)` is a pure projection over the existing current character `LifeState`. Episode members are earned only when the authoritative episode memento has the expected episode id and version. Project members are earned only when the authoritative project memento has the expected occurrence. Collection completion requires all four known receipts and reports `completionAt` as the maximum `earnedAt`; it performs no mutation, grant, cash credit, or new ledger write.

The projection is compatible with travel because these episode/project states already belong to the character's `CityLifeRecord` and move with the character. It is a presentation read model for local and global passport/collection surfaces. It does not claim that every catalogued place is playable or story-authored, and adding another country requires another reviewed finite pack.
