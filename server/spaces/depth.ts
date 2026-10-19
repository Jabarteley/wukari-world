/**
 * OWNER: spaces
 * THE DEPTH MODEL'S FILES (docs/WORLDS.md, phase 8: a world from a photo). A player's own device works out a photo's depth
 * (src/spaces/photo/depth.ts); it needs three files that are not part of the game's download:
 *
 *   GET /api/spaces/depth/ort.mjs      onnxruntime-web 1.30.0, dist/ort.wasm.bundle.min.mjs (MIT)
 *   GET /api/spaces/depth/ort.wasm     onnxruntime-web 1.30.0, dist/ort-wasm-simd-threaded.wasm (MIT)
 *   GET /api/spaces/depth/depth.onnx   onnx-community/depth-anything-v2-small, onnx/model_quantized.onnx (Apache-2.0)
 *
 * Each is kept in the model store (R2 on the Worker, files on Node) under its SHA-256, pinned here: only these exact bytes are ever
 * served. `scripts/spaces/depth-assets.ts` fetches them from their publishers, checks the hashes and stores them: into a local
 * folder, through wrangler into R2, or (needing only the operator token) through `POST /api/mod/spaces/depth/:name`, which keeps the
 * bytes only when their SHA-256 is the pinned one.
 * Served to players with a session while the `spacesPhotoWorlds` setting is on; a browser keeps them a week.
 */
import type { RouteContext, RouteRequest } from '../types.ts';
import { requireOperator } from '../routes/growth-mod.ts';

export const DEPTH_FILES = Object.freeze({
  'ort.mjs': { hash: '11e64bd8ffe11bd1a2a2f0d6275fdfbbba7262f0b76b99b53d228a8a22ef3d90', bytes: 73_054, type: 'text/javascript; charset=utf-8' },
  'ort.wasm': { hash: '3398c10d07d229bd91b364548e130e0e51a8e5704b88c7c083ebbeb78842dee2', bytes: 14_239_897, type: 'application/wasm' },
  'depth.onnx': { hash: 'fcf51f1b230362b28690bb9d1809bf0431f29cad20534e3f589bd7285547f20d', bytes: 27_258_801, type: 'application/octet-stream' },
});
export type DepthFile = keyof typeof DEPTH_FILES;

/** Whether a world may be made from a photo: the setting, worlds, uploads and the 3D view all on, and a model store. */
export const photoWorldsOn = (ctx: RouteContext): boolean => Boolean(ctx.models)
  && ['spacesPhotoWorlds', 'spacesWorlds', 'spacesModels', 'spaces3d'].every((key) => ctx.checks?.setting?.(key) === true);

export function depthService(ctx: RouteContext) {
  return {
    /** GET /api/spaces/depth/:name */
    async file(request: RouteRequest, publicId: string) {
      const name = request.params['name'] ?? '';
      if (!Object.hasOwn(DEPTH_FILES, name) || !photoWorldsOn(ctx)) throw ctx.fail(404, 'not_found');
      // A browser keeps them: a player fetches each once a week, a few times if they clear it.
      if (!ctx.allow(`spaces:depth:${publicId}`, 30, 3_600_000)) throw ctx.fail(429, 'rate_limited');
      const file = DEPTH_FILES[name as DepthFile];
      const bytes = await ctx.models!.get(file.hash);
      if (!bytes || bytes.byteLength !== file.bytes) throw ctx.fail(404, 'not_found');
      return { file: { bytes, type: file.type, cache: 'immutable' as const } };
    },
    /** POST /api/mod/spaces/depth/:name (operator; the body is the file): kept only if it is exactly the pinned file. */
    async put(request: RouteRequest) {
      requireOperator(ctx, request);
      const name = request.params['name'] ?? '';
      if (!Object.hasOwn(DEPTH_FILES, name)) throw ctx.fail(404, 'not_found');
      if (!ctx.models || !request.binaryBody) throw ctx.fail(503, 'not_ready');
      const file = DEPTH_FILES[name as DepthFile];
      const bytes = await request.binaryBody(file.bytes, ['application/octet-stream']);
      const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((b) => b.toString(16).padStart(2, '0')).join('');
      if (bytes.byteLength !== file.bytes || hash !== file.hash) throw ctx.fail(400, 'wrong_file');
      await ctx.models.put(file.hash, bytes);
      return { body: { ok: true, code: 'stored', name, bytes: bytes.byteLength }, headers: { 'Cache-Control': 'no-store' } };
    },
  };
}
