# Zooming through the map

The Map is one ladder of levels, and zoom moves along it:

```
world → continent → country → city → district → neighbourhood
```

The first three are drawn by the atlas (`src/map3d/geo/atlas.ts`, one camera: it already changes level by distance). The last three are drawn by the city map (`src/map3d/map3d.ts`, or the simple map `map2d.ts`) on its own camera. The level dropdown stays as the quick jump and always shows the level the zoom has reached.

## What a level is, per city

| | world to country | city | district | neighbourhood |
| --- | --- | --- | --- | --- |
| Open Nigerian cities (Lagos and the others with a local-government list) | atlas: World, Africa, Nigeria | the whole-city view | the local-government plates, at mid zoom | the estates and the houses on them, at the closest zoom; the player's own plot is ringed |
| Open foreign cities | atlas: World, Africa (the country is the Africa level) | the whole-city view | the same plates where the city module lists local units | the same estate grid where it has one |
| A city with no local units | as above | the whole-city view | none: the ladder stops at the city | none |

The street scene and the home are not map levels: they are walkable scenes, opened from the neighbourhood panel.

## Hand-offs

Zoom that a camera cannot take (it stands at its widest or closest view) is not lost. It builds up as pressure (`src/map3d/zoom-ladder.ts`); enough of it in one gesture (about a 1.7x pinch or four wheel notches) takes the step to the next map, and the zoom the gesture had left over carries into it. A single notch or a small pinch never changes level. The buttons and the keys take the step at once when the camera is already at the limit.

- **City map, out:** the atlas fades in, arriving close over the city and going on out to its level (Nigeria, or Africa for a foreign city).
- **Atlas, in on the player's own city:** the atlas flies in and the city map fades in at its wide end.
- **Atlas, in on another open city** (the one under the pointer, or the nearest open one within a few degrees): the atlas flies over it as close as it goes and its overview card opens. This is a look: the player's city and place never change, and anything that needs the player to be there keeps its own rule and wording.
- **Ends of the ladder:** a chip says so ("This is the whole world", "This is as close as Lagos gets for now").

`src/map3d/zoom-host.ts` runs the hand-over: it waits for the next map's data (with a loading chip), cross-fades the two map boxes (opacity only; reduced motion gets a short fade and no flight), turns back if the player turns back, and lets the map it left go twenty seconds later (a city map that was let go is built again while the player is still zooming towards it, so the hand-over itself does not stall). Near a limit it fetches the likely next map ahead of need, unless the device is weak or saving data (the same gate as the character body). Each map only reports what zoom it could not take through a small port (`LadderPort`), so neither knows the other exists.

## Rules the code keeps

- Zooming never travels: nothing in the ladder calls a game action or reads where the player is.
- One map is drawn at a time, and the one being entered; the one left is released after the hand-over.
- The ladder adds no startup bytes: the host and the ladder are fetched with the maps.
- The entry page of a street or a visit drives the same atlas and dive on a timer, behind its card (`src/map3d/entry-dive.ts`, `docs/ENTRY.md`).
