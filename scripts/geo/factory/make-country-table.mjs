#!/usr/bin/env node
// Emits a complete schemaVersion 2 country table (see README-batch.md) from a small spec.
// No dependencies; Node 18+ fetch only. Pins are resolved from the live sources, never typed from memory:
//   - Geofabrik: <path>-latest.osm.pbf redirect -> dated file (or spec 'geofabrikDate' YYMMDD: that dated file directly, e.g.
//     when -latest redirects to a mirror); bytes from HEAD content-length; md5 from the .md5 sidecar. Optional spec
//     'neighbours' [{geofabrik, reason}] and 'cityExtract' {geofabrik, reason} are pinned at the SAME date; the city
//     extract also pins the sha256 of both .poly files (README-batch.md, City sub-extract).
//   - OurAirports: airports.csv pinned by commit of davidmegginson/ourairports-data (GitHub API), raw URL by commit.
//   - Timezone: pinned bootstrap/timezone-data (zone1970.tab / iso3166.tab, hash-verified against timezone-source.json).
// City lat/lon are NEVER guessed: the spec must carry them with a 'centreSource' note.
//
//   node make-country-table.mjs --spec <spec.json | inline-json> --out <dir> [--airports-commit <40hex>] [--max-km 60]
//
// Spec: one object or an array (or {"countries":[...]}):
//   {iso:'LR', country:'Liberia', geofabrik:'africa/liberia', geofabrikDate:'261011' /* optional */,
//    neighbours:[{geofabrik:'africa/guinea', reason}] /* optional */, cityExtract:{geofabrik:'europe/germany/brandenburg', reason} /* optional */,
//    cities:[{id:'monrovia', name:'Monrovia', lat:6.3, lon:-10.8, centreSource:'GeoNames 2274895', airportIdent:'GLRB',
//             timezone:'Africa/Monrovia' /* required only for multi-zone countries */,
//             airportSourceUrl, cityOsmRef, sceneWaterExtent, namesUnit, selectionExclusions, geometry, playBox /* passed through */}]}
// Writes <out>/<iso-lower>.json (the table) and <out>/<iso-lower>-notes.json (proposals, checks, sources, retrieval times).
// Exit code 1 if any country fails; the failure reason is printed and no table is written for it.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TZ_DIR = join(HERE, 'bootstrap');
const GEOMETRY_SHA = '7a57e756a10b35a0eec9ec5928f083580fb9e7a9';
const AIRPORTS_REPO = 'davidmegginson/ourairports-data';
const MAX_KM_DEFAULT = 60;
const ELIGIBLE_TYPES = new Set(['large_airport', 'medium_airport']);
const SEED_PASSTHROUGH = ['cityOsmRef', 'sceneWaterExtent', 'namesUnit', 'selectionExclusions', 'geometry', 'playBox'];
const UA = { 'user-agent': 'allworld-make-country-table' };

class Refuse extends Error {}
const refuse = (message) => { throw new Refuse(message); };
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

async function http(url, options = {}) {
  let response;
  try { response = await fetch(url, { ...options, headers: { ...UA, ...(options.headers || {}) } }); }
  catch (error) { refuse(`network error for ${url}: ${error.cause?.code || error.message}`); }
  return response;
}

