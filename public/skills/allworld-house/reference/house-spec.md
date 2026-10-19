# The house description (generated from src/spaces/house-spec.ts)

JSON. Metres. **x** runs across the front of the house from its left end (0) to its right end (width); **z** runs from the front wall
(0) to the back wall (depth); floors count from 0 (the ground floor). The front wall faces the street.

| Field | What |
|---|---|
| `v` | always 1 |
| `name` | optional, at most 30 letters, generic ("Our house") |
| `storeys` | 1 to 3 |
| `width`, `depth` | the outside size, 3 to 30 m |
| `storeyHeight` | floor to floor, 2.4 to 4.5 m (3 if unsure) |
| `walls` | `{ color, inner?, trim? }`: outside, inside and window-frame colours as `#rrggbb` |
| `roof` | `{ shape, color, pitch? }`: shape `flat`, `gable`, `hip`; pitch in degrees (10 to 50) for a gable or hip roof |
| `rooms` | up to 40: `{ name, floor, x, z, w, d, floorColor? }`, a rectangle on its floor; inner walls are drawn along every room edge inside the house |
| `doors` | up to 60: `{ floor, wall, at? , x?, z?, width, height?, main?, color? }` |
| `windows` | up to 120: `{ floor, wall, at, width, height?, sill? }` |
| `stairs` | up to 3: `{ floor, x, z, w, d, up }`: a flight from `floor` to the one above, rising towards `up` (`x`, `-x`, `z`, `-z`) |
| `extras` | `{ porch?, fence?, gate?, balcony? }` |

**Walls of a door or window:** `front`, `back`, `left`, `right`, `inner`. On an outside wall, `at` is the middle of the opening in metres
along the wall: front and back walls from x = 0, left and right walls from z = 0. On an `inner` wall, `x` and `z` are the middle of
the doorway, on a room edge. Mark the front door `"main": true`; it is where visitors come in. Doors are 2.1 m high unless you say;
windows 1.2 m high from a 0.9 m sill.

The game fixes small mistakes (sizes past the house, a missing front door) and says what it changed. It refuses only what cannot be a house.

## Worked example

```json
{
  "v": 1,
  "name": "Our house",
  "storeys": 2,
  "width": 10,
  "depth": 8,
  "storeyHeight": 3,
  "walls": {
    "color": "#efe2c8",
    "inner": "#f6f3ec",
    "trim": "#ffffff"
  },
  "roof": {
    "shape": "gable",
    "color": "#7a3424",
    "pitch": 32
  },
  "rooms": [
    {
      "name": "Living room",
      "floor": 0,
      "x": 0,
      "z": 0,
      "w": 6,
      "d": 5,
      "floorColor": "#b88b5a"
    },
    {
      "name": "Kitchen",
      "floor": 0,
      "x": 6,
      "z": 0,
      "w": 4,
      "d": 5,
      "floorColor": "#d9d4c7"
    },
    {
      "name": "Dining",
      "floor": 0,
      "x": 0,
      "z": 5,
      "w": 10,
      "d": 3
    },
    {
      "name": "Bedroom",
      "floor": 1,
      "x": 0,
      "z": 0,
      "w": 5,
      "d": 5
    },
    {
      "name": "Bedroom 2",
      "floor": 1,
      "x": 5,
      "z": 0,
      "w": 5,
      "d": 5
    },
    {
      "name": "Landing",
      "floor": 1,
      "x": 0,
      "z": 5,
      "w": 10,
      "d": 3
    }
  ],
  "doors": [
    {
      "floor": 0,
      "wall": "front",
      "at": 3,
      "width": 1,
      "main": true,
      "color": "#5a3a22"
    },
    {
      "floor": 0,
      "wall": "inner",
      "x": 6,
      "z": 2.5,
      "width": 0.9
    },
    {
      "floor": 0,
      "wall": "inner",
      "x": 3,
      "z": 5,
      "width": 1.2
    },
    {
      "floor": 1,
      "wall": "inner",
      "x": 2.5,
      "z": 5,
      "width": 0.9
    },
    {
      "floor": 1,
      "wall": "inner",
      "x": 7.5,
      "z": 5,
      "width": 0.9
    }
  ],
  "windows": [
    {
      "floor": 0,
      "wall": "front",
      "at": 7.5,
      "width": 1.6
    },
    {
      "floor": 0,
      "wall": "back",
      "at": 5,
      "width": 2
    },
    {
      "floor": 1,
      "wall": "front",
      "at": 2.5,
      "width": 1.2
    },
    {
      "floor": 1,
      "wall": "front",
      "at": 7.5,
      "width": 1.2
    },
    {
      "floor": 1,
      "wall": "right",
      "at": 4,
      "width": 1
    }
  ],
  "stairs": [
    {
      "floor": 0,
      "x": 8.6,
      "z": 5.2,
      "w": 1.2,
      "d": 2.6,
      "up": "z"
    }
  ],
  "extras": {
    "porch": true,
    "fence": true,
    "gate": true
  }
}
```
