/** Versioned, transportable appearance/settings; no account or map data in these records. */
export const skinTones = ['#35221c','#503025','#714734','#925c40','#b87e58','#d5a17a','#ebc4a0','#f5d9bc'];
export const hairstyles = ['low-fade','buzz','short-afro','curly-afro','cornrows','box-braids','locs','bun'] as const;
export const outfits = ['tee','polo','jacket'] as const;
export const bodies = ['regular','slender','broad'] as const;
export interface Appearance { version: 1; preset: 'male'|'female'; skin: string; hair: typeof hairstyles[number]; hairColor: string; outfit: typeof outfits[number]; top: string; trousers: string; shoes: string; footwear: 'sneakers'|'boots'; body: typeof bodies[number] }
export interface Settings { version: 1; sensitivity: number; quality: 'low'|'balanced'|'high'; volume: number }
export const defaultAppearance: Appearance = {version:1,preset:'male',skin:'#714734',hair:'short-afro',hairColor:'#201b19',outfit:'polo',top:'#347f72',trousers:'#28384c',shoes:'#eee9dc',footwear:'sneakers',body:'regular'};
export const defaultSettings: Settings = {version:1,sensitivity:1,quality:'balanced',volume:0};
const color = (value: unknown, fallback: string) => typeof value==='string' && /^#[a-f\d]{6}$/i.test(value) ? value : fallback;
const pick = <T extends string>(value: unknown, options: readonly T[], fallback: T): T => options.includes(value as T) ? value as T : fallback;
const record = (input: unknown): Record<string,unknown> => input && typeof input==='object' ? input as Record<string,unknown> : {};
export function appearance(input: unknown): Appearance {
  const a=record(input), d=defaultAppearance;
  const legacy:Record<string,string>={crop:'low-fade',curls:'curly-afro',twists:'locs'};const hair=legacy[String(a.hair)]??a.hair;
  return {version:1,preset:pick(a.preset,['male','female'],d.preset),skin:color(a.skin,d.skin),hair:pick(hair,hairstyles,d.hair),hairColor:color(a.hairColor,d.hairColor),outfit:pick(a.outfit,outfits,d.outfit),top:color(a.top,d.top),trousers:color(a.trousers,d.trousers),shoes:color(a.shoes,d.shoes),footwear:pick(a.footwear,['sneakers','boots'],d.footwear),body:pick(a.body,bodies,d.body)};
}
export function settings(input: unknown): Settings {
  const a=record(input), range=(v: unknown,min:number,max:number,fallback:number)=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
  return {version:1,sensitivity:range(a.sensitivity,.3,2.5,1),quality:pick(a.quality,['low','balanced','high'],defaultSettings.quality),volume:range(a.volume,0,100,0)};
}
export function readLocal<T>(key: string, normalize: (v: unknown)=>T): T { try { return normalize(JSON.parse(localStorage.getItem(key)??'null')); } catch { return normalize(null); } }
export function saveLocal(key: string, value: Appearance|Settings): boolean { try { localStorage.setItem(key,JSON.stringify(value));return true; } catch { return false; } }
export const appearanceKey='wukari-life.appearance.v1', settingsKey='wukari-life.settings.v1';