// ---- Geofabrik ---------------------------------------------------------------------------------------------
async function resolveGeofabrik(path, pinnedDate) {
  if (!/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(path)) refuse(`geofabrik path must look like 'africa/liberia' or 'russia': ${path}`);
  const slug = path.split('/').pop();
  const latest = `https://download.geofabrik.de/${path}-latest.osm.pbf`;
  let url, head = { status: null };
  if (pinnedDate !== undefined) {
    if (!/^\d{6}$/.test(pinnedDate)) refuse(`geofabrikDate must be YYMMDD: ${pinnedDate}`);
    url = `https://download.geofabrik.de/${path}-${pinnedDate}.osm.pbf`;
  } else {
    head = await http(latest, { method: 'HEAD', redirect: 'manual' });
    const location = head.headers.get('location');
    if (head.status < 300 || head.status >= 400 || !location) refuse(`${latest} did not redirect to a dated file (HTTP ${head.status}); check the Geofabrik path`);
    url = new URL(location, latest).href;
  }
  const match = /^https:\/\/download\.geofabrik\.de\/(?:(.+)\/)?([a-z0-9-]+)-(\d{6})\.osm\.pbf$/.exec(url);
  if (!match || [match[1], match[2]].filter(Boolean).join('/') !== path) refuse(`redirect target is not the dated file for ${path} (pass geofabrikDate to pin the dated file directly): ${url}`);
  const [, , , yymmdd] = match;
  const snapshotDate = `20${yymmdd.slice(0, 2)}-${yymmdd.slice(2, 4)}-${yymmdd.slice(4, 6)}`;
  if (Number.isNaN(Date.parse(snapshotDate)) || new Date(snapshotDate).toISOString().slice(0, 10) !== snapshotDate) refuse(`bad snapshot date in ${url}`);
  const dated = await http(url, { method: 'HEAD' });
  const bytes = Number(dated.headers.get('content-length'));
  if (!dated.ok || !Number.isSafeInteger(bytes) || bytes <= 0) refuse(`HEAD ${url} gave HTTP ${dated.status} and content-length ${dated.headers.get('content-length')}`);
  const sidecarUrl = `${url}.md5`;
  const sidecar = await http(sidecarUrl);
  if (!sidecar.ok) refuse(`${sidecarUrl} gave HTTP ${sidecar.status}`);
  const text = (await sidecar.text()).trim();
  const md = /^([0-9a-f]{32})\s+\*?(\S+)$/.exec(text);
  if (!md || md[2] !== `${slug}-${yymmdd}.osm.pbf`) refuse(`unexpected .md5 sidecar content for ${url}`);
  return {
    countrySource: { url, bytes, md5: md[1], snapshotDate },
    notes: { ...(pinnedDate === undefined ? { latestUrl: latest, redirectStatus: head.status } : { pinnedDate }), datedUrl: url, md5Sidecar: sidecarUrl, lastModified: dated.headers.get('last-modified'), retrievedAt: new Date().toISOString() },
  };
}

