/** OWNER: scenes. Development-only: mounts the real venue host (night bloom, environment, tier) on ?loc=<venue id>. Not in the game. */
import { createVenueWorld } from '../venue-world.ts';
const params = new URLSearchParams(location.search);
await (await import('../game/cities/registry.ts')).loadCityContent('lagos');
const { loadAllCityScenes } = await import('./city-scenes.ts').catch(() => ({ loadAllCityScenes: async () => {} })) as { loadAllCityScenes?: () => Promise<void> };
await loadAllCityScenes?.();
const world = createVenueWorld(document.getElementById('stage')!, { location: params.get('loc') || 'park', cityId: 'lagos' });
(window as unknown as { __world: unknown }).__world = world;
const at = new Date(); at.setUTCHours(params.get('time') === 'night' ? 21 : 11, 0, 0, 0); // Lagos is UTC+1: 22:00 or 12:00
world.setState({ t: at.getTime() } as never);
world.resize?.();
world.update();
