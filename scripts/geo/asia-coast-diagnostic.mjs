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
  const { names: generatedNames, ...generatedFacts } = manifest.facts;
  assert.deepEqual(generatedFacts, { ...target.facts, sourceUrl: target.metadataSources.pbf.url });
  assert.equal(generatedNames.area, target.name);
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
  assert.equal(generatedNames.roadHub, PLACES.find(place => place.slot === 'transit')?.name);
  assert.deepEqual(FACTS, manifest.facts);
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
  const tidy = (ring, precision = 5) => {
    const result = [];
    for (const p of ring) {
      const q = p.map(v => tools.round(v, precision));
      if (!result.length || q[0] !== result.at(-1)[0] || q[1] !== result.at(-1)[1]) result.push(q);
    }
    if (result.length && (result[0][0] !== result.at(-1)[0] || result[0][1] !== result.at(-1)[1])) result.push(result[0]);
    return result;
  };
  const fallbackReasons = (polygon, tolerance, precision = 5) => [tolerance, tolerance / 2, tolerance / 4, tolerance * 2, tolerance * 4, tolerance * 8, tolerance * 16, tolerance / 8, 0].map(tol => {
    const rings = polygon.map(ring => tidy(tol > 0 ? tools.simplifyRing(ring, tol) : ring, precision));
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
  const sampleProbes = [];
  for (const e of coast) for (let i = 1; i < e.geometry.length; i++) {
    const a = e.geometry[i - 1], b = e.geometry[i], lon = (a.lon + b.lon) / 2, lat = (a.lat + b.lat) / 2, scale = Math.cos(lat * Math.PI / 180);
    const dx = (b.lon - a.lon) * scale, dy = b.lat - a.lat, length = Math.hypot(dx, dy);
    if (length < 0.003 || lon < west || lon > east || lat < south || lat > north) continue;
    sampleProbes.push({ role: 'directed-coast-probe', ref: `way/${e.id}`, segment: [[a.lon, a.lat], [b.lon, b.lat]], lon: lon + dy / length * (1000 / 111000) / scale, lat: lat - dx / length * (1000 / 111000) });
  }
  const originalPath = join(app, 'scripts/geo/destination-detail/geometry-tools.ts');
  const original = readFileSync(originalPath, 'utf8');
  const replaceOnce = (source, needle, replacement) => {
    assert.equal(source.split(needle).length, 2, 'Expected unique exact81 instrumentation seam');
    return source.replace(needle, replacement);
  };
  const barrierSeam = '  // A land point sitting on a barrier cell counts for the regions beside it.';
  let instrumented = replaceOnce(original, barrierSeam, '  const diagnosticDirectLand = [...hasLand];\n' + barrierSeam);
  const returnSeam = '  return { far: contour(blur(water, cols, rows, 1.6), cols, rows, wide, cell, 0.5), band: contour(blur(band, cols, rows, 1.6), cols, rows, wide, cell, 0.5) };';
  const injection = `  const diagnosticComponents = hasLand.map((land, id) => ({ id, cells: 0, hasLand: land, directAnchorLand: diagnosticDirectLand[id], boundaryCells: 0, anchors: [] }));
  let diagnosticBarrierCells = 0, diagnosticWaterCells = 0, diagnosticBandCells = 0;
  for (let at = 0; at < region.length; at++) {
    const id = region[at], c = at % cols, r = (at - c) / cols;
    if (id >= 0) { diagnosticComponents[id].cells++; if (c === 0 || r === 0 || c === cols - 1 || r === rows - 1) diagnosticComponents[id].boundaryCells++; }
    if (barrier[at]) diagnosticBarrierCells++;
    if (water[at]) diagnosticWaterCells++;
    if (band[at]) diagnosticBandCells++;
  }
  const diagnosticSample = p => {
    const c = colOf(p.lon), r = rowOf(p.lat), at = r * cols + c;
    if (c < 0 || r < 0 || c >= cols || r >= rows) return { ...p, c, r, outsideGrid: true };
    const neighbours = [c > 0 ? at - 1 : -1, c < cols - 1 ? at + 1 : -1, r > 0 ? at - cols : -1, r < rows - 1 ? at + cols : -1];
    return { ...p, c, r, at, region: region[at], hasLand: region[at] >= 0 ? hasLand[region[at]] : null, barrier: Boolean(barrier[at]), waterMask: water[at], bandMask: band[at], adjacentRegions: [...new Set(neighbours.filter(n => n >= 0 && region[n] >= 0).map(n => region[n]))] };
  };
  const diagnosticAnchors = COAST_DIAGNOSTIC_INPUT.anchors.map(diagnosticSample);
  for (const p of diagnosticAnchors) {
    const ids = p.outsideGrid ? [] : p.barrier ? p.adjacentRegions : [p.region];
    for (const id of ids) if (id >= 0) diagnosticComponents[id].anchors.push({ ref: p.ref, lon: p.lon, lat: p.lat, viaBarrier: p.barrier });
  }
  COAST_DIAGNOSTIC_STATE = { cols, rows, cell, components: diagnosticComponents, barrierCells: diagnosticBarrierCells, waterMaskCells: diagnosticWaterCells, bandMaskCells: diagnosticBandCells, anchors: diagnosticAnchors, samples: COAST_DIAGNOSTIC_INPUT.samples.map(diagnosticSample) };
  const diagnosticFarField = blur(water, cols, rows, 1.6);
  let diagnosticFarAboveThreshold = 0;
  for (const value of diagnosticFarField) if (value >= 0.5) diagnosticFarAboveThreshold++;
  COAST_DIAGNOSTIC_STATE.farBlurAboveThresholdCells = diagnosticFarAboveThreshold;
  for (const p of COAST_DIAGNOSTIC_STATE.samples) if (!p.outsideGrid) p.farBlurValue = diagnosticFarField[p.at];
  const diagnosticFar = contour(diagnosticFarField, cols, rows, wide, cell, 0.5);
  const diagnosticBand = contour(blur(band, cols, rows, 1.6), cols, rows, wide, cell, 0.5);
  return { far: diagnosticFar, band: diagnosticBand };`;
  instrumented = replaceOnce(instrumented, returnSeam, injection);
  instrumented += '\nexport const COAST_DIAGNOSTIC_INPUT = { samples: [], anchors: [] };\nexport let COAST_DIAGNOSTIC_STATE = null;\n';
  const diagnosticPath = join(app, 'scripts/geo/destination-detail/geometry-tools-coast-diagnostic.ts');
  writeFileSync(diagnosticPath, instrumented, { flag: 'wx' });
  assert.equal(readFileSync(originalPath, 'utf8'), original, 'Original geometry helper changed');
  report.instrumentation = { originalSHA256: hash(originalPath), diagnosticSHA256: hash(diagnosticPath), exactReplacementSeams: 2, algorithm: 'Original flood, masks, blur and contour arguments preserved; bounded statistics and samples only; original module untouched.' };
  const diagnosticTools = await imported(diagnosticPath);
  diagnosticTools.COAST_DIAGNOSTIC_INPUT.anchors = anchors;
  diagnosticTools.COAST_DIAGNOSTIC_INPUT.samples = [...anchors.map(p => ({ ...p, role: 'land-anchor' })), ...sampleProbes];
  save();
  console.log('[DEBUG-dubai-coast] shoreWater start');
  const started = performance.now();
  const raw = diagnosticTools.shoreWater(coast.map(e => e.geometry.map(p => [p.lon, p.lat])), anchors.map(p => [p.lon, p.lat]), outline, wide, CONFIG.sea.bandMetres, CONFIG.cell / CONFIG.split);
  report.shoreElapsedMs = performance.now() - started;
  report.floodContour = diagnosticTools.COAST_DIAGNOSTIC_STATE;
  for (const sample of report.floodContour.samples) {
    const point = [sample.lon, sample.lat];
    sample.rawFarPolygons = hits(point, raw.far);
    sample.rawBandPolygons = hits(point, raw.band);
    sample.stageFinding = sample.outsideGrid ? 'outside grid' : !sample.waterMask ? 'absent in classified water mask before blur' : sample.farBlurValue < 0.5 ? 'water mask erased below blur threshold' : !sample.rawFarPolygons.length ? 'above blur threshold but absent from contour polygons at source point' : 'present through flood, blur and contour';
  }
  report.contourComparison = { rawFarPolygons: raw.far.length, rawBandPolygons: raw.band.length, rawFarAreaSquareDegrees: raw.far.reduce((sum, p) => sum + area(p), 0), rawBandAreaSquareDegrees: raw.band.reduce((sum, p) => sum + area(p), 0), referenceRun: 38180861307, scope: 'Compare with prior uninstrumented pinned diagnostic; no duplicate shore generation executed.' };
  const reference = { rawFarPolygons: 155, rawBandPolygons: 66, rawFarAreaSquareDegrees: 0.007295467456856386, rawBandAreaSquareDegrees: 0.002956918245217821 };
  report.contourComparison.reference = reference;
  report.contourComparison.matchesReference = Object.entries(reference).every(([key, value]) => Math.abs(report.contourComparison[key] - value) <= (key.includes('Area') ? 1e-12 : 0));
  save();
  assert.ok(report.contourComparison.matchesReference, 'Instrumented output differs from unchanged pinned diagnostic; HOLD');
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
  // Candidate stays in a separate disposable module. Its only algorithm changes
  // are retaining closed coastline barriers and using directed coast evidence.
  const closedSeam = "    if (way.length < 2 || (way[0]![0] === way.at(-1)![0] && way[0]![1] === way.at(-1)![1])) continue;";
  let candidateSource = replaceOnce(instrumented, closedSeam, '    if (way.length < 2) continue;');
  const anchorSeam = '  for (const at of marked) if (barrier[at]) for (const next of [at - 1, at + 1, at - cols, at + cols]) if (next >= 0 && next < region.length && region[next]! >= 0) hasLand[region[next]!] = true;';
  const directedClassification = `  const coastVotes = hasLand.map((_, id) => ({ id, land: 0, water: 0, cells: 0, evidence: [] }));
  for (const id of region) if (id >= 0) coastVotes[id].cells++;
  const rejected = { outsideGrid: 0, barrierCell: 0, wrongLocalSide: 0, closerSourceSegment: 0, obstructedPath: 0, missingPair: 0, sameComponentPair: 0, indexedSegments: 0, unindexedSegments: 0, acceptedPairs: 0 };
  const rejectedExamples = [], segmentIndex = new Map(), sourceSegments = [], binSize = cell * 8;
  const binX = x => Math.floor((x - wide[1]) / binSize), binY = y => Math.floor((y - wide[0]) / binSize);
  const binKey = (x, y) => x + ',' + y;
  for (let wayIndex = 0; wayIndex < shore.length; wayIndex++) for (let i = 1; i < shore[wayIndex].length; i++) {
    const a = shore[wayIndex][i - 1], b = shore[wayIndex][i], id = sourceSegments.length;
    sourceSegments.push({ a, b, wayIndex, segmentIndex: i - 1 });
    const x0 = binX(Math.min(a[0], b[0])), x1 = binX(Math.max(a[0], b[0])), y0 = binY(Math.min(a[1], b[1])), y1 = binY(Math.max(a[1], b[1]));
    if ((x1 - x0 + 1) * (y1 - y0 + 1) > 4096) { rejected.unindexedSegments++; continue; }
    rejected.indexedSegments++;
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
      const key = binKey(x, y), bucket = segmentIndex.get(key);
      if (bucket) bucket.push(id); else segmentIndex.set(key, [id]);
    }
  }
  const nearby = (x0, y0, x1, y1) => {
    const ids = new Set();
    for (let x = binX(x0); x <= binX(x1); x++) for (let y = binY(y0); y <= binY(y1); y++) for (const id of segmentIndex.get(binKey(x, y)) ?? []) ids.add(id);
    return [...ids].map(id => sourceSegments[id]);
  };
  const cross = (ax, ay, bx, by) => ax * by - ay * bx;
  const distanceSquared = (px, py, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / lengthSquared)) : 0;
    return (px - a[0] - t * dx) ** 2 + (py - a[1] - t * dy) ** 2;
  };
  const obstructs = (x, y, px, py, segment) => {
    const rx = px - x, ry = py - y, sx = segment.b[0] - segment.a[0], sy = segment.b[1] - segment.a[1];
    const denominator = cross(rx, ry, sx, sy);
    const qx = segment.a[0] - x, qy = segment.a[1] - y;
    if (Math.abs(denominator) < 1e-18) {
      if (Math.abs(cross(qx, qy, rx, ry)) > 1e-18) return false;
      const squared = rx * rx + ry * ry;
      const t0 = (qx * rx + qy * ry) / squared, t1 = ((segment.b[0] - x) * rx + (segment.b[1] - y) * ry) / squared;
      return Math.max(t0, t1) > 1e-9 && Math.min(t0, t1) <= 1 + 1e-9;
    }
    const t = cross(qx, qy, sx, sy) / denominator, u = cross(qx, qy, rx, ry) / denominator;
    return t > 1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9;
  };
  const reject = (reason, detail) => { rejected[reason]++; if (rejectedExamples.length < 24) rejectedExamples.push({ reason, ...detail }); };
  let missingSideSamples = 0;
  for (let wayIndex = 0; wayIndex < shore.length; wayIndex++) {
    const way = shore[wayIndex];
    for (let i = 1; i < way.length; i++) {
      const a = way[i - 1], b = way[i], dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
      if (!length) continue;
      // A vote is cast only as a validated opposite-side pair. A sample cannot
      // jump another shoreline or be closer to a different source segment.
      const count = Math.max(1, Math.ceil(length / (cell * 2)));
      for (let sample = 0; sample < count; sample++) {
        const t = (sample + 0.5) / count, x = a[0] + t * dx, y = a[1] + t * dy;
        const pair = [];
        for (const side of [1, -1]) {
          let accepted = null;
          for (const offset of [0.6, 0.9, 1.25, 1.75, 2.5, 4]) {
            const px = x - side * dy / length * cell * offset, py = y + side * dx / length * cell * offset;
            const c = colOf(px), r = rowOf(py);
            const detail = { wayIndex, segmentIndex: i - 1, side, offsetCells: offset, point: [px, py] };
            if (c < 0 || r < 0 || c >= cols || r >= rows) { reject('outsideGrid', detail); continue; }
            const at = r * cols + c, id = region[at];
            if (barrier[at] || id < 0) { reject('barrierCell', detail); continue; }
            if (cross(dx, dy, px - a[0], py - a[1]) * side <= 0) { reject('wrongLocalSide', detail); continue; }
            const radius = cell * offset + cell * 0.01, intendedDistance = distanceSquared(px, py, a, b);
            const neighbours = nearby(Math.min(x, px) - radius, Math.min(y, py) - radius, Math.max(x, px) + radius, Math.max(y, py) + radius);
            const closer = neighbours.find(s => distanceSquared(px, py, s.a, s.b) < intendedDistance - 1e-16);
            if (closer) { reject('closerSourceSegment', { ...detail, competingWayIndex: closer.wayIndex, competingSegmentIndex: closer.segmentIndex }); continue; }
            const blocker = neighbours.find(s => !(s.wayIndex === wayIndex && s.segmentIndex === i - 1) && obstructs(x, y, px, py, s));
            if (blocker) { reject('obstructedPath', { ...detail, competingWayIndex: blocker.wayIndex, competingSegmentIndex: blocker.segmentIndex }); continue; }
            accepted = { ...detail, id, kind: side === 1 ? 'land' : 'water' }; break;
          }
          if (!accepted) missingSideSamples++;
          pair.push(accepted);
        }
        if (!pair[0] || !pair[1]) { reject('missingPair', { wayIndex, segmentIndex: i - 1, point: [x, y] }); continue; }
        if (pair[0].id === pair[1].id) { reject('sameComponentPair', { wayIndex, segmentIndex: i - 1, point: [x, y], region: pair[0].id }); continue; }
        rejected.acceptedPairs++;
        for (const evidence of pair) {
          const vote = coastVotes[evidence.id];
          vote[evidence.kind]++;
          if (vote.evidence.filter(e => e.kind === evidence.kind).length < 4) vote.evidence.push({ ...evidence, pairedRegion: pair.find(other => other.id !== evidence.id).id, segmentPoint: [x, y], validation: 'Distinct opposite-side components; intended segment nearest; source ray unobstructed' });
        }
      }
    }
  }
  for (const vote of coastVotes) {
    // Unresolved/conflicting regions are shown as land for diagnostic geometry only.
    // The report holds them explicitly rather than accepting invented water.
    hasLand[vote.id] = !(vote.water > 0 && vote.land === 0);
  }
  COAST_CLASSIFICATION_VOTES = { components: coastVotes, missingSideSamples, unresolvedLargeThresholdCells: 40, samplerCorrection: 'Validated paired sides with spatially indexed nearest-segment/path checks', counters: rejected, rejectedExamples };`;
  candidateSource = replaceOnce(candidateSource, anchorSeam, directedClassification);
  candidateSource += '\nexport let COAST_CLASSIFICATION_VOTES = null;\n';
  const candidatePath = join(app, 'scripts/geo/destination-detail/geometry-tools-coast-prototype.ts');
  writeFileSync(candidatePath, candidateSource, { flag: 'wx' });
  const candidateTools = await imported(candidatePath);
  candidateTools.COAST_DIAGNOSTIC_INPUT.anchors = anchors;
  candidateTools.COAST_DIAGNOSTIC_INPUT.samples = [...anchors.map(p => ({ ...p, role: 'land-anchor' })), ...sampleProbes];
  report.candidate = { status: 'INCOMPLETE', sourceSHA256: hash(candidatePath), method: 'Directed OSM coastline: land left, water right; closed coastline barriers retained. Only paired samples with distinct components, intended nearest source segment and unobstructed source ray cast votes. Anchors never classify land.', correctionReferenceRun: 38181382131, unresolvedLargeThresholdCells: 40 };
  save();
  console.log('[DEBUG-dubai-coast] directed candidate shoreWater start');
  const candidateStart = performance.now();
  const candidateRaw = candidateTools.shoreWater(coast.map(e => e.geometry.map(p => [p.lon, p.lat])), anchors.map(p => [p.lon, p.lat]), outline, wide, CONFIG.sea.bandMetres, CONFIG.cell / CONFIG.split);
  report.candidate.elapsedMs = performance.now() - candidateStart;
  const votes = candidateTools.COAST_CLASSIFICATION_VOTES;
  for (const component of votes.components) for (const evidence of component.evidence) evidence.sourceRef = `way/${coast[evidence.wayIndex].id}`;
  const conflicts = votes.components.filter(v => v.land > 0 && v.water > 0);
  const unresolved = votes.components.filter(v => !v.land && !v.water);
  const unresolvedLarge = unresolved.filter(v => v.cells >= votes.unresolvedLargeThresholdCells);
  Object.assign(report.candidate, { classification: votes, conflicts, unresolved, unresolvedLarge, floodContour: candidateTools.COAST_DIAGNOSTIC_STATE });
  save();
  const candidateSafe = {};
  report.candidate.layers = {};
  for (const [layer, tolerance] of [['band', CONFIG.waterTolerance], ['far', 0.0008]]) {
    const rows = [];
    candidateSafe[layer] = [];
    for (let index = 0; index < candidateRaw[layer].length; index++) {
      const polygon = candidateRaw[layer][index], kept = tools.safePolygons([polygon], tolerance, project);
      candidateSafe[layer].push(...kept);
      rows.push({ index, rawAreaSquareDegrees: area(polygon), retained: kept.length, retainedAreaSquareDegrees: kept.reduce((sum, p) => sum + area(p), 0), rawPolygonProblem: checks.polygonProblem(polygon), rawTriangulationProblem: checks.triangulationProblem(polygon, project) });
    }
    report.candidate.layers[layer] = { rawPolygons: candidateRaw[layer].length, keptPolygons: candidateSafe[layer].length, rawAreaSquareDegrees: candidateRaw[layer].reduce((sum, p) => sum + area(p), 0), keptAreaSquareDegrees: candidateSafe[layer].reduce((sum, p) => sum + area(p), 0), dropped: rows.filter(row => !row.retained), rows };
    save();
  }
  report.candidate.anchors = anchors.map(p => {
    const point = [p.lon, p.lat], sample = report.candidate.floodContour.anchors.find(a => a.ref === p.ref);
    return { ...p, component: sample?.region, componentSourceWater: sample?.region >= 0 ? votes.components[sample.region].water > 0 && votes.components[sample.region].land === 0 : null, rawFar: hits(point, candidateRaw.far), safeFar: hits(point, candidateSafe.far), rawBand: hits(point, candidateRaw.band), safeBand: hits(point, candidateSafe.band) };
  });
  report.candidate.sourceWaterAnchorsToReject = report.candidate.anchors.filter(p => p.componentSourceWater || p.rawFar.length || p.safeFar.length);
  report.candidate.probes = sampleProbes.map(p => ({ ...p, originalRawFar: hits([p.lon, p.lat], raw.far), originalSafeFar: hits([p.lon, p.lat], safe.far), candidateRawFar: hits([p.lon, p.lat], candidateRaw.far), candidateSafeFar: hits([p.lon, p.lat], candidateSafe.far) }));
  report.candidate.status = conflicts.length || unresolvedLarge.length || votes.counters.unindexedSegments ? 'HOLD_SOURCE_CLASSIFICATION' : 'CANDIDATE_CLASSIFICATION_ONLY_NOT_ACCEPTANCE';
  report.candidate.samplerRevisionNote = 'Collinear overlapping source rays are now rejected; this guard was absent from proof38181701418 and requires this cloud pass.';
  const precisionHelpers = new Map([[5, tools]]);
  const roundSeam = 'const roundPt = (p: P): P => [round(p[0]), round(p[1])];';
  for (const precision of [6, 7]) {
    const precisionPath = join(app, 'scripts/geo/destination-detail/geometry-tools-precision-' + precision + '.ts');
    const precisionSource = replaceOnce(original, roundSeam, `const roundPt = (p: P): P => [round(p[0], ${precision}), round(p[1], ${precision})];`);
    writeFileSync(precisionPath, precisionSource, { flag: 'wx' });
    precisionHelpers.set(precision, await imported(precisionPath));
  }
  const wind = rings => rings.map((ring, i) => (i === 0) === (checks.signedArea(ring) > 0) ? ring : [...ring].reverse());
  const inspectRings = (polygon, sourcePolygon) => {
    const polygonProblem = checks.polygonProblem(polygon);
    return {
    rings: polygon.length, holes: Math.max(0, polygon.length - 1),
    sameRingCount: polygon.length === sourcePolygon.length,
    polygonProblem, triangulationExecuted: !polygonProblem, triangulationProblem: polygonProblem ? null : checks.triangulationProblem(polygon, project),
    perRing: polygon.map((ring, i) => {
      const sourceArea = sourcePolygon[i] ? tools.ringArea(sourcePolygon[i]) : null, candidateArea = tools.ringArea(ring);
      return { index: i, vertices: ring.length, sourceVertices: sourcePolygon[i]?.length, sourceAreaSquareDegrees: sourceArea, areaSquareDegrees: candidateArea, areaRatio: sourceArea > 0 ? candidateArea / sourceArea : null, faithful: ring.length >= 4 && sourceArea > 0 && candidateArea >= sourceArea * 0.75 && candidateArea <= sourceArea * 1.25, holeInsideOuter: i === 0 || (ring.length > 0 && inRing(ring[0], polygon[0])) };
    }),
    };
  };
  report.candidate.precision = { status: 'INCOMPLETE', scope: 'Principal polygon per band/far only; all other original safe outputs and drops retained in the comparison. No flood/contour rerun.', originalHelperSHA256: hash(originalPath), helpers: Object.fromEntries([6, 7].map(p => [p, hash(join(app, 'scripts/geo/destination-detail/geometry-tools-precision-' + p + '.ts'))])), layers: {} };
  const principalResults = {};
  for (const [layer, tolerance] of [['band', CONFIG.waterTolerance], ['far', 0.0008]]) {
    const principalIndex = candidateRaw[layer].reduce((best, polygon, i, all) => best < 0 || area(polygon) > area(all[best]) ? i : best, -1);
    if (principalIndex < 0) { report.candidate.precision.layers[layer] = { error: 'No raw polygons' }; continue; }
    const principal = candidateRaw[layer][principalIndex];
    const layerReport = { principalIndex, rawAreaSquareDegrees: area(principal), raw: inspectRings(principal, principal), candidates: {} };
    principalResults[layer] = {};
    report.candidate.precision.layers[layer] = layerReport;
    save();
    for (const precision of [5, 6, 7]) {
      const rounded = wind(principal.map(ring => tidy(ring, precision)));
      const helper = precisionHelpers.get(precision), start = performance.now();
      const kept = helper.safePolygons([principal], tolerance, project);
      const roundTrip = JSON.parse(JSON.stringify(kept));
      const inspections = roundTrip.map(polygon => inspectRings(polygon, principal));
      const passes = kept.length === 1 && inspections.every(p => p.sameRingCount && !p.polygonProblem && !p.triangulationProblem && p.perRing.every(r => r.faithful && r.holeInsideOuter));
      const candidateReport = { precision, roundedSource: inspectRings(rounded, principal), retained: kept.length, output: inspections, passesRingAndRendererContract: passes, serializedRoundTripEqual: JSON.stringify(roundTrip) === JSON.stringify(kept), elapsedMs: performance.now() - start };
      if (!kept.length) candidateReport.fallbackCandidates = fallbackReasons(principal, tolerance, precision);
      layerReport.candidates[precision] = candidateReport;
      principalResults[layer][precision] = kept;
      save();
      console.log(`[DEBUG-dubai-coast] principal ${layer} precision${precision} retained${kept.length} passes${passes}`);
    }
  }
  const selectedPrecision = [5, 6, 7].find(p => ['band', 'far'].every(layer => report.candidate.precision.layers[layer].candidates?.[p]?.passesRingAndRendererContract));
  report.candidate.precision.selectedPrecision = selectedPrecision ?? null;
  report.candidate.precision.status = selectedPrecision === undefined ? 'HOLD_PRECISION_CONTRACT' : 'PRINCIPAL_PRECISION_PROTOTYPE_NOT_ACCEPTANCE';
  if (selectedPrecision !== undefined) {
    const serialized = Object.fromEntries(['band', 'far'].map(layer => [layer, principalResults[layer][selectedPrecision]]));
    writeFileSync(join(out, 'dubai-coast-principal-precision.json'), JSON.stringify({ precision: selectedPrecision, layers: serialized }) + '\n');
    report.candidate.precision.serializedGeometryArtifact = 'dubai-coast-principal-precision.json';
  }
  save();
  const features = [];
  for (const [stage, polygons] of [['raw-far', candidateRaw.far], ['safe-far', candidateSafe.far], ['safe-band', candidateSafe.band]]) polygons.forEach((polygon, index) => features.push({ type: 'Feature', properties: { stage, index, acceptance: report.candidate.status }, geometry: { type: 'Polygon', coordinates: polygon } }));
  for (const layer of ['band', 'far']) for (const precision of [5, 6, 7]) (principalResults[layer]?.[precision] ?? []).forEach((polygon, index) => features.push({ type: 'Feature', properties: { stage: `principal-${layer}-precision${precision}`, index, selected: precision === selectedPrecision, acceptance: report.candidate.precision.status }, geometry: { type: 'Polygon', coordinates: polygon } }));
  writeFileSync(join(out, 'dubai-coast-candidate.geojson'), JSON.stringify({ type: 'FeatureCollection', features }) + '\n');
  report.candidate.geometryArtifact = 'dubai-coast-candidate.geojson';
  report.candidate.remaining = ['Any conflicting coast votes or unresolved large component holds classification.', 'Source-water anchors require future source-selection rejection, not forced land discs.', 'Island fidelity, triangulation drops, full runtime mapping and visual acceptance remain unproven.'];
  report.runtimeSource = { baseline: APP_SHA, map: 'src/game/cities/africa/map.ts:62 forwards reachWater', module: 'src/map3d/cities/module.ts:202 chooses local(reachWater ?? geometry.water)', executed: false };
  report.status = 'DIAGNOSTIC_COMPLETE_NOT_ACCEPTANCE';
  report.remaining = ['Shared flood-component evidence can identify connected land/ocean classification; source closure/connectivity still requires correspondence review.', 'Source coastline/island completeness needs source correspondence review.', 'Actual projected runtime pack and browser acceptance remain separate gates.'];
  save();
  console.log('[DEBUG-dubai-coast] ' + JSON.stringify(report.summary));
} catch (error) {
  report.status = 'DIAGNOSTIC_FAILED'; report.error = error.message; save(); throw error;
}