async function pinPoly(path) {
  const url = `https://download.geofabrik.de/${path}.poly`;
  const response = await http(url);
  if (!response.ok) refuse(`${url} gave HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!/^\S.*\n/.test(buffer.toString('utf8', 0, 200)) || !buffer.toString('utf8').trimEnd().endsWith('END')) refuse(`${url} is not an osmosis .poly file`);
  return { url, sha256: sha256(buffer), bytes: buffer.length };
}

// Same-snapshot extras: neighbour extracts and the city sub-extract are pinned at the primary's date (never -latest).
async function resolveExtras(spec, primary) {
  const yymmdd = primary.countrySource.url.match(/-(\d{6})\.osm\.pbf$/)[1];
  const reasonOf = (item, label) => (typeof item?.reason === 'string' && item.reason.trim() === item.reason && item.reason) || refuse(`${spec.iso}: ${label} needs a trimmed non-empty reason`);
  const extras = { notes: {} };
  if (spec.neighbours !== undefined) {
    if (!Array.isArray(spec.neighbours) || spec.neighbours.length < 1 || spec.neighbours.length > 3) refuse(`${spec.iso}: neighbours must list 1 to 3 {geofabrik, reason}`);
    extras.neighbours = [];
    extras.notes.neighbours = [];
    for (const item of spec.neighbours) {
      const pinned = await resolveGeofabrik(item.geofabrik, yymmdd);
      extras.neighbours.push({ ...pinned.countrySource, reason: reasonOf(item, 'neighbour') });
      extras.notes.neighbours.push(pinned.notes);
    }
  }
  if (spec.cityExtract !== undefined) {
    const pinned = await resolveGeofabrik(spec.cityExtract.geofabrik, yymmdd);
    const [poly, primaryPoly] = [await pinPoly(spec.cityExtract.geofabrik), await pinPoly(spec.geofabrik)];
    extras.cityExtract = { ...pinned.countrySource, reason: reasonOf(spec.cityExtract, 'cityExtract'), polyUrl: poly.url, polySha256: poly.sha256, primaryPolyUrl: primaryPoly.url, primaryPolySha256: primaryPoly.sha256 };
    extras.notes.cityExtract = { ...pinned.notes, poly, primaryPoly };
  }
  return extras;
}

// ---- OurAirports -------------------------------------------------------------------------------------------
function githubHeaders() {
  const headers = { accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`; // value is never printed
  return headers;
}

async function pinAirports(commitArg) {
  let sha, timestamp, apiUrl;
  if (commitArg) {
    if (!/^[0-9a-f]{40}$/.test(commitArg)) refuse('--airports-commit must be a 40-hex sha');
    apiUrl = `https://api.github.com/repos/${AIRPORTS_REPO}/commits/${commitArg}`;
  } else {
    apiUrl = `https://api.github.com/repos/${AIRPORTS_REPO}/commits?path=airports.csv&per_page=1`;
  }
  const response = await http(apiUrl, { headers: githubHeaders() });
  if (!response.ok) refuse(`GitHub API ${apiUrl} gave HTTP ${response.status}${response.status === 403 ? ' (rate limited; pass --airports-commit to reuse a known pin, or set GITHUB_TOKEN)' : ''}`);
  const body = await response.json();
  const commit = Array.isArray(body) ? body[0] : body;
  sha = commit?.sha;
  timestamp = commit?.commit?.committer?.date;
  if (!/^[0-9a-f]{40}$/.test(sha || '') || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(timestamp || '')) refuse('unexpected GitHub commit response');
  const url = `https://raw.githubusercontent.com/${AIRPORTS_REPO}/${sha}/airports.csv`;
  const csv = await http(url);
  if (!csv.ok) refuse(`${url} gave HTTP ${csv.status}`);
  const buffer = Buffer.from(await csv.arrayBuffer());
  const rows = parseCsv(buffer.toString('utf8'));
  return {
    airports: { url, commit: sha, snapshotDate: timestamp.slice(0, 10), commitTimestamp: timestamp },
    rows,
    notes: { repo: `https://github.com/${AIRPORTS_REPO}`, commitApi: apiUrl, csvBytes: buffer.length, csvSha256: sha256(buffer), rows: rows.length, retrievedAt: new Date().toISOString() },
  };
}

function parseCsv(text) {
  const records = [];
  let field = '', record = [], quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { record.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      record.push(field); field = '';
      if (record.length > 1 || record[0] !== '') records.push(record);
      record = [];
    } else field += ch;
  }
  if (field !== '' || record.length) { record.push(field); records.push(record); }
  const header = records.shift();
  for (const needed of ['ident', 'type', 'name', 'latitude_deg', 'longitude_deg', 'iso_country', 'municipality', 'scheduled_service']) {
    if (!header.includes(needed)) refuse(`airports.csv lacks column ${needed}`);
  }
  return records.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

function airportFacts(row, km) {
  return { ident: row.ident, name: row.name, type: row.type, municipality: row.municipality, isoCountry: row.iso_country, scheduledService: row.scheduled_service, lat: Number(row.latitude_deg), lon: Number(row.longitude_deg), distanceKm: Math.round(km * 10) / 10 };
}

function chooseAirport(rows, city, iso, maxKm) {
  const inCountry = rows.filter((r) => r.iso_country === iso && r.latitude_deg && r.longitude_deg);
  const dist = (r) => haversineKm(city.lat, city.lon, Number(r.latitude_deg), Number(r.longitude_deg));
  if (city.airportIdent) {
    const hits = rows.filter((r) => r.ident === city.airportIdent);
    if (hits.length !== 1) refuse(`${city.id}: airport ident ${city.airportIdent} is missing or ambiguous in the pinned CSV`);
    const row = hits[0];
    if (row.iso_country !== iso) refuse(`${city.id}: ${row.ident} is in ${row.iso_country}, not ${iso}`);
    if (!ELIGIBLE_TYPES.has(row.type)) refuse(`${city.id}: ${row.ident} is type ${row.type}; large_airport or medium_airport required`);
    if (row.scheduled_service !== 'yes') refuse(`${city.id}: ${row.ident} has scheduled_service=${row.scheduled_service || '(empty)'}; yes required`);
    if (!row.name) refuse(`${city.id}: ${row.ident} has no name`);
    const km = dist(row);
    if (km > maxKm) refuse(`${city.id}: ${row.ident} is ${km.toFixed(1)} km from the supplied city centre; limit ${maxKm} km`);
    return { row, km, proposed: false, alternatives: [] };
  }
  const eligible = inCountry.filter((r) => ELIGIBLE_TYPES.has(r.type) && r.scheduled_service === 'yes' && r.name)
    .map((r) => ({ row: r, km: dist(r) })).sort((a, b) => a.km - b.km);
  if (!eligible.length || eligible[0].km > maxKm) refuse(`${city.id}: no large/medium scheduled-service ${iso} airport within ${maxKm} km (nearest: ${eligible[0] ? `${eligible[0].row.ident} at ${eligible[0].km.toFixed(1)} km` : 'none'}); supply airportIdent after review`);
  return { row: eligible[0].row, km: eligible[0].km, proposed: true, alternatives: eligible.slice(1, 4).filter((e) => e.km <= maxKm).map((e) => airportFacts(e.row, e.km)) };
}

// ---- timezone ----------------------------------------------------------------------------------------------
function loadTimezoneSource() {
  const manifest = JSON.parse(readFileSync(join(TZ_DIR, 'timezone-source.json'), 'utf8'));
  const read = (key) => {
    const record = manifest.files[key];
    const buffer = readFileSync(join(TZ_DIR, record.path));
    if (buffer.length !== record.bytes || sha256(buffer) !== record.sha256) refuse(`pinned timezone file failed verification: ${record.path}`);
    return { text: buffer.toString('utf8'), record };
  };
  return { release: manifest.release, zone: read('zone1970'), countries: read('iso3166') };
}

function timezoneFor(tz, iso, wanted, cityId) {
  const rows = tz.zone.text.split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split('\t'))
    .filter((f) => f.length >= 3 && f[0].split(',').includes(iso));
  const ids = [...new Set(rows.map((f) => f[2]))];
  if (!ids.length) refuse(`${iso} has no row in the pinned zone1970.tab`);
  if (wanted) {
    if (!ids.includes(wanted)) refuse(`${cityId}: timezone ${wanted} is not a zone1970 row for ${iso} (rows: ${ids.join(', ')})`);
    return { id: wanted, ids, explicit: true };
  }
  if (ids.length > 1) refuse(`${cityId}: ${iso} has several zones (${ids.join(', ')}); set the city 'timezone' id explicitly`);
  return { id: ids[0], ids, explicit: false };
}

