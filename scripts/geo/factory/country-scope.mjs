import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { validateSourceInputs, cityExtractInput } from './source-inputs.mjs';

export const COUNTRY_SCOPE_KIND = 'osm-admin0-boundary-v1';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const hex = /^[a-f0-9]{64}$/;
const pointValid = p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90;

export function validateCountryScopePolicy(policy, country, datasetSha256) {
  assert.equal(policy?.kind, COUNTRY_SCOPE_KIND, 'exact OSM country policy required; pending country HOLD');
  assert.equal(policy.countryISO, country.toUpperCase(), 'country policy identity mismatch');
  for (const key of ['datasetSha256', 'receiptSha256', 'geometrySha256', 'scriptSha256']) assert.match(policy[key] ?? '', hex, `country ${key} pin required`);
  assert.equal(policy.datasetSha256, datasetSha256, 'country boundary and city extract PBF differ');
  // City sub-extract: the boundary was built from the full country file; policy.datasetSha256 names the city's PBF.
  if (policy.boundaryDatasetSha256 !== undefined) assert.match(policy.boundaryDatasetSha256, hex, 'boundary dataset pin');
  for (const key of ['receiptBytes', 'geometryBytes', 'relationId']) assert.ok(Number.isSafeInteger(policy[key]) && policy[key] > 0, `country ${key} pin required`);
  if (policy.boundaryKey !== undefined) assert.equal(policy.boundaryKey, policy.countryISO.toLowerCase(), 'boundary artifact key must match ISO');
  if (policy.boundaryJob !== undefined) {
    const job = policy.boundaryJob;
    assert.ok(Number.isSafeInteger(job.sourceRunId) && job.sourceRunId > 0);
    assert.match(job.sourceSha ?? '', /^[a-f0-9]{40}$/);
    assert.match(job.sourceArtifact ?? '', /^[A-Za-z0-9._-]+$/);
    if (job.artifactSubdirectory !== undefined) assert.equal(job.artifactSubdirectory, 'country-boundary', 'unsupported boundary artifact layout');
    if (job.jobName !== undefined) assert.ok(typeof job.jobName === 'string' && job.jobName.trim() === job.jobName && job.jobName.length > 0 && job.jobName.length <= 256 && !/[\u0000-\u001f\u007f]/.test(job.jobName), 'invalid boundary producer jobName pin');
  }
  return policy;
}


/** Failed matrix runs require proof of the exact pinned successful sibling job. */
export function verifyBoundaryProducer(producer, pin, repository, jobs = []) {
  assert.equal(producer.repository?.full_name, repository);
  assert.equal(producer.id, pin.sourceRunId);
  assert.equal(producer.head_sha, pin.sourceSha);
  assert.equal(producer.status, 'completed', 'boundary producer not completed');
  assert.ok(['success', 'failure'].includes(producer.conclusion), 'boundary producer conclusion unsupported');
  if (producer.conclusion === 'failure') assert.ok(pin.jobName, 'failed boundary matrix requires exact jobName pin');
  let job = null;
  if (pin.jobName !== undefined) {
    const matches = jobs.filter(candidate => candidate.name === pin.jobName);
    assert.equal(matches.length, 1, 'boundary producer jobName missing or ambiguous');
    job = matches[0];
    assert.equal(job.run_id, pin.sourceRunId, 'boundary job run mismatch');
    assert.equal(job.head_sha, pin.sourceSha, 'boundary job producer SHA mismatch');
    assert.equal(job.status, 'completed', 'boundary producer job not completed');
    assert.equal(job.conclusion, 'success', 'boundary producer job failed');
  }
  return job ? { id: job.id, name: job.name, runId: job.run_id, sourceSha: job.head_sha, status: job.status, conclusion: job.conclusion } : null;
}

