# Wukari Life

Working title, subject to brand review. An unofficial, community browser game set in Wukari, Taraba State, Nigeria, with Federal University Wukari (FUW) as the first development focus. The long-term world covers the town; expansion across Wukari LGA is a separate phase. No university endorsement is claimed.

This brief implements the owner’s request and attached `WUKARI_LIFE_CODEX_HANDOFF.md`. The attachment supplies product requirements, not evidence of geographic facts. Its suggested cloud/fork operations are not repeated: this work uses the connected `Jabarteley/wukari-world` checkout, forked from `kromate/joinallworld`.

## Product constraints

- Retain Vue 3, TypeScript, Vite, Three.js, Node and WebSockets. Reuse existing life/game mechanics when integration is justified.
- Campus-first: verified extent, public paths, recorded footprints, navigation and multiplayer; then town connections, then broader exploration.
- Real geographic positions must come from recorded, licensed sources. Keep WGS84 precision, OSM identities/references, raw inputs and uncertainty. An OSM feature is evidence of mapping, not proof of legal ownership, public access or current conditions.
- Distinguish the administrative LGA, the town’s built-up/study area, and campus grounds. None substitutes for another.
- No invented real roads, venues, gates, buildings or coordinate precision; no copied imagery, unlicensed art or university logo. Original approximate art must be labeled accordingly.
- Keep existing cities, source notices, AGPL obligations and third-party attribution intact. No merge or deployment without review.

## Delivered first milestone

An isolated geographic importer with checksum gates, explicit extent states, OSM identity/precision preservation, local-metre projection and tests, plus a Vue/Three.js development preview. The preview uses **synthetic test geometry, not Wukari**, because the Wukari ADM2 and OSM payloads could not be retrieved in this environment. Taraba ADM1 is verified from the existing pinned file. No playable Wukari city, university boundary, town outline, spawn point or real campus feature is claimed.

The lab is separate from the production city catalogue. It renders flat linework only; unknown road widths, elevation and building heights are not guessed. It does not yet provide walking, collision or multiplayer.

## Review guide

| Document | Purpose |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Audit, extension points, data contract and limitations |
| [GEOGRAPHY.md](GEOGRAPHY.md) | Extents, projection, validation and acquisition/import commands |
| [SOURCES.md](SOURCES.md) | Exact sources, integrity pins, retrieval results and uncertainty |
| [LEGAL_AND_ATTRIBUTION.md](LEGAL_AND_ATTRIBUTION.md) | AGPL, geographic licensing, branding and release obligations |
| [ROADMAP.md](ROADMAP.md) | Acceptance gates and next executable task |
| [VALIDATION.md](VALIDATION.md) | Executed checks and known baseline failures |
| [CHANGES.md](CHANGES.md) | Complete file inventory for this branch |

Branch: `feat/wukari-geographic-foundation`. Base: `4d229318e67667970b157e4798c533c4b5be0fad`. Source checkpoint `fd326337` was pushed to the owner’s fork. Draft PR creation is blocked by GitHub API Forbidden; see the work record. No merge, environment publication or game deployment has been performed.