function isoCountryName(tz, iso) {
  const line = tz.countries.text.split('\n').find((l) => l && !l.startsWith('#') && l.split('\t')[0] === iso);
  return line ? line.split('\t')[1] : null;
}

// ---- build -------------------------------------------------------------------------------------------------
function checkSpec(spec) {
  if (!spec || typeof spec !== 'object') refuse('spec must be an object');
  if (!/^[A-Z]{2}$/.test(spec.iso || '')) refuse(`iso must be an upper-case ISO 3166-1 alpha-2 code, got ${JSON.stringify(spec.iso)}`);
  if (typeof spec.geofabrik !== 'string') refuse(`${spec.iso}: geofabrik path required (e.g. 'africa/liberia')`);
  if (!Array.isArray(spec.cities) || spec.cities.length < 1 || spec.cities.length > 6) refuse(`${spec.iso}: 1 to 6 cities required`);
  const seen = new Set();
  for (const c of spec.cities) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.id || '')) refuse(`${spec.iso}: city id must be kebab-case, got ${JSON.stringify(c.id)}`);
    if (seen.has(c.id)) refuse(`${spec.iso}: duplicate city id ${c.id}`);
    seen.add(c.id);
    if (typeof c.name !== 'string' || !c.name.trim()) refuse(`${c.id}: name required`);
    if (typeof c.lat !== 'number' || typeof c.lon !== 'number' || !Number.isFinite(c.lat) || !Number.isFinite(c.lon) || Math.abs(c.lat) > 90 || Math.abs(c.lon) > 180) {
      refuse(`${c.id}: numeric lat and lon are required; this tool never guesses coordinates (take them from GeoNames/Wikidata and cite them in 'centreSource')`);
    }
    if (typeof c.centreSource !== 'string' || !c.centreSource.trim()) refuse(`${c.id}: 'centreSource' (where lat/lon came from, e.g. 'GeoNames 2274895' or a Wikidata Q-id/URL) is required`);
    if (c.airportSourceUrl !== undefined && !/^https:\/\/[^\s/?#@]+(?:[/?#]\S*)?$/.test(c.airportSourceUrl)) refuse(`${c.id}: airportSourceUrl must be an https URL`);
  }
}

