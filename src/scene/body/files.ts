// Where the body's three files are served from. Each `?url` import makes the build copy the file to dist/assets/ under
// a content hash (so the server caches it for a year and a new build is a new address). Imported only by skinned.ts:
// these addresses are in the lazy body chunk, never in the first download.
import male from './assets/base-body-male.glb?url';
import female from './assets/base-body-female.glb?url';
import clips from './assets/clip-pack.glb?url';
import maleLod from './assets/base-body-male-lod.bin?url';
import femaleLod from './assets/base-body-female-lod.bin?url';

export const BODY_FILES = Object.freeze({ male, female, clips });
/** The near crowd's simplified index buffers (scripts/body/build-lod.ts), fetched only by createCrowdBodies. */
export const CROWD_LOD_FILES = Object.freeze({ male: maleLod, female: femaleLod });
