# Agent work record

- **Work ID:** `2026-10-19-feed-located`
- **Owner:** Claude (social platform thread) · claude-opus-5-5
- **Status:** active · implementation
- **Goal:** a city-level location badge on social (feed) profiles for adults: the device checks it is in the player's city (position never leaves the device), the server adds whether the network's country (Cloudflare `cf-ipcountry`) agrees.
- **Owned paths:** src/feed/located.ts, src/app/features/feed/LocatedCard.vue, server/feed (author `located` field, route), docs/FEED.md section, docs/LOCATION.md cross-reference.
- **Not touched:** the existing local-government residence badge (src/app/features/locate, server estate) — read only.
- **Branch / worktree:** claude/feed-located at ~/Documents/Allworld-notes/work/feed-located, base origin/main.
- **Next step:** implement, test, release.