async function buildCountry(spec, shared, options) {
  checkSpec(spec);
  const iso = spec.iso;
  const tz = shared.tz;
  const isoName = isoCountryName(tz, iso);
  if (!isoName) refuse(`${iso} is not in the pinned iso3166.tab`);
  const geofabrik = await resolveGeofabrik(spec.geofabrik, spec.geofabrikDate);
  const extras = await resolveExtras(spec, geofabrik);
  const airports = await shared.airports();
  const seeds = [];
  const cityNotes = [];
  for (const city of spec.cities) {
    const pick = chooseAirport(airports.rows, city, iso, options.maxKm);
    const zone = timezoneFor(tz, iso, city.timezone, city.id);
    const seed = { id: city.id, name: city.name, countryISO: iso };
    for (const key of SEED_PASSTHROUGH) if (city[key] !== undefined) seed[key] = city[key];
    seed.airport = { ident: pick.row.ident, sourceUrl: city.airportSourceUrl || `https://ourairports.com/airports/${encodeURIComponent(pick.row.ident)}/` };
    seed.timezone = { id: zone.id, sourceUrl: tz.zone.record.url };
    seeds.push(seed);
    cityNotes.push({
      id: city.id, name: city.name,
      centre: { lat: city.lat, lon: city.lon, source: city.centreSource, usedFor: 'airport distance check only; the pipeline derives the real centre from the OSM city node' },
      airport: { ...airportFacts(pick.row, pick.km), proposal: pick.proposed, status: pick.proposed ? 'PROPOSED by nearest large/medium scheduled-service airport; needs human or helper review before queueing' : 'verified from spec airportIdent', sourceUrl: seed.airport.sourceUrl, alternatives: pick.alternatives },
      timezone: { id: zone.id, explicit: zone.explicit, zoneRowsForCountry: zone.ids, release: tz.release },
    });
  }
  const countrySource = { ...geofabrik.countrySource, ...(extras.neighbours ? { neighbours: extras.neighbours } : {}), ...(extras.cityExtract ? { cityExtract: extras.cityExtract } : {}) };
  const table = { schemaVersion: 2, geometrySourceSha: GEOMETRY_SHA, countrySource, airports: airports.pin, seeds };
  const notes = {
    generator: 'scripts/geo/factory/make-country-table.mjs',
    generatedAt: new Date().toISOString(),
    iso, country: spec.country ?? null, iso3166Name: isoName,
    countryNameNote: spec.country && spec.country !== isoName ? `spec country '${spec.country}' differs from pinned iso3166.tab '${isoName}' (informational; the table derives the name from iso3166.tab)` : null,
    anyAirportProposed: cityNotes.some((c) => c.airport.proposal),
    maxAirportKm: options.maxKm,
    sources: { geofabrik: { ...geofabrik.notes, ...extras.notes }, ourairports: airports.notes, timezone: { release: tz.release, zone1970: tz.zone.record, iso3166: tz.countries.record } },
    cities: cityNotes,
  };
  return { table, notes };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (!key.startsWith('--') || i + 1 >= argv.length) refuse(`bad arguments near ${key}; usage: --spec <file|json> --out <dir> [--airports-commit sha] [--max-km 60]`);
    args[key.slice(2)] = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.spec || !args.out) refuse('usage: make-country-table.mjs --spec <file|json> --out <dir> [--airports-commit sha] [--max-km 60]');
  const maxKm = args['max-km'] === undefined ? MAX_KM_DEFAULT : Number(args['max-km']);
  if (!(maxKm > 0)) refuse('--max-km must be positive');
  const raw = args.spec.trim().startsWith('{') || args.spec.trim().startsWith('[') ? args.spec : readFileSync(resolve(args.spec), 'utf8');
  let parsed;
  try { parsed = JSON.parse(raw); } catch (error) { refuse(`spec is not valid JSON: ${error.message}`); }
  const specs = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.countries) ? parsed.countries : [parsed];
  const out = resolve(args.out);
  mkdirSync(out, { recursive: true });
  const tz = loadTimezoneSource();
  let airportsPromise;
  const shared = { tz, airports: () => (airportsPromise ??= pinAirports(args['airports-commit']).then((a) => ({ ...a, pin: a.airports }))) };
  let failed = 0;
  for (const spec of specs) {
    const label = spec?.iso ?? '?';
    try {
      const { table, notes } = await buildCountry(spec, shared, { maxKm });
      const base = join(out, label.toLowerCase());
      writeFileSync(`${base}.json`, JSON.stringify(table, null, 2) + '\n');
      writeFileSync(`${base}-notes.json`, JSON.stringify(notes, null, 2) + '\n');
      console.log(`${label}: wrote ${base}.json and ${base}-notes.json${notes.anyAirportProposed ? ' (AIRPORT PROPOSED - review the notes file)' : ''}`);
    } catch (error) {
      if (!(error instanceof Refuse)) throw error;
      failed++;
      console.error(`${label}: REFUSED - ${error.message}`);
    }
  }
  if (failed) process.exitCode = 1;
}

main().catch((error) => { console.error(error instanceof Refuse ? `REFUSED - ${error.message}` : error); process.exit(1); });
