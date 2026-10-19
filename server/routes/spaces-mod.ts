/**
 * OWNER: spaces
 * The operator's view of players' 3D models, under /api/mod/spaces (server/spaces/models.ts). Same access rules as the other
 * /api/mod routes (routes/growth-mod.ts operatorGuard): the operator's bearer token only.
 *
 *   GET  /api/mod/spaces/models                          reported or hidden models, newest first
 *   POST /api/mod/spaces/models { by, id, action }       remove (deleted, bytes swept), hide, or clear (visible for good)
 *   POST /api/mod/spaces/depth/:name  (the file)          store one of the depth model's three files for worlds from a photo
 *   POST /api/mod/spaces/switch { models?, world?, scripts?, worlds?, screen?, house?, photo? }   the `spacesModels`, `spaces3d`, `spacesScripts`, `spacesWorlds`, `spacesScreen`, `spacesHouseCopy` and `spacesPhotoWorlds` settings, as Admin → World → Settings changes them
 */
import { modelsService } from '../spaces/models.ts';
import { depthService } from '../spaces/depth.ts';
import { settingsOf } from '../admin/settings.ts';
import { operatorGuard } from './growth-mod.ts';
import type { RouteContext, RouteHandler, RouteKey } from '../types.ts';

/** The settings the operator's switch may change, by body field. */
const SWITCHES = { models: 'spacesModels', world: 'spaces3d', scripts: 'spacesScripts', worlds: 'spacesWorlds', screen: 'spacesScreen', house: 'spacesHouseCopy', photo: 'spacesPhotoWorlds' } as const;

export default function spacesOperatorRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const operator = operatorGuard(ctx);
  const models = modelsService(ctx), depth = depthService(ctx);
  return {
    // The depth model's files (server/spaces/depth.ts): the body is the file; kept only when it is exactly the pinned one.
    'POST /api/mod/spaces/depth/:name': (request) => depth.put(request),
    'GET /api/mod/spaces/models': operator((db) => models.queue(db)),
    'POST /api/mod/spaces/models': operator((db, _request, body) => models.moderate(db, body), { write: true }),
    'POST /api/mod/spaces/switch': async (request) => {
      const settings = settingsOf(ctx);
      let values: Record<string, { value: boolean | number | string }> | null = null;
      const answer = await operator((db, _request, body) => {
        const wanted = Object.entries(SWITCHES).filter(([field]) => body[field] !== undefined);
        if (!wanted.length || wanted.some(([field]) => typeof body[field] !== 'boolean')) throw ctx.fail(400, 'invalid_value');
        const after: Record<string, unknown> = {};
        for (const [field, key] of wanted) { const changed = settings.change(db, key, body[field], 'operator'); values = changed.values; after[field] = changed.after; }
        return { ok: true, code: 'saved', ...after };
      }, { write: true })(request);
      if (values) settings.sync(values);
      return answer;
    },
  };
}
