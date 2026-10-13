/**
 * The app's scripts/city/build-catalogue.ts (baseline appSha) refuses any city whose catalogue row plus loader row exceed 150 raw bytes.
 * The factory generates into that baseline, so it predicts the size from the facts before generation (same formulas as the app generator)
 * and, when the long derived state id is the reason, shortens it to the country code (precedent: kinshasa uses state id "cd").
 * Nothing else is shortened: the id, name, centre and country name are source facts. A row that is still too long is a precise HOLD
 * that needs an app change (or a shorter city id), never a hack.
 */
export const CATALOGUE_LIMIT = 150;
const quote = JSON.stringify;
/** Raw bytes the app adds for a destination city: the trimmed catalogue row plus the trimmed loader row (export name is always `city`). */
export function catalogueRowBytes(facts) {
    const nigeria = facts.country.idISOlower === 'ng' || facts.country.idISOlower === 'nigeria';
    const country = nigeria ? '' : `,${quote(facts.country.idISOlower)},${quote(facts.country.name)}`;
    const stateName = facts.state.name === facts.name ? '' : facts.state.name;
    // An outpost (generatedLinkPolicy 'authored-only') adds `,1` (app catalogue.ts CityCatalogueRow authoredOnly).
    const policy = facts.generatedLinkPolicy === 'authored-only' ? ',1' : '';
    const row = `[${quote(facts.id)},${quote(facts.name)},${quote(facts.state.idunique)},${quote(stateName)},${facts.centre.lon},${facts.centre.lat},1${country}${policy}],`;
    const loader = `()=>import(${quote(`./${facts.id}/index.ts`)}).then(m=>m.city),`;
    return Buffer.byteLength(row) + Buffer.byteLength(loader);
}
/** @returns { facts, bytes, compacted } where compacted records the old and new state id when it was shortened. */
export function fitCatalogueBudget(facts) {
    const before = catalogueRowBytes(facts);
    if (before <= CATALOGUE_LIMIT)
        return { facts, bytes: before, compacted: undefined };
    const short = facts.country.idISOlower;
    if (facts.state.idunique === short)
        return { facts, bytes: before, compacted: undefined };
    const next = { ...facts, state: { ...facts.state, idunique: short } };
    return { facts: next, bytes: catalogueRowBytes(next), compacted: { stateId: { from: facts.state.idunique, to: short }, bytes: { from: before, to: catalogueRowBytes(next) } } };
}
