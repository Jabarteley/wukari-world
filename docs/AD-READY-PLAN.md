# Ad-ready plan: what to build next so an advert lands

Reviewed and started 19 October 2026 (the owner: "implement and test all of the above … and deploy to prod"). Status at the end. Each phase is its own release, built and deployed in the usual way
(tests, the scripted upgrade check, a short smoke, the deploy lock).

## The idea in one line

Allworld's one thing nobody else has is **place**: the whole world, with your own street in it. Every phase below either makes that
visible in the first ten seconds, or turns players into the people who show it to their friends.

## What already exists (and is reused, not rebuilt)

| Already built | Where | Used by |
| --- | --- | --- |
| The map ladder: world → continent → country → city → district → neighbourhood, with hand-offs between the atlas and the city map | `docs/MAP-ZOOM.md`, `src/map3d/zoom-host.ts` | Phase 1 |
| Entry page variants per advert address (`/shops`, `/games`, `/cities` …), with campaign counting | `docs/ENTRY.md`, `src/entry-variants.ts` | Phases 1, 6 |
| Share cards: a link with its own preview picture, opened by WhatsApp's crawler (`/s/<code>`) | `docs/SHARE-CARDS.md` | Phases 1, 2 |
| Capture: a photo or a clip of the scene, up to 30 seconds, downloaded as a file | `src/app/features/capture/` | Phase 2 |
| The location badge: the phone finds its city, the position stays on the phone; locals-only communities | `docs/FEED.md` (today's release) | Phase 3 |
| "Find my area": the device resolves its local government on the phone | `src/app/features/world/lgaCardModel.ts` | Phase 3 |
| The look editor: skin, hair, clothes colours and the wearable catalogue | `src/app/features/start/LookEditor.vue` | Phase 4 |
| Portrait from a photo (for the feed) | `src/app/features/feed/MeApp.vue` | Phase 4 |
| A web-app manifest and a service worker | `manifest.webmanifest`, `sw.js` | Phase 5 |
| Growth metrics: sources, campaigns, landed, play, day-7 | `server/growth/metrics.ts`, Admin → Dashboard | Phase 7 |

## Phase 1 — Zoom to your street (the advert's first ten seconds)

**What a person sees.** They tap the advert and land on `/street/lagos/yaba` (or `/visit/lagos`). Behind the entry card, the world is
already turning: the camera dives from space to Nigeria to Lagos to Yaba and settles over the neighbourhood, at the pace of the
owner's vision video. One tap on **Play** puts them on that street. A returning player is taken straight there.

**What is new.**
- A street address per neighbourhood (`/street/<city>/<lga>`, `/visit/<city>`), with its own link preview (title, picture) written by
  both hosts, like the entry variants. The address survives a reload until the visitor acts.
- The dive: the atlas and the city map already hand over to each other on zoom; this drives them on a timed path instead of a
  gesture, with the entry card over the top. Reduced motion: a short cross-fade. Weak devices or "save data": a still picture.
- "Find my street": one button on the entry card that uses the badge's city finder and the local-government finder (both on the
  device; the position never leaves it) and sets the dive's target. Nothing is sent until Play.
- A `street` share card: "Come and see Yaba on Allworld", from any neighbourhood panel and the Communities page.
- **"Visit home" is this same phase with different words**: `/visit/lagos` for a diaspora advert, landing a London visitor on a
  Lagos street with the city's calls and people as they already are.

**Files.** `src/entry-variants.ts`, `server/path-meta.ts`, `src/app/startExtras.ts` and `features/paths/arrive.ts` (the address),
`src/map3d/zoom-host.ts` and a new `src/map3d/dive.ts` (the timed path), `src/app/features/start/EntryPage.vue` (the button and the
backdrop), `server/growth/share.ts` (the card). All of the dive is fetched with the maps: the first paint does not grow.

**Measure.** Landed → Play → "stood on the street" per advert address. **Effort:** about three days. **Risk:** phones that cannot draw
the atlas fall back to the still; the dive must never block Play.

## Phase 2 — Every clip is an advert

**What a person sees.** In Capture, next to Download, a **Share** button. The clip comes out with a small corner mark (the player's
@handle and `joinallworld.com`), cropped to a phone's 9:16 if they choose, and goes to the phone's share sheet (WhatsApp Status, TikTok,
Instagram) with the player's profile link. Whoever taps the link lands on `/p/@handle` and then that street.

**What is new.**
- The mark and the crop, drawn on the device over the recorded frames (a second canvas; no upload, nothing leaves the phone until they
  share it).
- MP4 where the browser can record it (recent Chrome and Safari), WebM otherwise; the share sheet is told the type so WhatsApp accepts
  it. A clip that cannot be shared as video is offered as a photo.
