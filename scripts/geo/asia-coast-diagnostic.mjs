import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const APP_SHA = '81b993bbfb9afe96b5e5d0457ed090dbd7bd9214';
const PRODUCER_SHA = '62b845bb16c38ae48cc8468dd90f1dfe9153c4e4';
const RUN = 38180298812;
const ARTIFACT = `asia-factory-1targets-${PRODUCER_SHA}`;
const REPOSITORY = 'kromate/joinallworld';
const args = process.argv.slice(2), options = new Map();
for (let i = 0; i < args.length; i += 2) {
  assert.ok(['--workspace', '--sandbox-root', '--table'].includes(args[i]), `Unknown option ${args[i]}`);
  assert.ok(args[i + 1] && !args[i + 1].startsWith('--'), `Missing ${args[i]}`);
  assert.ok(!options.has(args[i]), `Duplicate ${args[i]}`);
  options.set(args[i], resolve(args[i + 1]));
}
for (const flag of ['--workspace', '--sandbox-root', '--table']) assert.ok(options.has(flag), `Missing ${flag}`);
const app = options.get('--workspace'), sandbox = options.get('--sandbox-root');
assert.ok(app.startsWith(sandbox + '/'), 'app must be the disposable sandbox checkout');
assert.equal(JSON.parse(readFileSync(join(app, '.factory-disposable.json'))).disposable, true);
const command = (name, argv) => {
  const result = spawnSync(name, argv, { encoding: 'utf8', timeout: 300000, maxBuffer: 8 * 1024 * 1024 });
  assert.ok(!result.error && result.status === 0, `${name}: ${result.error?.message ?? result.stderr}`);
  return result.stdout;
};
assert.equal(command('git', ['-C', app, 'rev-parse', 'HEAD']).trim(), APP_SHA);
assert.equal(command('git', ['-C', app, 'status', '--porcelain', '--untracked-files=no']).trim(), '');
assert.equal(process.env.GITHUB_REPOSITORY ?? REPOSITORY, REPOSITORY);
const out = join(sandbox, 'diagnostic');
mkdirSync(out, { recursive: true });
const report = { kind: 'dubai-coast-stage-diagnostic-v1', status: 'INCOMPLETE', appSHA: APP_SHA, generatedProducer: { runId: RUN, headSHA: PRODUCER_SHA, artifact: ARTIFACT }, scope: 'Diagnostic only; no generation, fix, runtime change, deployment or source-coverage acceptance.' };
const save = () => writeFileSync(join(out, 'dubai-coast-diagnostic.json'), JSON.stringify(report, null, 2) + '\n');
save();
try {
  const producer = JSON.parse(command('gh', ['api', `repos/${REPOSITORY}/actions/runs/${RUN}`]));
  assert.equal(producer.repository?.full_name, REPOSITORY);
  assert.equal(producer.id, RUN); assert.equal(producer.head_sha, PRODUCER_SHA);
  assert.equal(producer.status, 'completed'); assert.equal(producer.conclusion, 'success');
  const download = join(sandbox, 'downloads', ARTIFACT);
  mkdirSync(download, { recursive: true });
  command('gh', ['run', 'download', String(RUN), '--repo', REPOSITORY, '--name', ARTIFACT, '--dir', download]);
  const json = path => JSON.parse(readFileSync(path));
  const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
  const table = json(options.get('--table'));
  assert.equal(table.expectedSourceGitSHA, APP_SHA); assert.equal(table.targets.length, 1);
  const target = table.targets[0]; assert.equal(target.id, 'dubai');
  const plan = json(join(download, 'evidence/plan.json'));
  assert.equal(plan.pins.sourceGitSHA, APP_SHA); assert.equal(plan.pins.sourceWorkingTreeClean, true);
  const manifest = json(join(download, 'evidence/selection/dubai-manifest.json'));
  assert.deepEqual(manifest.extract.sha256, target.extractSha256);
  assert.deepEqual(manifest.facts, target.facts);
  const source = Object.fromEntries(['places', 'extras', 'water', 'landuse', 'roads'].map(layer => {
    const path = join(sandbox, 'extracts/dubai', layer + '.json');
    assert.equal(hash(path), target.extractSha256[layer], `${layer} pinned extract mismatch`);
    return [layer, json(path)];
  }));
  assert.equal(source.water.source.datasetSha256, target.sourceJob.datasetSha256);
  assert.equal(source.water.source.adapterSha256, target.sourceJob.adapterSha256);
  // Recipe value imports resolve exclusively from the disposable81 checkout.
  cpSync(join(download, 'delivery/recipes/dubai.ts'), join(app, 'scripts/geo/destination-detail/dubai.ts'));
  const imported = path => import(pathToFileURL(path).href);
  const [{ CONFIG }, { PLACES }, { TERRAIN }, { GEOMETRY }, { FACTS }, tools, checks, { toLocal }, { validateDestinationFacts }] = await Promise.all([
    imported(join(app, 'scripts/geo/destination-detail/dubai.ts')),
    ...['places', 'terrain', 'geometry', 'facts'].map(name => imported(join(download, `delivery/cities/dubai/${name}.ts`))),
    imported(join(app, 'scripts/geo/destination-detail/geometry-tools.ts')),
    imported(join(app, 'src/game/cities/africa/polygonCheck.ts')),
    imported(join(app, 'src/geo/frame.ts')),
    imported(join(app, 'src/game/cities/africa/types.ts')),
  ]);
  for (const [key, value] of Object.entries(manifest.config)) assert.deepEqual(CONFIG[key], value, `recipe ${key} differs from selection`);
  const elements = new Map([...source.places.elements, ...source.extras.elements].map(e => [`${e.type}/${e.id}`, e]));
  const labels = CONFIG.names.filter(n => n.kind === 'neighbourhood').map(n => {
    const e = elements.get(n.ref); assert.ok(e, `Missing ${n.ref}`);
    const point = e.type === 'node' ? e : e.center;
    return { ref: n.ref, lon: point.lon, lat: point.lat };
  });
  const anchors = [...PLACES.map(p => ({ ref: p.osm, name: p.name, lon: p.lon, lat: p.lat })), ...labels];
  assert.equal(PLACES.length, 24); assert.equal(labels.length, 18);
  const coast = source.water.elements.filter(e => e.type === 'way' && e.tags?.natural === 'coastline' && e.geometry);
  assert.equal(coast.length, 833);
  const [south, west, north, east] = CONFIG.box, reach = tools.reachFor(CONFIG.box);
  const outline = [south - tools.OUTLINE_MARGIN, west - tools.OUTLINE_MARGIN, north + tools.OUTLINE_MARGIN, east + tools.OUTLINE_MARGIN];
  const wide = [south - reach, west - reach, north + reach, east + reach];
  assert.deepEqual(source.water.source.boxes.wide, wide);
  const origin = validateDestinationFacts(FACTS).mapOrigin;
  const project = p => toLocal(origin, p[0], p[1]);
  const inRing = ([x, y], ring) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i], b = ring[j];
      if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
  };
  const inPolygon = (p, polygon) => inRing(p, polygon[0]) && !polygon.slice(1).some(ring => inRing(p, ring));
  const hits = (p, polygons) => polygons.flatMap((polygon, index) => inPolygon(p, polygon) ? [index] : []);
  const area = polygon => Math.abs(checks.signedArea(polygon[0])) - polygon.slice(1).reduce((sum, ring) => sum + Math.abs(checks.signedArea(ring)), 0);
  const extent = polygon => polygon.flat().reduce((b, p) => [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.max(b[2], p[0]), Math.max(b[3], p[1])], [Infinity, Infinity, -Infinity, -Infinity]);
  const tidy = ring => {
    const result = [];
    for (const p of ring) {
      const q = p.map(v => tools.round(v));
      if (!result.length || q[0] !== result.at(-1)[0] || q[1] !== result.at(-1)[1]) result.push(q);
    }
    if (result.length && (result[0][0] !== result.at(-1)[0] || result[0][1] !== result.at(-1)[1])) result.push(result[0]);
    return result;
  };
  const fallbackReasons = (polygon, tolerance) => [tolerance, tolerance / 2, tolerance / 4, tolerance * 2, tolerance * 4, tolerance * 8, tolerance * 16, tolerance / 8, 0].map(tol => {
    const rings = polygon.map(ring => tidy(tol > 0 ? tools.simplifyRing(ring, tol) : ring));
    const faithful = rings.map((ring, i) => ({ ring: i, vertices: ring.length, sourceArea: tools.ringArea(polygon[i]), candidateArea: tools.ringArea(ring) }));
    const areaFailures = faithful.filter(r => r.vertices < 4 || r.sourceArea <= 0 || r.candidateArea < r.sourceArea * 0.75 || r.candidateArea > r.sourceArea * 1.25);
    if (areaFailures.length) return { tolerance: tol, rejectedAt: 'ring fidelity', areaFailures };
    const holeFailures = rings.slice(1).flatMap((ring, i) => inRing(ring[0], rings[0]) ? [] : [i + 1]);
    if (holeFailures.length) return { tolerance: tol, rejectedAt: 'hole containment', holeFailures };
    const wound = rings.map((ring, i) => (i === 0) === (checks.signedArea(ring) > 0) ? ring : [...ring].reverse());
    const polygonProblem = checks.polygonProblem(wound);
    const triangulationProblem = polygonProblem ? null : checks.triangulationProblem(wound, project);
    return { tolerance: tol, rejectedAt: polygonProblem ? 'polygon topology' : triangulationProblem ? 'triangulation' : null, polygonProblem, triangulationProblem };
  });
  report.input = { sourceJob: target.sourceJob, extractHashes: target.extractSha256, coastWays: coast.length, closedCoastWays: coast.filter(e => e.geometry[0].lon === e.geometry.at(-1).lon && e.geometry[0].lat === e.geometry.at(-1).lat).length, anchors, config: manifest.config, wide, outline, generatedHashes: Object.fromEntries(['places', 'terrain', 'geometry', 'facts'].map(name => [name, hash(join(download, `delivery/cities/dubai/${name}.ts`))])) };
  report.mushrif = PLACES.filter(p => p.osm === 'way/311254501').map(p => ({ ref: p.osm, name: p.name, lon: p.lon, lat: p.lat, landHits: hits([p.lon, p.lat], GEOMETRY.land), playHits: hits([p.lon, p.lat], GEOMETRY.playArea ?? GEOMETRY.land) }));
  save();
  console.log('[DEBUG-dubai-coast] shoreWater start');
  const started = performance.now();
  const raw = tools.shoreWater(coast.map(e => e.geometry.map(p => [p.lon, p.lat])), anchors.map(p => [p.lon, p.lat]), outline, wide, CONFIG.sea.bandMetres, CONFIG.cell / CONFIG.split);
  report.shoreElapsedMs = performance.now() - started;
  // Raw polygons are inspected one by one with the unchanged81 safety helper.
  const safe = {}, stages = {};
  for (const [layer, tolerance] of [['band', CONFIG.waterTolerance], ['far', 0.0008]]) {
    safe[layer] = [];
    stages[layer] = [];
    for (let index = 0; index < raw[layer].length; index++) {
      const polygon = raw[layer][index], before = performance.now();
      const row = { index, rings: polygon.length, vertices: polygon.reduce((sum, ring) => sum + ring.length, 0), extent: extent(polygon), rawAreaSquareDegrees: area(polygon), rawPolygonProblem: checks.polygonProblem(polygon), rawTriangulationProblem: checks.triangulationProblem(polygon, project) };
      const kept = tools.safePolygons([polygon], tolerance, project);
      safe[layer].push(...kept);
      Object.assign(row, { retained: kept.length, retainedAreaSquareDegrees: kept.reduce((sum, p) => sum + area(p), 0), outputPolygonProblems: kept.map(p => checks.polygonProblem(p)), outputTriangulationProblems: kept.map(p => checks.triangulationProblem(p, project)), elapsedMs: performance.now() - before });
      row.areaLossSquareDegrees = row.rawAreaSquareDegrees - row.retainedAreaSquareDegrees;
      if (!kept.length) row.fallbackCandidates = fallbackReasons(polygon, tolerance);
      row.reasonScope = kept.length ? 'Accepted by unchanged81 helper' : 'Unchanged81 helper dropped this raw polygon. Recorded fallback candidates mirror its fidelity, hole, winding, topology and triangulation sequence. Independent-ring branch was not instrumented.';
      stages[layer].push(row);
      report.stages = stages; save();
      console.log(`[DEBUG-dubai-coast] ${layer} polygon${index} retained${kept.length} area${row.rawAreaSquareDegrees}`);
    }
  }
  report.summary = Object.fromEntries(['band', 'far'].map(layer => [layer, { rawPolygons: raw[layer].length, keptPolygons: safe[layer].length, rawAreaSquareDegrees: raw[layer].reduce((sum, p) => sum + area(p), 0), keptAreaSquareDegrees: safe[layer].reduce((sum, p) => sum + area(p), 0), dropped: stages[layer].filter(row => !row.retained).map(row => row.index) }]));
  report.anchorWater = anchors.map(p => ({ ...p, rawBand: hits([p.lon, p.lat], raw.band), rawFar: hits([p.lon, p.lat], raw.far), safeBand: hits([p.lon, p.lat], safe.band), safeFar: hits([p.lon, p.lat], safe.far), deliveredWater: hits([p.lon, p.lat], TERRAIN.water), deliveredReachWater: hits([p.lon, p.lat], TERRAIN.reachWater ?? []) }));
  const probes = [];
  for (const e of coast) for (let i = 1; i < e.geometry.length; i++) {
    const a = e.geometry[i - 1], b = e.geometry[i], lon = (a.lon + b.lon) / 2, lat = (a.lat + b.lat) / 2, scale = Math.cos(lat * Math.PI / 180);
    const dx = (b.lon - a.lon) * scale, dy = b.lat - a.lat, length = Math.hypot(dx, dy);
    if (length < 0.003 || lon < west || lon > east || lat < south || lat > north) continue;
    const p = [lon + dy / length * (1000 / 111000) / scale, lat - dx / length * (1000 / 111000)];
    const rawFar = hits(p, raw.far), safeFar = hits(p, safe.far);
    probes.push({ ref: `way/${e.id}`, segment: [[a.lon, a.lat], [b.lon, b.lat]], point: p, method: '1km right of directed source coastline; narrow bays can reach other land', rawFar, safeFar, deliveredReachWater: hits(p, TERRAIN.reachWater ?? []), interpretation: rawFar.length && !safeFar.length ? 'Water coverage disappears during simplification' : !rawFar.length ? 'Absent before simplification; inspect source connectivity/flood/contour or probe crossing other land' : 'Far water coverage retained' });
  }
  report.directedProbes = probes;
  report.runtimeSource = { baseline: APP_SHA, map: 'src/game/cities/africa/map.ts:62 forwards reachWater', module: 'src/map3d/cities/module.ts:202 chooses local(reachWater ?? geometry.water)', executed: false };
  report.status = 'DIAGNOSTIC_COMPLETE_NOT_ACCEPTANCE';
  report.remaining = ['Raw shoreWater combines flood and contour; absence before simplification does not isolate those two stages.', 'Source coastline/island completeness needs source correspondence review.', 'Actual projected runtime pack and browser acceptance remain separate gates.'];
  save();
  console.log('[DEBUG-dubai-coast] ' + JSON.stringify(report.summary));
} catch (error) {
  report.status = 'DIAGNOSTIC_FAILED'; report.error = error.message; save(); throw error;
}
