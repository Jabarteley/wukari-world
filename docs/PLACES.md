# Places: the Square and group rooms

A **place** is a room you stand in without your life moving. Your character stays where it is in its city and keeps living; you are simply somewhere else on screen, with other people. Going to a place is free and instant from any city, for a guest who has only pressed Play as much as for a settled player.

There are two kinds.

- **The Square.** One room for the whole world. Everybody online may stand in it, whichever city they live in. It is split into groups of bounded size like any public venue, so it stays readable however many people are there. You walk, see people where they stand, chat, and talk by voice with the people near you.
- **A group room.** Every group chat has a room. Its members stand in it and furnish it together. A member can switch on the room's link; anyone who opens the link comes in as a visitor and can talk there, even if they have never played.

Code: `src/places/model.ts` (numbers, room keys, the furniture rule), `server/social/places.ts` (who may stand where, what is stored), `server/routes/places.ts`, `server/ws/rooms.ts` (`join` with `place`), `src/app/features/places/` (the page). Tests: `server/places.test.ts`, `server/agents/places.test.ts`.

## Getting there

| From | How |
| --- | --- |
| Anywhere in the game | The **Square** button on the venue panel, or Phone → Places |
| A group chat | The **Room** button in the chat's header |
| A friend's card | **Join in the Square**, when that friend is standing there |
| An address | `/square`, or a room's link `/r/<number>-<key>` |

A new visitor who opens an address sees the landing first (a name and Play, no sign-up), with a banner naming the room the link leads to and how many are inside, and is taken into the place as soon as their life exists. The address is kept for that tab only and the page returns to `/`.

**Step out** (the button, the door of a room, or the close button of the panel) puts the screen back where your life is. Setting off on a trip, or going into a home as a guest, steps you out as well: one thing is on screen at a time.

## Who may stand where

| Place | Who | Until |
| --- | --- | --- |
| The Square | everybody who has pressed Play | no end |
| A group room | the group's members | while they are members |
| A group room | anyone holding a pass from the room's link | 24 hours after they last came in; at once when a member switches the link off, makes a new link, or asks them to leave |

A visitor stands in the room, is seen and heard, and can speak in the room's live chat. A visitor never reads the group's conversation, is not in its member list and cannot change the furniture. A visitor a member asked to leave cannot come back through the link for 24 hours. Somebody the group's owner has a block with gets no pass. A room holds 16 people at once.

The server decides all of it. The room socket's `join { place: 'square' }` or `{ place: 'room', roomId }` is admitted only if `placeUntil` (the social module) says so; a room socket is looked at again at least every 15 seconds and at once when a pass ends. The stored life is not read for the admission and is never moved.

## What is the same as a venue

Chat lines pass the same text filter, the no-fee filter and the sender's mute; links and contact details are refused. Chat in a place is not stored. Two players of whom either has blocked the other do not exist for each other. Reports and mutes work as everywhere.

## Voice

Voice is off until you press **Join voice**, and you join muted, as everywhere.

- In the Square, proximity decides who you hear: the people within 12 steps of where your avatar stands.
- In a group room, and in a home with guests in it, there is one circle: everyone there who joined voice hears everyone else. Nobody walks in those rooms, so there is no distance to measure. A host and their guests can talk in a home the same way.

A voice circle holds 8 people. Joining voice asks for relay servers from the same relay as calls, under its limits ([CALLS.md](CALLS.md)), so people on mobile data, whose networks usually block direct connections, can hear each other.

## Building a room together

A room is 10 × 10 tiles and holds 60 objects. It starts with a few pieces. Any member may add a piece from the furniture catalogue, move it, turn it, or take it out. Pieces are free and belong to the room: no life is charged, nothing is owned by anybody and nothing can be sold, so there is no money to move. A change follows the same placement rule a home uses (inside the walls, no two pieces on one tile).

The page names the id of a piece it adds, so a request sent twice adds it once; a repeated removal changes nothing. Every change raises the room's revision, and everyone standing in the room sees the new layout within a few seconds.

## The Square's scene

The Square is drawn as one park scene for everybody, so where someone stands means the same on every screen. Its tables, regulars and goal markers belong to a venue your life is not in, so they do nothing there; people's name tags open their cards as usual. A scene of its own is future work.

## AI agents in places

An agent can stand in a place and offer a service there: host a quiz, guide a city, translate. See "Services: agents as mini programs" in [AGENTS.md](AGENTS.md). Agents carry the AI-played mark in a place as everywhere.

## What is stored

Additive: a group saved before rooms existed has no `room` and reads as a room with the starter pieces and no link. Looking at a room writes nothing.

```
social.convs[g.N].room   { items, rev, link?: { key, at, by }, passes?: { id: until }, barred?: { id: until } }
```

Every write is one row of the social collection. The link's key is 16 random bytes; the number in the address only says which room to look at.

## Routes

```
GET  /api/places                              the Square's headcount and your group rooms
GET  /api/places/square                       the people in your part of the Square
GET  /api/places/room?id=                     a room, for a member or a pass holder
POST /api/places/room/edit    { id, edit }    one change to the furniture (members)
POST /api/places/room/link    { id, on, fresh? }   switch the link on or off, or make a new one (members)
POST /api/places/room/remove  { id, player }  ask a visitor to leave (members)
POST /api/places/room/peek    { token }       what a link is, with no session: the room's name and how many are inside
POST /api/places/room/enter   { token }       come in through a link
```

## Not done, or weaker

- A room's scene is a home scene: other people are shown standing near the door (up to fifteen), not walking about.
- The Square has no scene of its own yet.
- A friend standing in a group room is shown as "in a group room"; joining them needs the room's link or membership.
- Furniture is moved with buttons, not by dragging in the scene.
- Voice is peer to peer between the people in a circle; it has been checked between browsers on one machine, not across real phone networks.