- The share text and link (`shareUrl` with `utm_source=clip`), reusing `ShareSheet.vue`.
- A one-tap **"Clip this moment"** on an event, a wedding or a match: six seconds of the scene around the player, already framed.

**Files.** `src/app/features/capture/{captureModel,captureSession}.ts`, `CaptureApp.vue`, `src/game/share-model.ts`, the gist's
moment hook (`server/gist/ledger.ts`) for the prompt.

**Measure.** Clips shared, and landings with `utm_source=clip`. **Effort:** about two days. **Risk:** WebM on WhatsApp; the fallback
to a photo keeps the share working everywhere.

## Phase 3 — Near you: the hyperlocal feed

**What a person sees.** The feed opens on **Near you**: posts, events and gigs from people whose badge is in the same local
government, then the rest of the city, then the world. A line at the top: "214 people confirmed in Yaba this month" (a count, never a
map or a distance). Events near you are listed first in Plans; gigs near you first in Work.

**What is new.**
- The badge gains an optional local government, found on the device the same way as the city (the player sees it before it is sent:
  "Yaba, Lagos — show it?"). Stored as an id with the city, nothing else.
- A fourth feed tab, `near`, ranked by badge match (local government > city), falling back to the city tab for people without a badge.
- Counts per city and local government for the line at the top (computed from badges; no list of who).
- Neighbours communities: a community of a local government, kept for locals with a badge there (today's `locals` rule, one level
  finer).

**Files.** `src/feed/model.ts` (tab, rank), `server/feed/service.ts` (read, counts), `src/app/features/feed/FeedApp.vue`,
`LocatedCard.vue`, `locateCity.ts` (the local-government step), `docs/FEED.md`.

**Measure.** Share of sessions that open Near you; replies between people in the same local government; day-7 return of badge holders
against the rest. **Effort:** about three days. **Privacy:** the same rule as today: the position never leaves the phone; what is
stored is a local-government id the player chose to show, as the residence badge already does.

## Phase 4 — Selfie to character

**What a person sees.** In the character creator, "Start from a photo". They take or pick a selfie; the skin tone, hair colour and
(where the browser can detect a face) glasses are set to the nearest choices of the catalogue, with the figure updating live. They
adjust and continue. The photo never leaves the phone and is not kept.

