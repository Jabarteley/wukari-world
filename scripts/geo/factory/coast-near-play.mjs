// Only coastline within NEAR_COAST_DEGREES of the play box (about 16 km) makes a city a sea city: the water box reaches 0.6 degrees past the play box, so a shore 40 km away
// (the Scheldt estuary north of Brussels) used to turn an inland city into a coast city whose far shore is cut off by the neighbouring country's clip.
export const NEAR_COAST_DEGREES = 0.15;

/** Metres of an OSM way geometry whose segments touch the play box widened by NEAR_COAST_DEGREES; play = [south, west, north, east]. */
export function nearCoastlineMetres(element, play) {
  const near = p => p.lat >= play[0] - NEAR_COAST_DEGREES && p.lat <= play[2] + NEAR_COAST_DEGREES && p.lon >= play[1] - NEAR_COAST_DEGREES && p.lon <= play[3] + NEAR_COAST_DEGREES;
  const geometry = element.geometry ?? [];
  return geometry.slice(1).reduce((sum, p, i) => !near(p) && !near(geometry[i]) ? sum
    : sum + Math.hypot((p.lon - geometry[i].lon) * 111320 * Math.cos(p.lat * Math.PI / 180), (p.lat - geometry[i].lat) * 111320), 0);
}
