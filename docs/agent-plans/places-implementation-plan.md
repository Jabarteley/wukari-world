# Places: implementation plan and status

The plan for turning Allworld from a game you play alone into a place where people from everywhere meet and build together. The feature's rules, routes and stored data are in [PLACES.md](../PLACES.md); the agent side is in [AGENTS.md](../AGENTS.md), "Services: agents as mini programs". This file is the plan the work followed, with what was delivered and how each part was checked.

## Goal

Six changes, each in its smallest real form:

1. Every group chat gets a room with a permanent link; anyone who opens the link lands inside as a guest, with no needs, job or settling in first.
2. Going to a person is free and instant; fares and the settle-in rule stay for the life simulation.
3. People build a place together: guests see the furniture, members place it.
4. One Square holds everybody online, so 280 cities do not mean 280 empty rooms.
5. Agents are the platform's mini programs: an agent offers a service where people are.
6. People in a room talk by voice.

## The one idea that makes it small: a place is not a journey

A place is a room a player stands in **without their life moving**. The life stays where it is and keeps living; only the room socket and the scene change. That single rule gives change 2 for free (no fare, no trip, no settle-in, from any city), keeps every life-simulation rule untouched, and needs no change to stored lives. Admission is decided by the server per place (`placeUntil`), never by where the life is.

## Plan, in build order

| # | Step | Where | Check |
| --- | --- | --- | --- |
| 1 | Room keys for places (`world:square`, `world:room:<group>`), the furniture rule, link format | `src/places/model.ts` | unit tests in `server/places.test.ts` |
| 2 | Who may stand where, the stored room record (`social.convs[g.N].room`), links and passes, routes | `server/social/places.ts`, `server/routes/places.ts`, `src/types/places.ts` | Node route tests: members, visitors, link off, new link, ask to leave, pass expiry, leaving the group |
| 3 | The room socket: `join { place }`, re-checks, drop on `place-ended`, voice-config for place rooms, the Worker's voice check | `server/ws/rooms.ts`, `server/routes/core.ts`, `deploy/cloudflare-worker.ts` | socket tests on Node; Worker tests including one where the object sleeps |
| 4 | Voice in private rooms: one circle in a group room and in a home with guests (it was off in homes) | `src/community.ts`, `CommunityPanel.vue`, `communityStore.ts` | store and component tests; two browsers joined voice and connected in the Square, a group room and a home visit |
| 5 | The page: place state, the store, the place panel, the Places app, the Square and Room buttons, link arrival (`/square`, `/r/…`) | `src/app/features/places/`, `App.vue`, `VenuePanel.vue`, `MessagesApp.vue`, `PlayerCard.vue`, `startExtras.ts` | browser walkthroughs on phone and desktop sizes, a brand-new device arriving by each address |
| 6 | The scene: a room drawn as a furnished home scene; the Square drawn as one venue for everybody through the app's scene state (the 3D scene chunk was 54 bytes from its budget, so nothing was added to it) | `src/app/state/app.ts`, `placesStore.ts` | size budgets; screenshots |
| 7 | Guests see the furniture of the home they are in, a rented home included | `server/social/visit.ts` | `server/visit-home.test.ts`; a guest watched the host place a plant |
| 8 | Agents in places: `enter_place`, `leave_place`, `set_service`, `list_services`, `GET /api/agents/services`, a sample quiz and guide agent | `server/agents/tools-places.ts`, `server/agents/service.ts`, `scripts/agents/service-agent.ts` | agent tests; the sample agent ran against a local server: its card showed in the Square's people list and its questions in the Square's chat |
| 9 | Link previews for `/square` and room links | `server/path-meta.ts` | live check of the page titles |
| 10 | Release: gates, package, deploy, continuity, live smoke | `relay` procedure | live smoke and a live Square join |

## Status

| Change | Delivered | Evidence |
| --- | --- | --- |
| 1. A room for every group, with a link | Yes | route and Worker tests; a brand-new device opened a room link, pressed Play and stood in the room beside the host |
| 2. Free and instant to a person | Yes: places and home visits cost nothing and need no trip; a friend's card offers "Join in the Square" | tests; walkthroughs |
| 3. Building together | Yes: members add, move, turn and remove pieces; members and link visitors see them; home guests see the host's furniture | a sofa one member added was seen by the other member and by a link visitor; a home guest saw a plant appear |
| 4. One Square | Yes | three players met in the Square; live join on production |
| 5. Agents as mini programs | Yes | the sample quiz agent's card and questions were seen by a person in the Square |
| 6. Voice in rooms | Yes: Square (by distance), group rooms and homes with guests (one circle) | WebRTC connected between two browsers in each kind of room |

## Not done, on purpose or for later

- A room's scene stands other people by the door (five at most); people do not walk about in a room.
- The Square uses an existing park scene; a scene of its own is later work.
- Furniture is moved with buttons, not by dragging in the scene.
- The landing page does not yet name the room a link leads to.
- Voice has been checked between browsers, not yet on phones on mobile networks.
