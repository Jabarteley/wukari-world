// Automatic recovery from the failure classes that earlier hosted runs proved fixable with a table key, each recorded (never silent).
//
// The runner (runner.mjs) calls these pure functions when a city's machine stages failed. Only the classes below are retried, each at most once per city;
// every other failure stays a HOLD with its own message. A retry is exactly the table edit a person would have made (the same key, the same value), applied to
// the one failing target and run through the same selection, generation and proof stages, so its output equals the output of the edited table. What was changed,
// why, and what came of it is written to the row (machine-holds.json) and to the receipt as `autoRetries: [{ class, change, before, after }]`.
//
// Classes (fixes already approved in the batch 10 to 15 diagnoses):
//   scene-budget    sourceScene failed ONLY on the triangle budget and the target leaves `sceneWaterExtent` unset: retry once with `sceneWaterExtent: "play"`. The existing
//                   `waterBudgetLadder` still applies on that retry when the target allows it (table data); the retry never turns it on.
//   wet-places      the exact-coast stage ("Source anchors are not dry land") or the city proofs (wetPlaces) name place points that are water: retry once with those refs added
//                   to selectionExclusions (at most 3, never the hub/airport/city-centre anchor).
//   catalogue-row   the derived state id was shortened to the country code so the catalogue row fits the app's 150-byte limit (done by batch.mjs at selection; recorded here).
import { budgetOverrunOnly } from './water-ladder.mjs';

export const AUTO_RETRY_CLASSES = Object.freeze(['scene-budget', 'wet-places']);
export const MAXIMUM_AUTO_EXCLUSIONS = 3;
/** A wet place this close to the city centre or the airport is that anchor: it is never excluded. */
export const ANCHOR_RADIUS_METRES = 300;
const REF = /^(node|way|relation)\/[1-9][0-9]*$/;
const WET_ANCHOR_MARKER = 'Source anchors are not dry land: ';
const STAGES_THAT_DECIDE = ['generation', 'exactCoast', 'sourceScene', 'acceptance', 'proofGround', 'proofCity'];

/** Metres between two lon/lat points (equirectangular: the anchor test needs hundreds of metres, not geodesy). */
export function metresBetween([lon1, lat1], [lon2, lat2]) {
  const dx = (lon2 - lon1) * 111320 * Math.cos(((lat1 + lat2) / 2) * Math.PI / 180), dy = (lat2 - lat1) * 110574;
  return Math.hypot(dx, dy);
}

/** The target after applying a plan's change (a copy; the table is never edited). */
export function applyChange(target, plan) {
  if (plan.class === 'scene-budget') return { ...target, sceneWaterExtent: plan.change.sceneWaterExtent };
  if (plan.class === 'wet-places') return { ...target, selectionExclusions: [...(target.selectionExclusions ?? []), ...plan.change.selectionExclusions] };
  throw new Error(`unknown auto-retry class ${plan.class}`);
}

/** scene-budget: only when the proof failed on the triangle count alone and the target never chose a water extent. */
export function planSceneBudget({ target, scene, used = [] }) {
  if (used.includes('scene-budget') || target.sceneWaterExtent !== undefined || !budgetOverrunOnly(scene)) return null;
  return {
    class: 'scene-budget',
    change: { sceneWaterExtent: 'play' },
    before: { stage: 'sourceScene', triangles: scene.triangles, triangleLimit: scene.triangleLimit, sceneWaterExtent: null },
  };
}

/** The wet anchors of an exact-coast failure: the stage's final error line must be exactly the dry-land check; any other error returns null. */
export function wetAnchorsFromExactCoastLog(text) {
  const lines = String(text ?? '').split('\n').map(line => line.trimEnd()).filter(Boolean);
  const last = lines.at(-1) ?? '';
  const at = last.indexOf(WET_ANCHOR_MARKER);
  if (at < 0 || !/^(\w+\.)*ValueError: /.test(last.slice(0, at + WET_ANCHOR_MARKER.length))) return null;
  let rows;
  try { rows = JSON.parse(last.slice(at + WET_ANCHOR_MARKER.length)); } catch { return null; }
  if (!Array.isArray(rows) || !rows.length) return null;
  const wet = [];
  for (const row of rows) {
    if (!row || typeof row.ref !== 'string' || !REF.test(row.ref) || !Array.isArray(row.sourceLonLat) || row.sourceLonLat.length !== 2) return null;
    wet.push({ ref: row.ref, name: row.name ?? null, lon: row.sourceLonLat[0], lat: row.sourceLonLat[1] });
  }
  return wet;
}

