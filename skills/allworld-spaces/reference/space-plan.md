# The Space Plan

A plan is one home or one group room written as data (JSON). It is a wish: the game checks every piece by the same rules as buying furniture, moves a piece that cannot stand where you put it, or leaves it out and says why. A plan never runs anything.

## Fields

| Field | Meaning |
|---|---|
| `schema` | always `"allworld-space"` |
| `version` | always `1` |
| `target` | `"home"` (the player's house) or `"room"` (a group room) |
| `tier` | home only: `starter`, `bq`, `bungalow`, `duplex` or `villa`. The size the plan is drawn for. See plots.md |
| `style` | home only, optional: indexes such as `{ "wall": 2, "roof": 0 }`. See house-style.md |
| `title` | optional, one line, at most 80 characters |
| `notes` | optional, your own words; dropped on import |
| `items` | the pieces, in the order they are placed |

Each item is `{ "itemId", "x", "y", "rot", "floor"? }`. `itemId` must be an id from catalogue.md, exactly.

## Grid rules

- `x` runs along the back wall, from 0. `y` runs towards the viewer, from 0. The top left corner is x 0, y 0.
- `x, y` is the corner of the piece nearest 0,0. A piece covers its size from there (catalogue.md gives width×height).
- `rot` is quarter turns, 0 to 3. An odd turn (1 or 3) swaps width and height.
- A piece must be inside the plot and inside the walls of the rooms (plots.md lists each room's span). Pieces may not overlap.
- Wall pieces (wall = yes) hang on a wall. With `rot` 0 they are on the back wall and `x` is the slot, `y` is 0. With `rot` 1 they are on the side wall and `y` is the slot, `x` is 0. Never use the window slot (back wall) or the door slot (side wall); plots.md gives both.
- Keep the column in front of the front door clear.
- `floor` is 1 or 2 for an upstairs piece; leave it out for the ground floor. A house with one floor has no upstairs. Keep the stairs and one tile at each end clear.
- A group room is 10 × 10, one floor, free furniture, no `tier` and no `style`.

## Limits

- At most 160 pieces in a home, 60 in a group room.
- Title at most 80 characters. A pasted plan at most 32 KB.
- A floor can also be full: too much on one floor is left out so the game stays smooth on a phone.

## Packed form

On the wire a plan is sent as `{ "v": 1, "target", "tier"?, "style"?, "title"?, "items": [[itemId, x, y, rot, floor?], ...] }`. The game reads both forms; write the long form.

## Example: a two-room house (`bq`)

```json
{
  "schema": "allworld-space",
  "version": 1,
  "target": "home",
  "tier": "bq",
  "title": "Quiet two-room home",
  "style": { "wall": 2, "roof": 0, "yard": 1 },
  "items": [
    { "itemId": "centre-rug", "x": 2, "y": 3, "rot": 0 },
    { "itemId": "family-sofa", "x": 2, "y": 6, "rot": 0 },
    { "itemId": "small-tv", "x": 6, "y": 0, "rot": 0 },
    { "itemId": "bookshelf", "x": 0, "y": 0, "rot": 0 },
    { "itemId": "wall-lamp", "x": 1, "y": 0, "rot": 0 },
    { "itemId": "wall-lamp", "x": 0, "y": 3, "rot": 1 },
    { "itemId": "gas-cooker", "x": 7, "y": 7, "rot": 0 },
    { "itemId": "fridge", "x": 6, "y": 7, "rot": 0 },
    { "itemId": "foam-bed", "x": 10, "y": 0, "rot": 0 },
    { "itemId": "toilet", "x": 11, "y": 7, "rot": 0 },
    { "itemId": "shower-cubicle", "x": 8, "y": 7, "rot": 0 }
  ]
}
```
