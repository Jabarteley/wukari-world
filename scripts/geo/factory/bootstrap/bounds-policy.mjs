const POLICY = { playKm: 20, coreKm: 5, airportClearanceMetres: 1000, maximumAbsoluteLatitude: 75 };
const SIDES = ['westKm', 'eastKm', 'southKm', 'northKm'];

function checkFacts(facts) {
  if (!facts || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(facts.id ?? '')) throw Error('Invalid city id');
  if (!/^[a-z]{2}$/.test(facts.country?.idISOlower ?? '') || !facts.country?.name?.trim()) throw Error('Invalid country');
  if (!facts.name?.trim() || !facts.airport?.name?.trim() || !facts.airport?.id?.trim()) throw Error('City/airport metadata missing');
  // An outpost gateway (metadata-batch.py): `airport` is the mapped gateway node, so the same clearance and polar rules apply to it.
  if (facts.gateway !== undefined && (!['air', 'sea', 'land'].includes(facts.gateway?.mode) || !/^node\/[1-9][0-9]*$/.test(facts.gateway?.osmRef ?? '') || !facts.airport.sourceUrl?.endsWith(facts.gateway.osmRef))) throw Error('Invalid gateway');
  try { new Intl.DateTimeFormat('en', { timeZone: facts.timezone }); } catch { throw Error('Invalid IANA timezone'); }
  if (typeof facts.timezone !== 'string' || !facts.timezone.trim()) throw Error('Timezone required');
  for (const [label, point] of [['centre', facts.centre], ['airport', facts.airport]]) {
    if (!point || !Number.isFinite(point.lon) || !Number.isFinite(point.lat) || Math.abs(point.lon) > 180 || Math.abs(point.lat) > 90) throw Error(`${label}: finite WGS84 coordinates required`);
    if (Math.abs(point.lat) >= POLICY.maximumAbsoluteLatitude) throw Error(`${label}: polar latitude unsupported`);
  }
  if (Math.abs(facts.centre.lon - facts.airport.lon) > 180) throw Error('Antimeridian city/airport span unsupported');
}

function radiusBox(point, metres) {
  const latitude = metres / 110570;
  const longitude = metres / (111320 * Math.cos((Math.abs(point.lat) + latitude) * Math.PI / 180));
  return [point.lat - latitude, point.lon - longitude, point.lat + latitude, point.lon + longitude];
}

function checkBox(box, label) {
  const [south, west, north, east] = box;
  if (!box.every(Number.isFinite) || south >= north || west >= east) throw Error(`${label}: invalid ordered box`);
  if (west < -180 || east > 180 || east - west > 180) throw Error(`${label}: antimeridian/wide-longitude boxes unsupported`);
  if (south <= -POLICY.maximumAbsoluteLatitude || north >= POLICY.maximumAbsoluteLatitude) throw Error(`${label}: polar boxes unsupported`);
}

// A side cut below the default core half-width (two cities closer than 5 km to the shared edge, e.g. Marigot and Philipsburg) shrinks the
// default core to the smallest side minus this margin, so the core box stays strictly inside the play box. An explicit coreKm is kept as given.
export const CORE_SIDE_MARGIN_KM = 0.1;

export function proposeBounds(facts, overrides, geometry) {
  checkFacts(facts);
  const policy = { ...POLICY, ...overrides };
  for (const key of Object.keys(overrides ?? {})) if (!['playKm', 'coreKm', ...SIDES].includes(key)) throw Error(`Unsupported policy override ${key}`);
  const smallestSide = Math.min(...SIDES.map(key => policy[key] ?? policy.playKm));
  // Only when no coreKm is given and a side is below the default core: every box that was valid before keeps exactly the same policy.
  if (overrides?.coreKm === undefined && smallestSide < POLICY.coreKm && smallestSide > CORE_SIDE_MARGIN_KM) policy.coreKm = smallestSide - CORE_SIDE_MARGIN_KM;
  if (![policy.playKm, policy.coreKm].every(value => Number.isFinite(value) && value > 0) || policy.coreKm > policy.playKm) throw Error('coreKm/playKm must be finite positive half-widths with coreKm <= playKm');
  // Optional one-sided extents (westKm, eastKm, southKm, northKm; each defaults to playKm): two neighbouring cities can meet on a
  // shared edge without shrinking their other sides. Each side is the matching side of the symmetric box of that size, so with no
  // side given the box is exactly the playKm box.
  const side = key => policy[key] ?? policy.playKm;
  for (const key of SIDES) if (!(Number.isFinite(side(key)) && side(key) > 0 && policy.coreKm <= side(key))) throw Error(`${key} must be a finite positive extent no smaller than coreKm`);
  const [south, west, north, east] = ['southKm', 'westKm', 'northKm', 'eastKm'].map((key, index) => radiusBox(facts.centre, side(key) * 1000)[index]);
  const base = [south, west, north, east], airport = radiusBox(facts.airport, policy.airportClearanceMetres);
  const play = [Math.min(base[0], airport[0]), Math.min(base[1], airport[1]), Math.max(base[2], airport[2]), Math.max(base[3], airport[3])];
  const core = radiusBox(facts.centre, policy.coreKm * 1000), margin = geometry.OUTLINE_MARGIN, reach = geometry.reachFor(play);
  const outline = [play[0] - margin, play[1] - margin, play[2] + margin, play[3] + margin];
  const wide = [play[0] - reach, play[1] - reach, play[2] + reach, play[3] + reach];
  for (const [label, box] of Object.entries({ play, core, outline, wide })) checkBox(box, label);
  const longitudeScale = 111320 * Math.cos(facts.airport.lat * Math.PI / 180);
  const airportMarginMetres = Math.min((facts.airport.lon - play[1]) * longitudeScale, (play[3] - facts.airport.lon) * longitudeScale, (facts.airport.lat - play[0]) * 110570, (play[2] - facts.airport.lat) * 110570);
  if (airportMarginMetres < 900) throw Error('Computed airport clearance below 900m');
  return { policy, boxes: { play, core, outline, wide }, airportMarginMetres };
}

