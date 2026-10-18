/**
 * OWNER: spaces
 * The operator's view of players' 3D models, under /api/mod/spaces (server/spaces/models.ts). Same access rules as the other
 * /api/mod routes (routes/growth-mod.ts operatorGuard): the operator's bearer token only.
 *
 *   GET  /api/mod/spaces/models                          reported or hidden models, newest first
 *   POST /api/mod/spaces/models { by, id, action }       remove (deleted, bytes swept), hide, or clear (visible for good)
 *   POST /api/mod/spaces/switch { models: boolean }      the `spacesModels` setting, as Admin → World → Settings changes it
 */
import { modelsService } from '../spaces/models.ts';
import { settingsOf } from '../admin/settings.ts';
import { operatorGuard } from './growth-mod.ts';
import type { RouteContext, RouteHandler, RouteKey } from '../types.ts';

export default function spacesOperatorRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const operator = operatorGuard(ctx);
  const models = modelsService(ctx);
  return {
    'GET /api/mod/spaces/models': operator((db) => models.queue(db)),
    'POST /api/mod/spaces/models': operator((db, _request, body) => models.moderate(db, body), { write: true }),
    'POST /api/mod/spaces/switch': async (request) => {
      const settings = settingsOf(ctx);
      let values: Record<string, { value: boolean | number | string }> | null = null;
      const answer = await operator((db, _request, body) => {
        if (typeof body['models'] !== 'boolean') throw ctx.fail(400, 'invalid_value');
        const changed = settings.change(db, 'spacesModels', body['models'], 'operator');
        values = changed.values;
        return { ok: true, code: 'saved', models: changed.after };
      }, { write: true })(request);
      if (values) settings.sync(values);
      return answer;
    },
  };
}
