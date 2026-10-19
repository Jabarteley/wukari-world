import { readFile } from 'node:fs/promises';
import { draftCityRecipes } from '../../../scripts/scene-factory/layout.ts';
import type { CityBriefV1 } from '../../../scripts/scene-factory/facts.ts';
import { screenText } from '../../../server/moderation/text.ts';
import type { CityRecipesV1, MeasuredAsset } from './contract.ts';
import type { RecipeAssetRef, RecipeCityPack } from './pack.ts';
import { sha256 } from './pack.ts';

const fixture = new URL('./fixtures/runtime/', import.meta.url);
export async function fixtureAssets() {
  const kitReport = JSON.parse(await readFile(new URL('gulf-guinea.measurement.json', fixture), 'utf8')) as MeasuredAsset;
  const heroReport = JSON.parse(await readFile(new URL('accra.measurement.json', fixture), 'utf8')) as MeasuredAsset;
  const ref = (measurement: MeasuredAsset): RecipeAssetRef => ({ url: `/assets/scene-factory/${measurement.kind === 'kit' ? 'kits' : 'heroes'}/${measurement.id}-${measurement.sha256}.glb`, measurement });
  const kit = ref(kitReport), hero = ref(heroReport);
  const files = new Map([[kit.url, new URL('gulf-guinea.glb', fixture)], [hero.url, new URL('accra.glb', fixture)]]);
  return { kit, hero, files };
}
export async function fixturePack(): Promise<RecipeCityPack> {
  const assets = await fixtureAssets();
  const brief = JSON.parse(await readFile(new URL('accra.brief.json', fixture), 'utf8')) as CityBriefV1;
  // The canonical map is generated from the actual support signature audit, including near/goal states.
  const hostScenery = JSON.parse(await readFile(new URL('../../../scripts/scene-factory/host-scenery.json', import.meta.url), 'utf8')).cities.accra;
  const draft = draftCityRecipes({ brief, assets: { kit: assets.kit.measurement, hero: assets.hero.measurement }, screenText, hostScenery, heroVenueId: 'accra-market-game' });
  // These retained GLBs use the legacy atlas; keep this compatibility fixture explicitly V1.
  const pack: CityRecipesV1 = { ...draft, version: 1, recipes: draft.recipes.map(({ sky, surfaceStyle, ...recipe }) => ({ ...recipe, version: 1 })) };
  const text = `${JSON.stringify(pack)}\n`, bytes = new TextEncoder().encode(text);
  return { text, metadata: { schema: 'allworld-recipe-runtime', version: 1, city: 'accra', region: 'gulf-guinea', recipeBytes: bytes.length, recipeSha256: await sha256(bytes),
    targetVenueIds: brief.targetVenueIds, assets: { kit: assets.kit, hero: assets.hero }, hostScenery } };
}
export async function fixtureFetch(): Promise<{ reads: Map<string, number>; restore(): void }> {
  const { files } = await fixtureAssets(), original = globalThis.fetch, reads = new Map<string, number>();
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input instanceof Request ? input.url : input), 'http://native-character.test/');
    const file = files.get(url.pathname);
    if (file) { reads.set(url.pathname, (reads.get(url.pathname) ?? 0) + 1); return new Response(await readFile(file), { status: 200 }); }
    return original(input, init);
  };
  return { reads, restore() { globalThis.fetch = original; } };
}
