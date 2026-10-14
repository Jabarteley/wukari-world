import { PROJECTS } from '../../src/game/content/projects.ts'
import type { ProjectRole } from '../../src/types/projects.ts'
import type { TimedId } from '../../src/types/protocol.ts'
import type { RouteContext, RouteHandler, RouteKey } from '../types.ts'
import { characterCity } from '../character.ts'
import { requestOrigin } from '../execution-origin.ts'
import { projectService } from '../projects.ts'

export default function projectsRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const projects = projectService(ctx)
  const write = (op: 'contribute' | 'quiet' | 'claim'): RouteHandler => async request => {
    const body = await request.json(), cityId = ctx.cityIds.find(id => id === body.cityId), def = PROJECTS.find(row => row.id === body.id)
    if (!cityId) throw ctx.fail(400, 'invalid_city')
    if (!def) throw ctx.fail(400, 'invalid_project')
    const result = await ctx.command(request, { cityId, actionId: body.actionId as TimedId, type: 'projects.server', payload: { op, id: def.id, ...(op === 'contribute' ? { role: body.role as ProjectRole } : {}) } }, {
      internal: true, scope: `projects.${op}`, afterAction({ db, session, result }) {
        if (op === 'quiet' && requestOrigin(request, session) !== 'human') throw ctx.fail(403, 'human_required')
        projects.mutate(db, session, result.state, def, op, body.role as ProjectRole | undefined)
      },
    })
    return { body: result, renew: true }
  }
  return {
    'GET /api/projects': async request => ({ body: await ctx.store.read(db => {
      const city = ctx.cityIds.find(id => id === request.query.get('city'))
      if (!city) throw ctx.fail(400, 'invalid_city')
      const session = request.requireSession(db), current = characterCity(session), state = current ? session.cities[current]?.state : undefined
      return { projects: state?.projects ? PROJECTS.filter(def => def.city === city).map(def => projects.view(db, session, state, def)) : [] }
    }) }),
    'POST /api/projects/contribute': write('contribute'),
    'POST /api/projects/quiet': write('quiet'),
    'POST /api/projects/claim': write('claim'),
  }
}
