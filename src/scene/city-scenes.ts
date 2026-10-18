/**
 * OWNER: scenes
 * EACH CITY'S OWN SCENES ARE A DOWNLOAD OF THEIR OWN. The scene host (src/venue-world.ts, src/scene/venue-scenes.ts) holds the
 * kinds every city draws with — and so every scene of the default city. A city's own scenes (its `scene.variant`s, and the
 * kinds it added) are fetched when a venue of THAT city is about to be shown, or a little ahead: while a trip to the city is
 * under way, and when the page starts in it. A player who never leaves one city never downloads another's.
 *
 *   await loadCityScenes(cityId)        fetch what the city needs (nothing for a city without scenes of its own); joins a fetch in flight
 *   cityScenesReady(cityId)             true once buildVenueScene(kit, venue, cityId) can run
 *   citySceneDef(cityId, kind, variant) the city's own scene for a kind and variant, else the kind it added, else null
 *
 * buildVenueScene is synchronous and throws for a city that is not ready: the caller (src/campus/unilag/world-adapter.ts)
 * awaits loadCityScenes first and draws nothing in the meantime, so a plain stand-in is never shown in a city scene's place.
 * A failed fetch is not remembered: the next loadCityScenes asks again (the adapter retries with src/lazy-load.ts).
 *
 * This module reads the already-loaded city content catalogue to decide whether the shared parametric adapter is needed.
 */
import { cachedCityContent, cityNetworkReady, loadCityContent, loadCityNetwork, playableCityIds } from '../game/cities/registry.ts';
import type { SceneDef } from './types.ts';

/** VARIANTS[kind][variant] of a scene file. */
export type SceneVariants = Readonly<Record<string, Readonly<Record<string, SceneDef>>>>;
export type ParametricSceneAdapter = Pick<typeof import('./parametric-venue.ts'), 'buildQuietParametricWorship' | 'decorateParametricVenue'>;
/** One downloaded piece: scene kinds a city added, and its scenes that replace a kind's own. */
export interface ScenePart { kinds?: Readonly<Record<string, SceneDef>>; variants?: SceneVariants; parametric?: ParametricSceneAdapter }

const FETCH = {
  ibadan: async (): Promise<ScenePart> => { const [own, variants] = await Promise.all([import('./venues-ibadan-a.ts'), import('./venues-ibadan-b.ts')]); return { kinds: own.SCENES, variants: variants.VARIANTS }; },
  campus: async (): Promise<ScenePart> => ({ kinds: (await import('./venues-campus.ts')).SCENES }),
  viewpoint: async (): Promise<ScenePart> => ({ kinds: (await import('./venues-viewpoint.ts')).SCENES }),
  'ogun-signature': async (): Promise<ScenePart> => ({ variants: (await import('./venues-ogun-a.ts')).VARIANTS }),
  'ogun-everyday': async (): Promise<ScenePart> => ({ variants: (await import('./venues-ogun-b.ts')).VARIANTS }),
  'port-harcourt': async (): Promise<ScenePart> => ({ variants: (await import('./venues-rivers.ts')).VARIANTS }),
  abuja: async (): Promise<ScenePart> => ({ variants: (await import('./venues-fct.ts')).VARIANTS }),
  'nigeria-runtime': async (): Promise<ScenePart> => { const { NIGERIA_RUNTIME_SCENES: scenes } = await import('./nigeria-runtime-scenes.ts'); return { variants: { market: { 'nigeria-broad-street': scenes.lagosMarket }, worship: { 'fct-mosque': scenes.abujaMosque } } }; },
  kano: async (): Promise<ScenePart> => ({ variants: (await import('./venues-kano.ts')).VARIANTS }),
  parametric: async (): Promise<ScenePart> => ({ parametric: await import('./parametric-venue.ts') }),
} satisfies Record<string, () => Promise<ScenePart>>;
type PartId = keyof typeof FETCH | `recipe:${string}`;

/** Explicit city pieces, searched before the shared pieces selected from its content. */
const CITY_PARTS: Readonly<Record<string, readonly PartId[]>> = Object.freeze({
  ibadan: ['ibadan'],
  abeokuta: ['ogun-signature', 'ogun-everyday'], 'ijebu-ode': ['ogun-signature', 'ogun-everyday'],
  ota: ['ogun-everyday'], sagamu: ['ogun-everyday'],
  'port-harcourt': ['port-harcourt'], abuja: ['nigeria-runtime', 'abuja'], lagos: ['nigeria-runtime'], kano: ['kano'],
});
/** On-demand scene kinds and the representative city used by the scene viewer. */
export const CITY_KINDS: Readonly<Record<string, string>> = Object.freeze({ quad: 'ibadan', hilltop: 'ibadan', lakeside: 'ibadan' });

