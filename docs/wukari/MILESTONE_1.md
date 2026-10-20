# Wukari Life — Milestone 1 Codex Implementation Brief

## Project direction
An open-source commercial, AGPL-compliant, 3D multiplayer life simulator set in Wukari, Taraba State, Nigeria. Federal University Wukari is the focal point. Reuse this fork's Vue 3 / TypeScript / Three.js / Node / WebSocket stack; do not migrate to MERN.

## Required preparation
Read AGENTS.md, AGENT.md, docs/AGENT-COORDINATION.md, docs/agent-work/TEMPLATE.md, docs/CITIES.md, docs/REFERENCE.md, docs/CITY-RESEARCH.md (if available), LICENSE, README, and relevant existing tests. Establish an agent-work record and check for overlapping ownership before shared code edits.

## Milestone deliverable
1. Audit existing chat, friendship, player presence, wallet, jobs, housing, campus preview, moderation and geographic city generation. Identify reusable code, tests and missing functionality.
2. Create docs/wukari/GAME_DESIGN.md covering player creation, opt-in nearby-player discovery, public chat, consent/friend-gated private chat, block/report/mute and spam protection, player housing, virtual jobs/earnings, non-withdrawable in-game currency, fictional university-themed missions, and future in-game phone.
3. Create docs/wukari/GEO_SOURCES.md with verifiable geographic datasets for Wukari town, Wukari LGA and Federal University Wukari, recording URLs, dates, licenses, attribution, coverage and data gaps. Avoid invented geospatial claims; treat unverified campus gates, roads and buildings as unverified.
4. Implement the smallest development-only Wukari campus prototype compatible with existing engine and verified geographic data. If the dataset is unavailable, implement a reusable import/validation scaffold and label any fallback scene as fictional. Do not open Wukari as a production city until required verified venue and geometry contracts pass.
5. Demonstrate at least one **existing** multiplayer/social or job/wallet mechanic end-to-end in the prototype without duplicating the system. Keep server authority and other cities intact.
6. Add focused tests, run npm run check on Node 22.18+, document exact local commands, results, changed files and data limitations.
7. Open a DRAFT pull request to main for review, without merging or deploying.

## Licensing and product boundaries
Keep AGPL copyright, notices and source-offer obligations; preserve applicable OSM ODbL attribution and dataset obligations. Do not copy Lagos Life intellectual property, university logos, Google Maps imagery or proprietary building models. Do not imply university endorsement. No real-money cash-out or unmoderated public chat launch.

## Definition of done
A reviewer can run the dev prototype; one genuine user interaction works; unverifiable map content is visibly labeled; tests are reported; draft PR is ready. No claim that all Wukari streets or campus buildings have been mapped.

## After Milestone 1
1. Verify FUW campus entrances/paths and source quality.
2. Build map tiling, real town roads, building footprints and performant 3D rendering.
3. Expand opt-in social discovery, profiles, moderated messaging and in-game phone.
4. Expand jobs, economy, virtual stores, housing, progression and campus social activities.
5. Conduct security, load, accessibility, geographic, license and release reviews.

## Suggested Codex task
Implement **docs/wukari/MILESTONE_1.md** on branch `feature/wukari-milestone-1`. Start with the repo audit and agent coordination work record. Carry implementation through tests, then open a draft PR. Do not merge.