# Legal and attribution requirements

This is an implementation/release checklist, not a legal clearance. Working name “Wukari Life” needs brand/trademark review. The project is unofficial and does not claim sponsorship, affiliation or endorsement by Federal University Wukari.

## Code and source offer

The checked-out `LICENSE` is GNU AGPL v3. README, NOTICE and package metadata identify the project as AGPL-3.0-or-later. Their historical statement about pre-7-October-2026 MIT releases does not change this checkout’s licence. Keep original copyright/licence notices, `LICENSE`, `NOTICE.md` and dependency licences intact. New prototype code remains part of this AGPL project.

If a modified game is offered over a network, provide a prominent, usable offer of the corresponding source for the exact running version, including relevant build/setup material and modifications under the applicable AGPL requirements. Do not point only to unmodified upstream. The development lab links both the owner’s fork and upstream; ensure the complete feature-branch source is publicly available at an accessible revision and verify the exact deployed revision before any public service. Pushing a draft branch is not publication of a game service. No public service or deployment is performed in this task.

Audit finding: the existing main game’s `src/app/features/sim/SettingsTab.vue` links “Source code” to `kromate/joinallworld`. Before a public Wukari release, update that offer to the actual complete modified source and test it; keep upstream credit as a separate attribution. This branch does not change existing game behavior.

## Geographic data

For geoBoundaries data, retain CC BY 4.0 credit, source/release/year and modification notice. Credit for the selected boundary: “geoBoundaries gbOpen, William & Mary geoLab; original source GRID3; Nigeria ADM2 (NGA-ADM2-59680162), release 9469f09, year 2022. Selected Wukari feature; projected for display without rounding source coordinates.” Phase 2 verified and preserved the public identity/license metadata and selected source feature in `data/wukari/verified/`. This is not a campus boundary, field survey or legal-access certification. Existing credits and the additive Wukari entry remain in `NOTICE.md`.

OpenStreetMap data carries ODbL 1.0. Display “© OpenStreetMap contributors” with a link to <https://www.openstreetmap.org/copyright>; identify the ODbL and provide required database access/offer where applicable to the published derivative database or produced work. Track OSM and geoBoundaries inputs separately; AGPL on code does not relabel OSM data as AGPL. Preserve raw OSM IDs, references, provenance and the licence notices accompanying any extract. Determine obligations for the actual combined database/output before release.

The lab shows OSM/geoBoundaries credits in source-data mode and explicitly says synthetic data is displayed in fixture mode. No OSM-derived Wukari database is committed in this milestone.

## Art, access and privacy

- No FUW crest, logo, uniform branding, official identity or suggestion of endorsement. Institution names may identify the project’s factual subject; marketing use requires separate review.
- Do not trace or copy Google Maps/Street View imagery, copyrighted campus maps, photographs, or third-party/game assets without a compatible grant. A publicly visible website is not an asset licence.
- Use original art or individually licensed assets with provenance. Approximate buildings must disclose unknown dimensions/materials; the current blocked milestone renders only administrative context and creates no campus buildings.
- Public map data is not permission to enter a property. Review gates, private/residential areas, security-sensitive locations and public access before walkable navigation or real-world guidance.
- Do not collect student identities, room assignments, private residence details or other personal data to fill mapping gaps. The current lab has no account or multiplayer data collection.
- Before multiplayer publication, review upstream privacy, age/consent, moderation, security, retention and source-offer behavior for the actual Wukari service.