const loaded = new Map<PartId, ScenePart>(), pending = new Map<PartId, Promise<ScenePart>>();
const hasKind = (cityId: string, kind: string): boolean => cachedCityContent(cityId)?.venues.some((venue) => venue.definition.scene.kind === kind) === true;
const hasParametricVenues = (cityId: string): boolean => cachedCityContent(cityId)?.venues.some((venue) => venue.definition.scene.design !== undefined) === true;
const partsOf = (cityId: string, authored = false): readonly PartId[] => [
  ...(Object.hasOwn(CITY_PARTS, cityId) ? CITY_PARTS[cityId]! : []),
  ...(hasKind(cityId, 'quad') ? ['campus' as const] : []),
  ...(hasKind(cityId, 'hilltop') ? ['viewpoint' as const] : []),
  ...(hasParametricVenues(cityId) ? ['parametric' as const] : []),
  ...(!authored && playableCityIds().includes(cityId) ? [`recipe:${cityId}` as const] : []),
];

/** Cities with scenes of their own. */
export const sceneCityIds = (): readonly string[] => playableCityIds();
// Transport venues draw their departure boards from the world network (src/scene/venues-transport.ts): a scene waits for it.
export const cityScenesReady = (cityId: string): boolean => cityNetworkReady() && partsOf(cityId).every((part) => loaded.has(part));

function loadPart(part: PartId): Promise<ScenePart> {
  const ready = loaded.get(part);
  if (ready) return Promise.resolve(ready);
  const waiting = pending.get(part);
  if (waiting) return waiting;
  const fetch = async () => {
    if (!part.startsWith('recipe:')) return FETCH[part as keyof typeof FETCH]();
    const city = part.slice(7);
    await Promise.all(partsOf(city, true).map(loadPart));
    return (await import('./recipe/load.ts')).loadRecipePart(city, (kind, variant) => {
      const found = citySceneDef(city, kind, variant, true);
      const shared = kind === 'quad' ? 'campus' : kind === 'hilltop' ? 'viewpoint' : null;
      return shared && CITY_KINDS[kind] !== city && found === loaded.get(shared)?.kinds?.[kind] ? null : found;
    });
  };
  const work = fetch().then((value) => { loaded.set(part, value); return value; }).finally(() => { if (pending.get(part) === work) pending.delete(part); });
  pending.set(part, work);
  return work;
}
/** Fetch a city's own scenes. Content comes first because it declares the shared lazy parts this city needs. */
export async function loadCityScenes(cityId: string, authored = false): Promise<void> { await Promise.all([loadCityContent(cityId), loadCityNetwork()]); await Promise.all(partsOf(cityId, authored).map(loadPart)); }
/** Factory input extraction must not depend on its own generated output. */
export const loadAuthoredCityScenes = (cityId: string): Promise<void> => loadCityScenes(cityId, true);
/** Fetch the shared parametric adapter explicitly (unit scene probes that construct a design without city content). */
export async function loadParametricScenes(): Promise<void> { await loadPart('parametric'); }
/** Every city's scenes (the scene viewer and the tests), including parts discovered only after content loads. */
export async function loadAllCityScenes(): Promise<void> { await Promise.all(playableCityIds().map(city => loadCityScenes(city))); }

/** The synchronous adapter after loadCityScenes/loadParametricScenes has prepared it. */
export const parametricSceneAdapter = (): ParametricSceneAdapter | null => loaded.get('parametric')?.parametric ?? null;

/** The city's own scene for a kind: the variant it asked for, else the kind itself where the city added it. Null: the shared kind is drawn. */
export function citySceneDef(cityId: string, kind: string, variant: string, authored = false): SceneDef | null {
  const parts = partsOf(cityId, authored);
  if (cityId === 'lagos' && kind === 'market' && !variant) return loaded.get('nigeria-runtime')?.variants?.market?.['nigeria-broad-street'] ?? null;
  for (const part of parts) { const variants = loaded.get(part)?.variants, own = variants && Object.hasOwn(variants, kind) ? variants[kind]! : null; if (own && Object.hasOwn(own, variant)) return own[variant]!; }
  for (const part of parts) { const kinds = loaded.get(part)?.kinds; if (kinds && Object.hasOwn(kinds, kind)) return kinds[kind]!; }
  return null;
}
/** The first loaded city that has a scene of its own for this kind and variant (the scene viewer builds a bare kind and variant with it). */
export const sceneCityOf = (kind: string, variant: string): string | null => sceneCityIds().find((cityId) => cityScenesReady(cityId) && citySceneDef(cityId, kind, variant)) ?? null;
