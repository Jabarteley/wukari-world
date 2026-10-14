import { mapEntryOf } from './mapEntry.ts'
export { mapEntryOf, MAP_ENTRY_CODES } from './mapEntry.ts'
/** Lightweight atlas identity and breadcrumb metadata. No map runtime or geometry imports. */
export type ContinentId = 'af' | 'eu' | 'as' | 'na' | 'sa' | 'oc' | 'an'
export type AtlasLevelId = 'world' | 'africa' | 'nigeria' | 'europe' | 'asia' | 'north-america' | 'south-america' | 'oceania' | 'antarctica'
export interface AtlasLevelMetadata {
  readonly id: AtlasLevelId
  readonly name: string
  readonly parent?: AtlasLevelId
  readonly continent?: ContinentId
}
/** Indices match the lazy atlas registry; Africa/Nigeria keep their established positions. */
export const ATLAS_LEVEL_METADATA: readonly AtlasLevelMetadata[] = Object.freeze([
  { id: 'world', name: 'World' },
  { id: 'africa', name: 'Africa', parent: 'world', continent: 'af' },
  { id: 'nigeria', name: 'Nigeria', parent: 'africa' },
  { id: 'europe', name: 'Europe', parent: 'world', continent: 'eu' },
  { id: 'asia', name: 'Asia', parent: 'world', continent: 'as' },
  { id: 'north-america', name: 'North America', parent: 'world', continent: 'na' },
  { id: 'south-america', name: 'South America', parent: 'world', continent: 'sa' },
  { id: 'oceania', name: 'Oceania', parent: 'world', continent: 'oc' },
  { id: 'antarctica', name: 'Antarctica', parent: 'world', continent: 'an' },
])
// Country/territory membership derives from WORLD.c at 81b993bb. Existing atlas checks verify alignment.
const continentCountries: Readonly<Record<ContinentId, ReadonlySet<string>>> = {
  af: new Set(["ao","bf","bi","bj","bw","cd","cf","cg","ci","cm","cv","dj","dz","eg","eh","er","et","ga","gh","gm","gn","gq","gw","ke","km","lr","ls","ly","ma","mg","ml","mr","mu","mw","mz","na","ne","ng","rw","sc","sd","sh","sl","sn","so","sol","ss","st","sz","td","tg","tn","tz","ug","za","zm","zw"]),
  eu: new Set(["ad","al","at","ax","ba","be","bg","by","ch","cz","de","dk","ee","es","fi","fo","fr","gb","gg","gr","hr","hu","ie","im","is","it","je","li","lt","lu","lv","mc","md","me","mk","mt","nl","no","pl","pt","ro","rs","ru","se","si","sk","sm","ua","va","xk"]),
  as: new Set(["ae","af","am","az","bd","bh","bn","bt","cn","cy","cyn","ge","hk","id","il","in","io","ioa","iq","ir","jo","jp","kas","kg","kh","kp","kr","kw","kz","la","lb","lk","mm","mn","mo","mv","my","np","om","ph","pk","ps","qa","sa","sg","sy","th","tj","tl","tm","tr","tw","uz","vn","ye"]),
  na: new Set(["ag","ai","aw","bb","bl","bm","bs","bz","ca","cr","cu","cw","dm","do","gd","gl","gt","hn","ht","jm","kn","ky","lc","mf","ms","mx","ni","pa","pm","pr","sv","sx","tc","tt","us","vc","vg","vi"]),
  sa: new Set(["ar","bo","br","cl","co","ec","fk","gy","pe","py","sr","uy","ve"]),
  oc: new Set(["as","atc","au","ck","fj","fm","gu","ki","mh","mp","nc","nf","nr","nu","nz","pf","pg","pn","pw","sb","to","tv","vu","wf","ws"]),
  an: new Set(["aq","gs","hm","tf"]),
};

export function countryAtlasLevel(rawId: string): AtlasLevelId | null {
  const id = mapEntryOf(rawId)
  if (id === 'ng') return 'nigeria'
  return ATLAS_LEVEL_METADATA.find(level => level.continent && continentCountries[level.continent].has(id))?.id ?? null
}