/**
 * The wet places of the city proofs (`<id>-proof.json`, one per view), or null when the proofs failed for any other reason too (polygon problems, points outside the box,
 * wet venue labels or airport, road coverage): a wet place is only retried when it is the whole failure. `places` is the generated PLACES list (name, lon, lat, osm).
 */
export function wetPlacesFromProofs(proofs, places) {
  const wet = new Map();
  for (const proof of proofs) {
    const points = proof?.sourcePoints;
    if (!points || !proof.polygonProof || !proof.pack) return null;
    if (Object.values(proof.polygonProof).some(layer => layer.polygonProblem || layer.triangulationProblem)) return null;
    if (proof.pack.roadPointCoverageWithinGround !== undefined && proof.pack.roadPointCoverageWithinGround < 1) return null;
    for (const [kind, report] of Object.entries(points)) {
      if (report.outsideBounds?.length) return null;
      if (kind === 'waterLabels') continue;
      if (kind !== 'places') { if (report.wet?.length) return null; continue; }
      for (const point of report.wet ?? []) {
        const place = places.find(candidate => candidate.name === point.name && Math.abs(candidate.lon - point.lon) < 1e-6 && Math.abs(candidate.lat - point.lat) < 1e-6);
        if (!place || !REF.test(place.osm ?? '')) return null;
        wet.set(place.osm, { ref: place.osm, name: place.name, lon: place.lon, lat: place.lat });
      }
    }
  }
  return wet.size ? [...wet.values()] : null;
}

/** The refs and points that must never be excluded: the hub (transit slot), the city's own OSM ref, and anything on the airport or the city centre. */
export function anchorGuard({ target, config, facts }) {
  const refs = new Set([...(config?.places ?? []).filter(place => place.slot === 'transit').map(place => place.ref), target.cityOsmRef].filter(Boolean));
  const points = [facts?.centre, facts?.airport].filter(point => point && Number.isFinite(point.lon) && Number.isFinite(point.lat)).map(point => [point.lon, point.lat]);
  return { refs, points };
}

/** wet-places: at most three refs, none protected, none already excluded; the generated reason names the stage and the run. */
export function planWetPlaces({ target, stage, wet, guard, run, used = [] }) {
  if (used.includes('wet-places') || !Array.isArray(wet) || !wet.length || wet.length > MAXIMUM_AUTO_EXCLUSIONS) return null;
  const excluded = new Set((target.selectionExclusions ?? []).map(exclusion => exclusion.ref));
  for (const place of wet) {
    if (!REF.test(place.ref) || excluded.has(place.ref) || guard.refs.has(place.ref)) return null;
    if (guard.points.some(point => metresBetween(point, [place.lon, place.lat]) <= ANCHOR_RADIUS_METRES)) return null;
  }
  const reason = `auto: place point is water (${stage} ${run})`;
  return {
    class: 'wet-places',
    change: { selectionExclusions: wet.map(place => ({ ref: place.ref, reason })) },
    before: { stage, wetPlaces: wet.map(({ ref, name, lon, lat }) => ({ ref, name, lon, lat })) },
  };
}

/** The outcome of the attempt that followed a retry. `scene` is the attempt's scene-source.json, when it exists. */
export function afterRecord(machineStages, scene) {
  const stages = Object.fromEntries(STAGES_THAT_DECIDE.map(name => [name, machineStages[name] === true]));
  return {
    passed: Object.values(stages).every(Boolean), stages,
    ...(scene && Number.isFinite(scene.triangles) ? { triangles: scene.triangles, triangleLimit: scene.triangleLimit } : {}),
  };
}

/** The record of the shortened derived state id (batch.mjs did it at selection): the same shape as a retry, so the receipt shows it. */
export function catalogueRecord(compaction, limit = 150) {
  if (!compaction?.stateId) return null;
  return { class: 'catalogue-row', change: { stateId: { ...compaction.stateId } }, before: { catalogueBytes: compaction.bytes.from, limit }, after: { catalogueBytes: compaction.bytes.to, limit, passed: compaction.bytes.to <= limit } };
}
