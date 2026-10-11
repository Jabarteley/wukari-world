// Where the roster's files are served from. Each `?url` import makes the build copy the file to dist/assets/ under a content hash
// (so a new build is a new address). Imported only by the figure loader (figure.ts): these addresses are in the lazy body chunk,
// never in the first download. A file that is not there (a character that is off, whose files have not landed) is simply absent.
import type { RosterMeta } from './figure.ts';

const urls = import.meta.glob<string>('./assets/*.{glb,png,jpg}', { query: '?url', import: 'default', eager: true });
const metas = import.meta.glob<RosterMeta>('./assets/*.json', { import: 'default', eager: true });

/** The address of a file of src/scene/roster/assets/ by name (`m1-hero.glb`), or null when it is not shipped. */
export const rosterAsset = (name: string): string | null => urls[`./assets/${name}`] ?? null;
/** What the pipeline measured of a model (`m1-hero`): height, skeleton, mask name, eye placement and the texture's reference tones. */
export const rosterMeta = (key: string): RosterMeta | null => metas[`./assets/${key}.json`] ?? null;
