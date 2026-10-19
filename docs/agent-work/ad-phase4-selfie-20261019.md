# Agent work record

## Identity

- **Work ID:** `ad-phase4-selfie-20261019`
- **Owner:** Claude (worktree agent)
- **Model / effort:** Sonnet 5.5 / default
- **Thread:** local
- **UTC updated:** 2026-10-19T00:00:00Z
- **Status:** verified-local
- **Work state:** implementation

## Goal and boundaries

- **Goal:** Phase 4 of `docs/AD-READY-PLAN.md`: start the character from a selfie (skin tone and hair colour to the nearest catalogue choice, on the device) and a "Share my character" card.
- **In scope:** a pure `fromPhoto.ts` with a node test; a lazily loaded photo reader; a "Start from a photo" control on the Look step; a character card (PNG, share sheet or download) offered on the Ready step; a `snapshot()` on the shared 3D preview.
- **Out of scope:** deployment, push, telemetry events (Phase 7), the Profile portrait from a photo (`MeApp.vue`), glasses detection (no browser API detects glasses).
- **Exclusive file ownership:** `src/app/features/start/fromPhoto.ts`, `fromPhoto.test.ts`, `photoLook.ts`, `CharacterCard.vue`, `characterCard.ts`; small edits to `StepLook.vue`, `StepReady.vue`, `CreatorApp.vue`, `lookPreview.ts`, `src/scene/avatar-preview.ts` (`snapshot`), `src/character/native-migration.ts` (two `export` keywords).
- **Input contract:** `docs/AD-READY-PLAN.md` Phase 4.
- **Output contract:** a committed branch; nothing pushed.
- **Dependencies:** none.

## Repository state

- **Repo:** JoinAllworld
- **Host:** Mac
- **Branch / worktree:** `worktree-agent-a5957913f72ef7872`, `.claude/worktrees/agent-a5957913f72ef7872`
- **Base:** d87b4d89f
- **Dirty status:** owned changes only
- **Port/process ownership:** none

## Progress

### Done and exact evidence

- Pure photo reader and recipe: `node --experimental-strip-types --test src/app/features/start/fromPhoto.test.ts` (9 pass).
- Card link and text: `characterCard.test.ts` (2 pass). Card drawing checked once in headless Chrome with a stand-in figure (backdrop, name, mark).
- Stage snapshot: new test in `src/scene/avatar-preview.test.ts` (13 pass in the file).
- Components: `startComponents.test.ts` (23 pass, one new). `creatorModel.test.ts`, `startModels.test.ts` pass.
- `npm run -s typecheck`: clean.
- `npx vite build` succeeds. `npm run build` stops later in `cities:assets` ("host scenery.sourceFiles[0] resolves outside the repository", a worktree symlink effect in `scripts/scene-factory`), unrelated to these files.

### In progress / blockers

- `npx vite build` then `npm run -s size:download`: 0 over budget, 0 errors, 0 conflicts. The photo reader (`fromPhoto` chunk) and the card are separate lazy chunks; only the two buttons are in the creator chunk.
- Not verified: the card made from a real WebGL stage and a real selfie on a phone (needs a device); `FaceDetector` is Chrome-on-Android only.
- No telemetry event for "made from a photo" or "card shared" (events need registering in `src/telemetry/events.ts`; Phase 7).

### Immediate resume steps

1. `npm run -s typecheck`, then `node --experimental-strip-types --test src/app/features/start/fromPhoto.test.ts`.
2. `npm run -s build && npm run -s size:download`.

## Release state

- **Local implementation:** active
- **Deployment:** not-requested
- **Release gate:** integration owner
- **References:** `docs/AD-READY-PLAN.md`

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-19 | active | registered | this file | implement |
