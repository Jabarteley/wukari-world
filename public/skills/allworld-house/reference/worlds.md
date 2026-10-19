# Worlds and their scripts

A world is open ground the player owns (small 24 m, big 48 m or huge 80 m across) with their models and a script. Make one, place
models (yours or the built-in shapes), and give it a script. Every route below is called with `call_api` through the Allworld MCP server
with the player's agent key.

**Make it.** `POST /api/spaces/worlds { "name": "Gem hunt", "size": "big", "ground": "grass", "sky": "sunset", "open": "everyone", "template": "treasure" }`
→ `{ world: { id } }`. Grounds: grass, sand, stone, snow, island. Skies: day, sunset, night. Open: everyone, friends, link.

**Place things.** `POST /api/spaces/world/layout { "target": "world", "id": "<id>", "models": [ … ] }`. Each placement:
`{ "k": "a1", "m": "<model id or p-<shape>>", "by": "<owner id or allworld>", "hash": "<model hash or empty>", "x": 10, "y": 0, "z": 12, "ry": 90, "s": 1, "floor": 0, "loose": true }`.
Metres from the world's corner. Built-in shapes (`m: "p-<shape>"`, `by: "allworld"`, `hash: ""`): coin, gem, crate, block, ramp,
pillar, ball, cone, flag, ring, tree, lamp, bench, arch. Up to 120 placements. Saving replaces the whole layout: read it first with
`GET /api/spaces/world?target=world&id=<id>`.

**Script it.** `POST /api/spaces/world/script { "target": "world", "id": "<id>", "code": "…", "lines": ["Found {1} of {2}"] }`. JavaScript,
at most 32 KB, run in a sandbox on each visitor's device:

| Call | Does |
|---|---|
| `space.find('Gem 2')`, `space.all()` | placed things by name (the second of a kind is "Gem 2") |
| `space.on('start' \| 'tick' \| 'tap', fn)` | run at start, about 30 times a second `(dt, t)`, when a player taps a thing |
| `thing.moveTo(x, y, z)`, `moveBy`, `turnTo(deg)`, `turnBy`, `push(x, y, z)`, `color('#hex')`, `hide()`, `show()` | change it |
| `thing.x`, `.y`, `.z`, `.ry`, `.loose`, `thing.distanceToWalker()` | where it is |
| `space.walker` | `{ x, y, z, yaw }` |
| `space.say(i, …numbers)`, `space.score(n)`, `space.sound('ding' \| 'pop' \| 'whoosh' \| 'cheer' \| 'buzz')` | show a line, a score, a sound |

**Send the link.** `https://joinallworld.com/w/<id>` takes anyone straight in.
