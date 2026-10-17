# Lite games: the instant path

A lite game is JSON that one fixed engine plays. Use it whenever the idea is a dodge, collect, race-to-goal, chase or survive game. Use a cartridge pull request (reference/cartridge.md) only when the schema cannot express it.

1. Read the schema below and the full table in the repository's docs/SPACES.md, "Lite games".
2. Draft the definition. Keep `title` and `label` plain words, with no names of real people, links or numbers.
3. Import it with the MCP tool `import_game { def }`. It answers the game's id, or every problem in words; fix them and try again. Without a key, give the player the JSON to paste in the game: Games → Made by players → Make a game.
4. Tell the player to open a room with it and send the code to a friend, or to practise against bots.

## The schema

- `schema: "allworld-lite"`, `version: 1`, `title` (at most 40 characters).
- `hz`: 10–20.
- `seats`: `{ min, max }` 1–8.
- `arena`: `{ w, h }` 40–240.
- `controls`: `left-right` or `stick`.
- `player`: `{ size 4–30, speed 1–8, lives 1–9 }`.
- `entities`: 1–8 kinds. Each is `{ id, kind: hazard|pickup|goal|wall, shape: circle|square, size 2–40, speed 0–8, behaviour: fall|bounce|chase|static|patrol, spawn: top|random|edges|fixed (x, y), every 4–600, max 1–16, value 1–100, label }`. A wall is static or patrol.
- `rules`: `{ win: last-standing|most-points|first-to-goal|timer, points, seconds 10–180 }`. A most-points game needs a pickup, a first-to-goal game needs a goal, and the others need a hazard.
- `palette`: optional `#rrggbb` colours.

## Example

```json
{
  "schema": "allworld-lite",
  "version": 1,
  "title": "Coconut Dodge",
  "seats": {
    "min": 2,
    "max": 8
  },
  "arena": {
    "w": 160,
    "h": 120
  },
  "controls": "left-right",
  "player": {
    "size": 10,
    "speed": 4,
    "lives": 3
  },
  "entities": [
    {
      "id": "coconut",
      "kind": "hazard",
      "behaviour": "fall",
      "spawn": "top",
      "shape": "circle",
      "size": 8,
      "speed": 3,
      "label": "Coconut",
      "every": 6,
      "max": 10
    },
    {
      "id": "mango",
      "kind": "pickup",
      "behaviour": "fall",
      "spawn": "top",
      "shape": "circle",
      "size": 6,
      "speed": 2,
      "value": 1,
      "label": "Mango",
      "every": 40,
      "max": 2
    }
  ],
  "rules": {
    "win": "last-standing",
    "seconds": 90
  }
}
```
