/**
 * OWNER: social
 * The operator's switches under /api/mod/switches (the same operator guard as routes/growth-mod.ts: the operator's bearer token only),
 * so features that ship off can be turned on without an admin signing in. Only the settings listed below, only true or false;
 * every change goes through server/admin/settings.ts like the Admin → World → Settings page (and is recorded as by "operator").
 *
 *   GET  /api/mod/switches   every listed switch and the value in force
 *   POST /api/mod/switches { <field>: boolean, … }   any of the fields of OPERATOR_SWITCHES; answers the new values
 *   POST /api/mod/switches/house { room?, mates?, now? }   start an Allworld House season (server/watch/house.ts), as the admin's house.start
 *
 * The Detty December preview is deliberately not here: it turns December on for every player (Admin → World → Settings).
 */
import { settingsOf } from '../admin/settings.ts';
import { operatorGuard } from './growth-mod.ts';
import { houseService } from '../watch/house.ts';
import type { RouteContext, RouteHandler, RouteKey } from '../types.ts';
import type { OperatorSwitch } from '../../src/types/switches.ts';

/** Body field → setting key. */
export const OPERATOR_SWITCHES = Object.freeze({
  nysc: 'nyscOn', jamb: 'jambOn', danfo3d: 'danfo3d', haggle: 'haggleOpen', skit: 'skitOpen', story: 'storyMode', safety: 'modelSafetyCheck',
  spacesAi: 'spacesAi', hosts: 'spacesHosts', earn: 'earnOpen',
  // Characters played by models (each spends within its own daily caps and the model budget).
  residents: 'residentOn', residentsShadow: 'residentShadow', residentPrayers: 'residentRulePrayers', calls: 'agentCallsOn', callsStt: 'agentCallGatewayStt',
  houseAgents: 'houseAgentsOn', houseTalk: 'houseTalkModel', houseMemory: 'houseMemoryOn', houseMemoryModel: 'houseMemoryModel',
  aiFollow: 'aiFollowOn', aiHighlights: 'aiHighlightModel', aiRoles: 'aiRolesModel', haggleModel: 'haggleModel', hostModel: 'spacesHostModel',
  // Players' own pictures and places, and the rest.
  chatPictures: 'chatPictures', chatPush: 'chatPush', feedMedia: 'feedPublicMedia', houseCopy: 'spacesHouseCopy', danfo: 'danfoOpen', launchBonus: 'launchBonus',
} as const satisfies Record<OperatorSwitch, string>);

export default function switchesOperatorRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const operator = operatorGuard(ctx);
  const house = houseService(ctx);
  return {
    'GET /api/mod/switches': operator(() => {
      const settings = settingsOf(ctx);
      return { ok: true, ...Object.fromEntries(Object.entries(OPERATOR_SWITCHES).map(([field, key]) => [field, settings.get(key) ?? null])) };
    }),
    'POST /api/mod/switches': async (request) => {
      const settings = settingsOf(ctx);
      let values: Record<string, { value: boolean | number | string }> | null = null;
      const answer = await operator((db, _request, body) => {
        const wanted = Object.entries(OPERATOR_SWITCHES).filter(([field]) => body[field] !== undefined);
        if (!wanted.length || wanted.some(([field]) => typeof body[field] !== 'boolean')) throw ctx.fail(400, 'invalid_value');
        const after: Record<string, unknown> = {};
        for (const [field, key] of wanted) { const changed = settings.change(db, key, body[field], 'operator'); values = changed.values; after[field] = changed.after; }
        return { ok: true, code: 'saved', ...after };
      }, { write: true })(request);
      if (values) settings.sync(values);
      return answer;
    },
    'POST /api/mod/switches/house': async (request) => {
      let season: Parameters<typeof house.sync>[0] | undefined;
      const answer = await operator((db, _request, body) => {
        const result = house.start(db, body, ctx.now());
        if (!result.ok) return result;
        season = result.season;
        return { ok: true, code: 'started', summary: result.summary };
      }, { write: true })(request);
      if (season) house.sync(season);
      return answer;
    },
  };
}