function ringState([x, y], ring) {
  let inside = false;
  for (let i = 1; i < ring.length; i++) {
    const [ax, ay] = ring[i - 1], [bx, by] = ring[i];
    const cross = (x - ax) * (by - ay) - (y - ay) * (bx - ax);
    if (cross === 0 && x >= Math.min(ax, bx) && x <= Math.max(ax, bx) && y >= Math.min(ay, by) && y <= Math.max(ay, by)) return 'boundary';
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside ? 'inside' : 'outside';
}

export function loadCountryScope(root, policy, country, datasetSha256) {
  validateCountryScopePolicy(policy, country, datasetSha256);
  assert.ok(typeof policy.directory === 'string' && policy.directory, 'mapped boundary directory required; pending country HOLD');
  const directory = resolve(root, policy.directory), iso = policy.countryISO;
  const rawReceipt = readFileSync(join(directory, 'receipt.json'));
  assert.equal(rawReceipt.length, policy.receiptBytes);
  assert.equal(hash(rawReceipt), policy.receiptSha256, 'country receipt bytes mismatch');
  const receipt = JSON.parse(rawReceipt);
  assert.equal(receipt.schemaVersion, 1);
  assert.equal(receipt.status, 'OSM_COUNTRY_BOUNDARY_CANDIDATE');
  assert.equal(receipt.countryISO, iso);
  // City sub-extract: the receipt's source is the full country file (primary input); the city's PBF is the city-extract input.
  const cityExtract = cityExtractInput(receipt.source.sourceInputs);
  if (cityExtract) {
    assert.equal(cityExtract.sha256, datasetSha256, 'city extract PBF differs from the one paired with this boundary');
    assert.equal(receipt.source.sha256, receipt.source.sourceInputs[0].sha256, 'sub-extract boundary must be built from the primary file itself');
    assert.equal(policy.boundaryDatasetSha256, receipt.source.sha256, 'boundary dataset pin mismatch');
  } else {
    assert.equal(receipt.source.sha256, datasetSha256);
    assert.equal(policy.boundaryDatasetSha256, undefined, 'boundaryDatasetSha256 is only for a city sub-extract');
  }
  assert.ok(Number.isSafeInteger(receipt.source.bytes) && receipt.source.bytes > 0);
  assert.match(receipt.source.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(receipt.source.headerTimestamp.startsWith(receipt.source.date));
  const url = new URL(receipt.source.url);
  assert.ok(url.protocol === 'https:' && url.hostname === 'download.geofabrik.de' && url.pathname.endsWith('.osm.pbf') && !url.search && !url.hash);
  // A merged primary+neighbour PBF (source-merge.py): source.sha256/bytes are the merged file's, sourceInputs names the dated files.
  // A city sub-extract: source is the primary file; sourceInputs ends with the city-extract input the boundary is paired with.
  if (receipt.source.sourceInputs !== undefined) validateSourceInputs(receipt.source.sourceInputs, { url: receipt.source.url, date: receipt.source.date });
  assert.equal(receipt.scriptSha256, policy.scriptSha256, 'country assembler script pin mismatch');
  const relation = receipt.relation;
  assert.equal(relation.id, policy.relationId);
  assert.ok(Number.isSafeInteger(relation.version) && relation.version >= 0);
  // Reviewed per-table override (bootstrap/country-boundary.py load_relation_override; Palestine, relation 1703814 boundary=disputed without admin_level):
  // only this relation id with exactly its recorded expected tags and a written reason, pinned by the evidence file SHA-256. Every other receipt must be admin_level=2.
  const override = receipt.relationOverride ?? null;
  if (override) {
    assert.match(override.evidenceSha256 ?? '', hex, 'relation override evidence pin required');
    assert.equal(override.relationId, relation.id, 'relation override names another relation');
    assert.ok(typeof override.reason === 'string' && override.reason.trim().length >= 20, 'relation override needs a written reason');
    assert.ok(relation.tags.admin_level === override.expectedTags.admin_level && override.expectedTags.admin_level !== '2' && Object.entries(override.expectedTags).every(([key, value]) => relation.tags[key] === value), 'relation tags differ from the reviewed override');
  } else {
    assert.equal(relation.tags.boundary, 'administrative');
    assert.equal(relation.tags.admin_level, '2');
  }
  assert.ok(['boundary', 'multipolygon'].includes(relation.tags.type));
  const codes = ['ISO3166-1:alpha2', 'ISO3166-1'].filter(key => key in relation.tags).map(key => relation.tags[key]);
  assert.ok(codes.length && codes.every(code => code === iso), 'missing/conflicting country ISO tags');
  // A node cannot be a boundary edge: every node member (admin_centre, label, capital, highest_point, ...) is a non-boundary reference.
  const nonBoundary = member => member.type === 'n' || member.type === 'r' && ['subarea', 'land_area'].includes(member.role);
  // Reviewed non-boundary relation members (bootstrap/country-boundary.py load_reviewed_relation_members; Vatican City: relation 6474878,
  // role `part`, the Holy See's extraterritorial properties in Italy): each is named with its pinned version/timestamp/tags and a written
  // reason, the evidence file SHA-256 is recorded, it must be a real member of the country relation and never look like a country itself.
  const reviewedPolicy = receipt.memberRolePolicy.reviewedNonBoundaryRelationMembers ?? null;
  const reviewed = new Map();
  if (reviewedPolicy) {
    assert.match(reviewedPolicy.evidenceSha256 ?? '', hex, 'reviewed non-boundary relation member evidence pin required');
    assert.ok(Array.isArray(reviewedPolicy.members) && reviewedPolicy.members.length > 0, 'reviewed non-boundary relation members required');
    for (const item of reviewedPolicy.members) {
      assert.equal(item.type, 'r', 'only relation members can be reviewed as non-boundary references');
      assert.ok(Number.isSafeInteger(item.ref) && item.ref > 0 && typeof item.role === 'string' && !['', 'outer', 'inner', 'subarea', 'land_area'].includes(item.role), 'reviewed relation member needs a ref and a non-ring role');
      assert.ok(!reviewed.has(`${item.ref}/${item.role}`), 'duplicate reviewed relation member');
      assert.ok(Number.isSafeInteger(item.version) && item.version > 0 && typeof item.timestamp === 'string' && item.timestamp <= receipt.source.headerTimestamp.replace(' ', 'T'), 'reviewed relation member evidence version/timestamp');
      assert.ok(item.tags && typeof item.tags === 'object' && item.tags.admin_level !== '2' && !Object.keys(item.tags).some(key => key.startsWith('ISO3166-1')), 'reviewed relation member looks like a country boundary');
      assert.ok(typeof item.reason === 'string' && item.reason.trim().length >= 20, 'reviewed relation member needs a written reason');
      assert.equal(typeof item.presentInPbf, 'boolean');
      assert.ok(relation.members.some(member => member.type === 'r' && member.ref === item.ref && member.role === item.role), 'reviewed relation member is not a member of the country relation');
      reviewed.set(`${item.ref}/${item.role}`, item);
    }
  }
  const reviewedMember = member => member.type === 'r' && reviewed.has(`${member.ref}/${member.role}`);
  const relationMembers = relation.members.filter(member => !nonBoundary(member) && !reviewedMember(member));
  // Reviewed absent-member policy: maritime=yes ways wholly outside the Geofabrik clip, listed with the evidence file SHA-256.
  const absentPolicy = receipt.absentMemberPolicy ?? null;
  const omitted = new Map();
  if (absentPolicy) {
    assert.match(absentPolicy.evidenceSha256 ?? '', hex, 'absent-member evidence pin required');
    assert.ok(Array.isArray(absentPolicy.omittedAbsentMaritimeWays) && absentPolicy.omittedAbsentMaritimeWays.length > 0);
    for (const way of absentPolicy.omittedAbsentMaritimeWays) {
      assert.ok(Number.isSafeInteger(way.id) && !omitted.has(way.id), 'duplicate omitted absent way');
      // Only an evidence file that declared wholeSeparateRings (with its written reason) may omit non-maritime ways (overseas rings, France).
      if (absentPolicy.wholeSeparateRings === true) assert.ok(typeof absentPolicy.reason === 'string' && absentPolicy.reason.trim().length >= 20, 'wholeSeparateRings needs its written reason');
      else assert.equal(way.tags?.maritime, 'yes', 'only maritime=yes ways may be omitted');
      // A reviewed tagException excuses only ABSENT boundary/admin_level keys (US way 42296616), with a written reason.
      const excused = new Set(way.tagException?.missingKeys ?? []);
      if (way.tagException !== undefined) {
        assert.deepEqual(Object.keys(way.tagException).sort(), ['missingKeys', 'reason'], 'tagException keys');
        assert.ok(excused.size > 0 && excused.size === way.tagException.missingKeys.length && [...excused].every(key => ['boundary', 'admin_level'].includes(key) && !(key in way.tags)), 'tagException may excuse only absent boundary/admin_level keys');
        assert.ok(typeof way.tagException.reason === 'string' && way.tagException.reason.trim().length >= 20, 'tagException needs a written reason');
      }
      if (!excused.has('boundary')) assert.equal(way.tags.boundary, 'administrative');
      if (!excused.has('admin_level')) assert.equal(way.tags.admin_level, '2');
      assert.ok(relationMembers.some(member => member.type === 'w' && member.ref === way.id), 'omitted way is not a member of the country relation');
      omitted.set(way.id, way);
    }
  }
  const members = relationMembers.filter(member => !(member.type === 'w' && omitted.has(member.ref)));
  assert.ok(members.length && members.every(member => member.type === 'w' && ['', 'outer', 'inner'].includes(member.role)), 'unsupported country boundary geometry member');
  assert.equal(new Set(members.map(member => member.ref)).size, members.length);
  assert.deepEqual(receipt.memberRolePolicy.unsupportedMembers, []);
  assert.deepEqual(receipt.memberRolePolicy.excludedNonBoundaryMembers, relation.members.filter(nonBoundary));
  assert.equal(receipt.memberWays.length, members.length);
  assert.equal(new Set(receipt.memberWays.map(way => way.id)).size, members.length);
  const memberById = new Map(members.map(member => [member.ref, member]));
  let memberEdges = 0;
  for (const way of receipt.memberWays) {
    assert.equal(way.role, memberById.get(way.id)?.role);
    assert.ok(memberById.has(way.id) && Number.isSafeInteger(way.nodeCount) && way.nodeCount >= 2);
    assert.match(way.nodeRefsSha256, hex);
    assert.match(way.geometrySha256, hex);
    memberEdges += way.nodeCount - 1;
  }
  assert.equal(receipt.assembly.method, 'pyosmium-area-assembly');
  assert.equal(receipt.assembly.completeMemberSegments, memberEdges);
  assert.match(receipt.assembly.sourceMemberEdgesSha256, hex);
  assert.equal(receipt.geometry.path, 'boundary.geojson');
  assert.equal(receipt.geometry.bytes, policy.geometryBytes);
  assert.equal(receipt.geometry.sha256, policy.geometrySha256);
  const rawGeometry = readFileSync(join(directory, 'boundary.geojson'));
  assert.equal(rawGeometry.length, policy.geometryBytes);
  assert.equal(hash(rawGeometry), policy.geometrySha256, 'country geometry bytes mismatch');
  const geometry = JSON.parse(rawGeometry);
  assert.ok(['Polygon', 'MultiPolygon'].includes(geometry.type));
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  assert.ok(Array.isArray(polygons) && polygons.length > 0);
  let edges = 0, holes = 0;
  for (const polygon of polygons) {
    assert.ok(Array.isArray(polygon) && polygon.length > 0);
    holes += polygon.length - 1;
    for (const ring of polygon) {
      assert.ok(Array.isArray(ring) && ring.length >= 4 && ring.every(pointValid));
      assert.deepEqual(ring[0], ring.at(-1), 'unclosed country ring');
      assert.ok(ring.slice(1).every((p, i) => Math.abs(p[0] - ring[i][0]) <= 180), 'antimeridian country policy pending; HOLD');
      edges += ring.length - 1;
    }
  }
  assert.equal(polygons.length, receipt.assembly.polygonCount);
  assert.equal(holes, receipt.assembly.holeCount);
  assert.equal(edges, receipt.assembly.completeMemberSegments, 'country assembly completeness mismatch');
  assert.ok(Array.isArray(receipt.fixtureResults));
  assert.ok(receipt.fixtureResults.every(check => ['inside', 'outside'].includes(check.expected) && check.actual === check.expected), 'country receipt has failed fixture checks');
  const classify = point => {
    assert.ok(pointValid(point), 'invalid country membership point');
    let inside = false;
    for (const polygon of polygons) {
      const states = polygon.map(ring => ringState(point, ring));
      if (states.includes('boundary')) return 'boundary';
      if (states[0] === 'inside' && states.slice(1).every(state => state === 'outside')) inside = true;
    }
    return inside ? 'inside' : 'outside';
  };
  for (const check of receipt.fixtureResults) assert.equal(classify(check.point), check.actual, `country fixture ${check.ref} does not match geometry`);
  const proof = { kind: policy.kind, iso, source: receipt.source, relation: { id: relation.id, version: relation.version, timestamp: relation.timestamp }, receiptSha256: policy.receiptSha256, geometrySha256: policy.geometrySha256, geometryBytes: policy.geometryBytes, scriptSha256: receipt.scriptSha256, assembly: receipt.assembly, ...(absentPolicy ? { absentMemberPolicy: absentPolicy } : {}), ...(reviewedPolicy ? { reviewedNonBoundaryRelationMembers: reviewedPolicy } : {}), ...(override ? { relationOverride: override } : {}), fixtureSha256: receipt.fixtureSha256, boundaryJob: policy.boundaryJob ?? null, limitation: 'OSM mapped national boundary; not legal jurisdiction or municipal membership' };
  return { policy: { ...policy, directory }, receipt: proof, classify, assertPoint(point, label) { assert.equal(classify(point), 'inside', `${label}: outside/on OSM country boundary ${iso}; HOLD`); } };
}

export function assertCountryFacts(scope, facts) {
  for (const key of ['centre', 'airport']) scope.assertPoint([facts[key].lon, facts[key].lat], key);
}
