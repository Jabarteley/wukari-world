/**
 * Three.js keeps one morph-target texture per BufferGeometry (WebGLMorphtargets, a WeakMap keyed by the geometry). The character
 * runtime (src/scene/character-lab/runtime/characters.js isolateIndex) gives every body its own geometry object, so that each can
 * hide the skin under its own clothes, while sharing the body file's attributes and morph targets. Three therefore built, uploaded
 * and kept the same 14,517 × 84 float texture (19.5 MB) once per body: 78 MB of GPU memory and 30–40 ms of CPU per body when four
 * bodies were in the neighbourhood (measured 17 Oct 2026).
 *
 * This rewrites three's cache to be keyed by `geometry.morphAttributes` (the object those geometries share), with the set of
 * geometries that use an entry: the texture is freed when the last of them is disposed. The texture's content depends only on the
 * morph attributes and the vertex count, which sharing geometries have in common, so what is drawn is unchanged.
 *
 * Applied to three/build/three.module.js in the production build (a transform) and in the development server's dependency
 * pre-bundle (an esbuild plugin). If three's code changes so the rewrite no longer matches, the build fails rather than silently
 * shipping duplicated textures.
 */
export const THREE_MODULE = /node_modules[\\/]three[\\/]build[\\/]three\.module\.js$/;

const PARTS: readonly [from: string, to: string][] = [
  [
    '\t\tlet entry = morphTextures.get( geometry );\n',
    '\t\tconst morphKey = geometry.morphAttributes; // allworld: one texture for every geometry that shares these morph targets\n\t\tlet entry = morphTextures.get( morphKey );\n',
  ],
  // When the target count changes three disposes the old texture and builds a new entry; listeners left on the old entry's users
  // only ever touch that old entry (the identity check below), so they need no cleanup.
  [
    `\t\t\tentry = {
				count: morphTargetsCount,
				texture: texture,
				size: new Vector2( width, height )
			};

			morphTextures.set( geometry, entry );

			function disposeTexture() {

				texture.dispose();

				morphTextures.delete( geometry );

				geometry.removeEventListener( 'dispose', disposeTexture );

			}

			geometry.addEventListener( 'dispose', disposeTexture );

		}
`,
    `\t\t\tentry = {
				count: morphTargetsCount,
				texture: texture,
				size: new Vector2( width, height ),
				users: new Set()
			};

			morphTextures.set( morphKey, entry );

		}

		if ( ! entry.users.has( geometry ) ) {

			const shared = entry;
			shared.users.add( geometry );
			geometry.addEventListener( 'dispose', function release() {

				geometry.removeEventListener( 'dispose', release );
				if ( shared.users.delete( geometry ) && shared.users.size === 0 && morphTextures.get( morphKey ) === shared ) {

					shared.texture.dispose();
					morphTextures.delete( morphKey );

				}

			} );

		}
`,
  ],
];

/** The rewritten three.module.js source. Throws when a part is not found exactly once (three changed: look again). */
export function shareMorphTextures(code: string): string {
  let out = code;
  for (const [from, to] of PARTS) {
    const at = out.indexOf(from);
    if (at < 0 || out.indexOf(from, at + 1) >= 0) throw new Error(`three-shared-morphs: three's WebGLMorphtargets no longer matches (${JSON.stringify(from.slice(0, 60))}); update scripts/vite/three-shared-morphs.ts`);
    out = out.slice(0, at) + to + out.slice(at + from.length);
  }
  return out;
}
