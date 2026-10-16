# Research findings (16 October 2026)

Answers to PROMPTS.md, gathered by the owner with a web-search assistant and condensed here. The raw text (which names many
commercial games, so it is kept out of this public repository) is on the owner's machine. Treat figures as reported, not verified.

## Code and assets we may build on

- **Open-source 3D browser games with MIT or Apache code:** an arena shooter on three.js with navmesh bots (MIT, CC0 arena mesh,
  about 4.8 MB gzipped, 60 fps on a mid phone); an arcade rally racer on three.js with raycast-vehicle physics (MIT code, CC0
  low-poly cars and track, about 9.4 MB Draco, 45–60 fps with a 1024 shadow map); a penalty-kick football demo on an MIT engine
  (about 3.1 MB); a BVH-raycast character controller (MIT) that most browser shooters use instead of a heavy physics engine; a
  physics driving portfolio (MIT, matcaps and baked shadows, no dynamic lights: the model for low-end WebGL). A well-known
  futuristic racer is MIT code but its art is non-commercial: swap every asset before use.
- **Assets, all commercial-safe:** Kenney (CC0: Car Kit with separate wheels, Racing Kit with grandstands, City Kit, Blaster Kit,
  Animated Characters; one shared 512 px atlas per pack, 50–900 triangles), Quaternius (CC0: Ultimate Cars, Ultimate Modular
  Characters rigged for melee, Ultimate Gun Pack; 300–2,500 triangles), KayKit (CC0: City Builder Bits, Character Animations),
  Poly Pizza (CC0 filter; the archived Google Poly stadium and pitch kits), Poly Haven (CC0; use only for HDRIs and ground
  textures, models are too heavy), Sketchfab with the CC0 filter (low-poly stadiums and boxing rings), OpenGameArt (filter CC0 and
  CC BY only; arcade sound effects). Mixamo: royalty-free when embedded in a game, no redistribution of raw files; upload a
  1,200-triangle Quaternius character to Mixamo's rigger and use its combat, shooting and football animations.
- **Per-screen budget on a mid Android phone:** under 60,000–100,000 triangles, under 60 draw calls, 1K textures (WebP or KTX2).
- **Blender MCP, honestly:** generated meshes are dense triangle soup (30,000–150,000 triangles, fused wheels and fingers) and need
  remeshing, scale and orientation fixes and material cleanup before a web game can use them. Its real time-saver is scripted
  glTF export with Draco compression for batch pipelines. Blender itself warns that it runs model-generated code without
  safeguards: run it in a sandbox. Verdict: use it to automate cleanup and export of CC0 assets to our style, not to generate
  characters from scratch.

## What hosted-games platforms teach

- The big user-generated platforms give builders identity, friends, currency and leaderboards through one contract, review every
  game, and pay creators a share. Browser platforms that hosted others' games mostly died when their distribution partner changed
  the rules; the two survivors own their traffic and curate hard. Lesson: own the audience, keep the contract small and
  reviewable, and curate the first games ourselves.

## Agent arenas

- Several arenas now let a user plug in their own assistant through MCP or an API key: poker, chess, grid-survival and debate
  arenas with server-owned state, per-turn timeouts, fog-of-war state redaction, Elo matchmaking, replay links and public
  leaderboards; an official academic arena with sandboxed evaluation and streamed finals (100k+ views); a simulated civilisation
  of up to 1,000 agents whose recaps reached 1M+ views; an open-source social-life town (MIT) where spectators click an agent to
  read its memory. None runs a life simulation in real cities, and none mixes people and agents in one world: that is our gap.

## Connecting a user's own assistant (October 2026)

- ChatGPT: a custom connector (MCP server URL and auth entered in Settings; write actions need the user's confirmation; Developer
  Mode on some plans). Claude web and desktop: connectors in Settings; desktop also installs a `.mcpb` bundle on double-click.
  Gemini CLI and Code Assist: an `mcpServers` block in settings or `gemini mcp add <name> <url>`; AI Studio has an MCP tool panel.
  Cursor and VS Code: one-click deep links (`cursor://anysphere.cursor-deeplink/mcp/install?...`, `vscode:mcp/install?...`). No
  web assistant allows a bare link to install a server; the join page gives each its own exact steps.

## Short video, by platform and country

- TikTok: 13–21 s; a fail, near-miss or "friend bet" hook in the first 1.5 s; bold centre captions word by word; 88% sound on;
  the call to action "no install, play in the browser" cuts bounce by 25–40% against app-store links. Reels: 15–30 s, must work on
  mute. Shorts: 20–35 s. WhatsApp status: 10–15 s, under 2 MB so it loads on prepaid data, styled like a friend's raw status, with
  the link in the next text status. X: 9–15 s, square or 4:5, link in the second post.
- Nigeria: WhatsApp (94%+) and TikTok; storage-poor budget Androids and prepaid bundles make "no install, under 5 MB, share to
  status" the advantage; telcos sell cheap WhatsApp/TikTok social bundles. Ghana: TikTok, WhatsApp, Snapchat on campuses. Kenya:
  TikTok (highest in East Africa), WhatsApp, strong tournament culture. South Africa: TikTok, WhatsApp, football and racing
  culture. UK and US: TikTok and Shorts, group chats and Discord; US school Chromebooks play browser games.
- African cases: a Lagos studio grew light web versions of local card games through `wa.me` room links and victory screenshots on
  WhatsApp status; Nigerian advergames with danfo buses grew by daily brag cards on status and X; TikTok micro-creators
  ($30–$100 each) in Nigeria and Kenya film browser mini-games on a real budget phone to prove they run.

## What made social worlds spread, and what killed them

- Spread: a 20-second clippable argument; a last-tile capture with trash-talk emojis and a WhatsApp deep-link room code that works
  on 2G; a tiny player trapping the leaderboard giant; a spoiler-free emoji grid everyone copies into group chats; a card game's
  "pick two" stack in hostel WhatsApp groups. Common thread: a six-letter room code or one-tap link with zero friend-list setup,
  and a moment that fits one screen.
- Killed: no clear 60-second loop and no spawning beside the friend who invited you (95% churn in 48 hours); a loading bar at every
  door; two hours in the avatar creator then nothing to come back for; half-empty public lobbies instead of tight 4–8 friend
  rooms; 500 MB scenes that crash 3–4 GB Androids before two friends ever meet.

## Clans, seasons and ladders

- Clans of about 20–30 work; count the top 80% of members in clan wars so nobody is kicked for running out of data; show friends,
  then city, then a 30–50 person weekly cohort before any global board; rank floors per tier; asymmetric points below the top tier
  (+30 win, −12 loss); 28-day seasons with soft resets (drop 1–2 sub-tiers, never to zero); count a player's best 10 matches a day
  rather than volume.
- Prepaid networks drop for a few seconds every few minutes: a 15-second reconnect window with a bot steering meanwhile, never an
  instant forfeit. Clan screens as 2D overlays on a throttled canvas; leaderboard payloads under 4 KB gzipped.

## Programmatic video

- Save exciting moments as a small input log (about 15 KB), replay them deterministically in a headless browser at 9:16 stepping
  the clock 16.67 ms per frame (Playwright plus a frame capture library to FFmpeg), then package with an MIT video toolkit (Motion
  Canvas or its ads-focused fork) adding word-by-word captions, local currency and city names: a 1080×1920 MP4 for TikTok, Reels
  and Shorts, and a 720×1280 under-2 MB MP4 for WhatsApp status. Whisper for word timings. All MIT or Apache; the React video
  engine is free only for teams of three or fewer.
