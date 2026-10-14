// Dynamic imports of the map hosts: fetched when the Map first shows (MapWorld.vue). Apart from ./loaders.ts, which the first download carries.
import { loadCityNetwork } from '../../game/cities/registry.ts'
import type { CityView, CityViewOptions, WorldMap, WorldMapOptions } from '../types/scene.ts'

export async function loadMaps(): Promise<{ createCityView: (container: HTMLElement, options?: CityViewOptions) => CityView; createWorldMap: (container: HTMLElement, options?: WorldMapOptions) => WorldMap; createZoomHost: typeof import('../../map3d/zoom-host.ts').createZoomHost }> {
  // The maps read other cities, states and routes as soon as their modules run: the world network is in before they are imported
  // (src/game/cities/registry.ts). It is usually in already: the page fetches it when idle after the game is ready.
  await loadCityNetwork()
  const [city, world, zoom] = await Promise.all([import('../../map3d/index.ts'), import('../../world-map.ts'), import('../../map3d/zoom-host.ts')])
  return { createCityView: city.createCityView, createWorldMap: world.createWorldMap, createZoomHost: zoom.createZoomHost }
}
