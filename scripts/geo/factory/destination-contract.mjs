import assert from 'node:assert/strict';

/** Read resolved venue definitions, not the content wrapper's optional fields. */
export function slotPresentation(base, ids, slot) {
  const venue = base.venues.find(candidate => candidate.id === ids[slot]);
  const definition = venue?.definition;
  assert.ok(definition?.scene?.kind && definition.category && definition.icon, `Missing destination slot contract: ${slot}`);
  return { kind: definition.scene.kind, category: definition.category, icon: definition.icon };
}

/** Match buildDestinationContent's bare-zone label when no sourced unit exists. */
export function destinationNames(facts, area, roadHub) {
  return { ...facts.names, area, unit: facts.names?.unit ?? 'starter play zone', roadHub };
}

export function assertDestinationOutput(facts, places) {
  if (facts.names) for (const field of ['area', 'unit', 'roadHub']) assert.ok(typeof facts.names[field] === 'string' && facts.names[field].trim(), `Missing destination names.${field}`);
  for (const place of places) {
    for (const field of ['kind', 'category', 'icon', 'line']) assert.ok(typeof place[field] === 'string' && place[field].trim(), `${place.ref ?? place.osm}: missing destination ${field}`);
  }
}
