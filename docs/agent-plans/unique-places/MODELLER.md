# Modeller brief: compose one place at a time from evidence

You model a short list of real places. Each model is its own composition, built from what the photos and the real outline show.
Read [PLACE-MODEL.md](PLACE-MODEL.md) (the spec and the check loop) and `scripts/places/README.md`, section "Composing a place".
Accepted examples: `scripts/places/models/abuja/national-mosque.json` and `scripts/places/models/abuja/airport.json`.

Work in `/Users/anthonyakpan/work/allworld-unique` and write ONLY `scripts/places/models/<city>/<venueId>.json` for your places, plus
downloads under `/tmp/places-evidence/<city>/`. Never commit, never start Blender yourself (use the shared queue), never edit code.

For each place:

1. **Identity.** Read `scripts/places/briefs/<city>.json` → `places[venueId]` (name, what it is, sources). Read
   `scripts/places/data/facts/<city>.json` → `venues[venueId]` (OSM match quality, footprint, levels, height, roof tags, Wikidata).
2. **Photos.** Use `scripts/places/data/evidence/<city>.json` if it lists photos for the venue. Otherwise find them yourself:
   - the Wikidata P18 image;
   - the Commons category (`https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtype=file&cmtitle=Category:...&format=json`);
   - the Wikipedia article images;
   - a WebSearch for "<name> <city>".
   For Commons images get an 800 px thumb via `prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=800`. Download 1–3 exterior photos
   with curl into `/tmp/places-evidence/<city>/` and LOOK at them with Read. Record each photo used in `evidence` with url, licence,
   author, view and what you took from it. Skip interiors, maps and logos. If the photo clearly shows a different building, do not use it.
3. **Compose.** Write the PlaceModelV2 spec from what you SEE:
   - massing (separate `mass` parts for distinct volumes, real proportions);
   - each roof form;
   - wall material and colour as seen (pick hex colours from the photo, not generic greys);
   - window rhythm;
   - every signature element placed where it is in the photo: towers, domes, minarets, canopies, stands, sheds, arcades, signage boards.
   Use `{"osm": true}` for the main footprint when the OSM match is `name` quality or the photo agrees. List parts with
   `python3 scripts/places/blender/parts/list.py` and prefer the most specific part (address as `<file>/<id>` when ids collide).
   Set `camera` to the main photo's viewpoint. Budgets: LOD0 ≤ 20k triangles (aim 8–16k), LOD1 ≤ 4k, LOD2 ≤ 500.
4. **Check.** Run `node --experimental-strip-types scripts/places/render-queue/submit.ts --city <city> --venue <venueId>
   --spec scripts/places/models/<city>/<venueId>.json --photo /tmp/places-evidence/<city>/<file> --wait 180`. View the
   `out/cmp-<city>-<venueId>.png` side-by-side image. Fix the largest differences first: massing, then roof, then colour, then details.
   Use at most 3 rounds, then record `review` {rounds, match close|fair|rough, gaps}.
5. **No photo anywhere.** Use the real OSM outline when it is reliable, plus the brief's facts, and set `verified` to `footprint`.
   With neither, make a modest building that is typical for this city and set `verified` to `text`. Still make it specific to this
   place (its size, its program, its setting); never copy another place's spec.
6. **Validate.** Run `node --experimental-strip-types scripts/places/validate-model.ts scripts/places/models/<city>/<venueId>.json`
   and fix until it passes.

No logos and no legible names: signage is blank boards in the colours of the place. Return per place: verified, match, rounds,
LOD0 triangles, and one line of gaps.
