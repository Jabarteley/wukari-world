# Complete changed-file inventory

The following inventory records Phase 1. Phase 2 is a separate branch/stacked draft with its own [file inventory and status](PHASE2_CAMPUS_STATUS.md#phase-2-file-inventory); the foundation branch and PR #1 are preserved.

This milestone adds the following 23 files on `feat/wukari-geographic-foundation`. No pre-existing tracked application, test, dependency, licence, notice, lockfile or city file is changed. Nothing is merged to main or deployed. The owner has authorized committing/pushing the feature branch and opening a draft PR; publication outcome is recorded in the work record.

| File | Purpose |
| --- | --- |
| `docs/agent-work/wukari-foundation-20261020.md` | Required ownership/checkpoint/handoff record |
| `docs/wukari/PROJECT_BRIEF.md` | Product requirements and delivery scope |
| `docs/wukari/ARCHITECTURE.md` | Existing stack/generator/renderer audit and extension design |
| `docs/wukari/GEOGRAPHY.md` | Extent states, precision and executable lab/import workflow |
| `docs/wukari/SOURCES.md` | Source URLs, pins, provenance, verification and access blockers |
| `docs/wukari/LEGAL_AND_ATTRIBUTION.md` | AGPL/source offer, map licensing, art/branding/access review |
| `docs/wukari/ROADMAP.md` | Campus-first acceptance gates and immediate next task |
| `docs/wukari/VALIDATION.md` | Executed checks and baseline failures |
| `docs/wukari/CHANGES.md` | This complete inventory |
| `data/wukari/README.md` | Input/fixture semantics and acquisition guidance |
| `data/wukari/discover-fuw.overpassql` | Reproducible bounded-purpose university discovery query |
| `data/wukari/fixtures/boundary.synthetic.json` | Explicit non-Wukari administrative-extent test fixture |
| `data/wukari/fixtures/osm.synthetic.json` | Explicit synthetic university/path/footprint/relationship test fixture |
| `scripts/wukari/sources.ts` | Canonical source URLs/checksum pins and integrity gate |
| `scripts/wukari/import.ts` | Offline real/synthetic import, source preservation and provenance |
| `scripts/wukari/preview.config.ts` | Separate Vite lab and fixed local dataset endpoint |
| `src/wukari/geography.ts` | Geography/OSM validation, extent model and local metre adapter |
| `src/wukari/geography.test.ts` | Geometry, precision, identity, uncertainty and integrity tests |
| `src/wukari/import.test.ts` | CLI repeated-import/raw-preservation/failure tests |
| `src/wukari/preview/index.html` | Lab-only HTML entry |
| `src/wukari/preview/main.ts` | Lab-only Vue bootstrap |
| `src/wukari/preview/App.vue` | Visible uncertainty/attribution and responsive inspection UI |
| `src/wukari/preview/scene.ts` | Orbitable Three.js flat source linework with campus focus |

Ignored local setup/runtime outputs: `node_modules/`, `dist/`, `.data/`, `.cache/wukari/`. Shared npm cache is outside the checkout at `/workspace/.npm-cache`; temporary browser tooling, downloads, logs and screenshots are outside the checkout. These are not additional source changes.

Environment settings, separately from Git files: saved `install_script`, `start_skill` and custom domain requirements (`www.geoboundaries.org`, `overpass-api.de`, `media.githubusercontent.com`, plus `api.github.com` for the owner-requested draft PR), preserving the package-manager preset. Draft persistence is confirmed; runtime network changes/publication are not.