**What is new.**
- A photo step on `StepLook.vue`: face crop (the browser's `FaceDetector` where it exists, otherwise the centre of the picture), a skin
  tone from the face region, a hair tone from above it, each mapped to the nearest catalogue colour.
- A "share my character" card: the figure on a city backdrop, the same share sheet as Phase 2.

**Files.** `src/app/features/start/{StepLook,LookEditor}.vue`, a new `src/app/features/start/fromPhoto.ts` (pure: a picture in, a
recipe out, testable under node with a fixture), `docs/ONBOARDING.md`.

**Measure.** Share of new characters made from a photo; character cards shared. **Effort:** about three days. **Honesty:** this is a
likeness of tones, not a face scan; the wording says "start from a photo", never "looks like you".

## Phase 5 — On the Play Store

**What a person sees.** The advert's button says "Install", and on Android the app opens full screen with an icon, like any app. On the
site, Android visitors get an "Add Allworld to your phone" prompt after their first session.

**What is new.**
- The manifest completed for a store listing: maskable icons, screenshots, categories, the privacy policy address.
- `/.well-known/assetlinks.json` served by both hosts (a static page, like `/c/` and `/ev/`), so the store wrapper opens the site
  without a browser bar.
- The wrapper itself (a Trusted Web Activity built with the standard tool), signed and uploaded by the owner: this needs a Google Play
  developer account ($25, once) and a content rating form. The listing text and pictures come from the entry variants.
- The in-site install prompt (`beforeinstallprompt`), shown once, after the first session.

**Files.** `manifest.webmanifest`, `deploy/cloudflare-worker.ts` (the well-known page), `src/app/startExtras.ts` (the prompt), a new
`docs/STORE.md` with the build steps. iPhone: "Add to Home Screen" instructions for now; an App Store wrapper is a later, larger job.

**Measure.** Installs per campaign (Play Console) against web landings. **Effort:** about two days of agent work, plus the owner's
account and review time (Play review takes days).

## Phase 6 — The first sixty seconds

**What a person sees.** After Play, the social layer is on the first screen, not behind "All apps": a strip of what is happening near
them (three posts or an event), the people online on this street, and one clear next action ("Say hello", "Join Yaba Peeps", "Walk to
the Square"). On a return visit the phone opens on Near you.

**What is new.**
- A first-screen strip fed by the Near you read (Phase 3) and the room's people, in both Lite and the 3D world.
- A new-player path that ends with one social action rather than a tour, measured as activation.
- The owner's own test: five strangers, a phone each, watched for a minute. The notes from that decide the next polish.

**Files.** `src/app/features/lite/LiteShell.vue`, the HUD's first card (`src/app/features/hud/`), `src/app/features/start/StepReady.vue`.
**Effort:** about two days, after Phase 3.

## Phase 7 — Three adverts and one dashboard line

Run after Phases 1 and 2 are live; the rest make the adverts work better but are not needed to start.

| Advert | Address | Audience | The claim | Needs |
| --- | --- | --- | --- | --- |
| Visit home from London | `/visit/lagos` | Nigerians in the UK, US, Canada (Instagram, TikTok) | Walk your mother's street tonight. Call her character. | Phase 1 |
| Become governor of Lagos this week | `/politics` (new variant) | Nigeria, 18–30 | One-week terms. Real elections. Fights and jail. | an entry variant only |
| Your city, your rules | `/cities` | Nigeria and diaspora | Found a city, build its 3D world, invite everyone. | nothing new |

- One `utm_content` per creative; the dashboard already counts landed, play and sources. Add **activation** (walked, posted, or joined
  a community) and **day-7 return per campaign** as two lines on the Admin dashboard (`src/app/features/admin/dashboardModel.ts`).
- No money claims in any advert until Bachs is live and a lawyer has looked at the creator pool (`docs/EARN.md`).
- A small spend first (the research's own measures: activation rate and day-7 return per source), then double what works.

## Order, and why

1. **Phase 1** (zoom to your street): it is the advert.
2. **Phase 2** (clips): it makes players the advertisers, so the paid advert's reach multiplies.
3. **Phase 5** (store): the advert's button should say Install before the spend starts.
4. **Phase 3** (Near you), then **Phase 6** (first sixty seconds): what keeps the people the advert brought.
5. **Phase 4** (selfie): the most shared screenshot, once there are people to share it with.
6. **Phase 7** throughout: the first two adverts can run after Phases 1 and 2.

About two and a half weeks of agent work in all, released in six steps; the owner's parts are the Play account, the five-strangers
test and the advert spend.

## Decisions for the owner

1. The mark on shared clips: `@handle · joinallworld.com`, or the logo too?
2. Near you as the **default** feed tab, or City with Near you beside it?
3. The badge at **local-government** level (Phase 3): it names the area the player lives in, as the residence badge already does. Yes?
4. A Google Play developer account under the company (needed for Phase 5)?
5. Which two adverts first, and the first spend?
6. Anything here to drop, or missing?

## Not in this plan, on purpose

Photoreal streets (closed on 18 October), gender or age verification, live-stream gifting, more cities, an App Store wrapper, and any
"earn money" advert before Bachs and the legal check.

## Status (19 October 2026)

| Phase | State | Record |
| --- | --- | --- |
| 1 Zoom to your street (`/street/<city>/<place>`, `/visit/<city>`, Find my street, `street` share card, `/politics` and `/visit` entry variants) | built, tests pass, checked in headless Chrome (Play visible in 0.6 s on the street page) | `docs/agent-work/ad-phase1-street-20261019.md` |
| 2 Every clip is an advert (Share with the mark, 9:16, MP4 where possible, Clip 6 s, profile links keep the utm words) | built, tests pass; tried on Android 15 Chrome (emulator): a 4 s clip, the mark pass, the Android share sheet with the WebM and the profile link. Safari untried | `docs/agent-work/ad-phase2-clips-20261019.md` |
| 3 Near you (badge local government, `near` tab default for badge holders, counts line, Plans/Work order, `lga` community scope) | built, tests pass | `docs/agent-work/ad-phase3-near-20261019.md` |
| 4 Selfie to character (Start from a photo, Share my character) | built, tests pass; tried on Android 15 Chrome (emulator): the gallery picker, the photo read on the phone, skin and hair set | `docs/agent-work/ad-phase4-selfie-20261019.md` |
| 5 Play Store (manifest with five real screenshots, `/privacy`, `/.well-known/assetlinks.json` from `PLAY_SIGNING_SHA256`, install bar, `docs/STORE.md`) | built, tests pass; on Android 15 Chrome the install bar shows and Chrome's own Install sheet opens. The owner's Play account and signing key remain | `docs/agent-work/ad-phase5-store-20261019.md` |
| 6 First sixty seconds (the strip after Play with one action; Feed first for badge holders) | built, tests pass, seen on Android 15 Chrome | `docs/agent-work/ad-phase6-first-minute-20261019.md` |
| 7 Measurement (activation and day-7 return per campaign on the Admin dashboard) | built, tests pass | `docs/agent-work/ad-phase7-measure-20261019.md` |

Decisions taken for the owner (all reversible): the clip mark is `@handle · joinallworld.com`; Near you is the default tab for badge holders; the badge may name a local government (shown only after the player says yes); the Play account is the owner's; the first adverts are "Visit home" (`/visit/lagos`) and "Become governor" (`/politics`).
