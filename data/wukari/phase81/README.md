# Phase 8.1 source geography and licensed characters

© OpenStreetMap contributors, ODbL 1.0: https://www.openstreetmap.org/copyright
Database licence: https://opendatacommons.org/licenses/odbl/1-0/

`town.json` and `fuw.json` are small derivative geographic databases offered here in editable machine-readable form with original OSM way IDs, node references, tags, versions/timestamps and unrounded WGS84 coordinates. Their projected metre coordinates are derived display geometry. The original large source remains available locally in the Phase 6 cache, with hashes/provenance described in `docs/wukari/LOCAL_PBF.md`. National source: https://download.geofabrik.de/africa/nigeria-261019.osm.pbf (snapshot 2026-10-19T20:21:11Z).

Reproduce the selection from that existing validated local aggregate with `node scripts/wukari/prepare-quality.ts`. This is a bounded selection, not a new import or download. Complete ways wholly inside the display windows are selected without clipping or repairing coordinates. Connectivity is based only on shared original node references, within each selected subset. Crossing ways and all relation geometry are omitted from these studies; the Phase 6 original retains them.

FUW-related factual research coordinates and bibliographic references are in `sources.json`; links identify each publication. No journal map, image, boundary or architectural plan is copied or traced. The facts establish an approximate historical research location, not a legal campus polygon, current building identity or access permission. OSM features are marked nearby/unverified, never university-owned. No hull of the research points is treated as a boundary. Whole-second source coordinates and unconfirmed datum limit accuracy.

The town spawn is an original road node reviewed for *virtual* geometry clearance and continuity. The project owner approved simulation-only spawning on 21 October 2026. This is not evidence of real-world public/pedestrian access or physical safety. The FUW study remains non-spawning. In the renderer, ground elevation, road widths and building heights without source height tags are illustrative, explicitly separate from recorded footprint/centre-line positions.

Code is AGPL-3.0-or-later; that does not relabel OSM geographic data. Modified code/data source: https://github.com/Jabarteley/wukari-world/tree/feat/wukari-avatar-roads-quality

The new town selection contains 54 roads and 243 footprints in a 1 km display square around original junction node 1965491008. Original records remain unmodified. roadSurface is a display adaptation constrained by exact building clearance; roadConflicts records source versus width conflicts. FUW is byte-identical to Phase 7.

The models directory is separate from the OSM database: Quaternius Universal Base Characters Standard, CC0-1.0. See models/LICENSE.txt and models/provenance.json. Original rig, face topology and eye texture retained; normal maps optimized to 1024 square. Fitted hair and clothing/animation adaptations are repository code under AGPL.
