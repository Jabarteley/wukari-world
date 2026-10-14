import { lagosTime } from '../../src/game/clock.ts'
import { getDailyMilestones, setRhythmOptIn, viewRhythm } from '../../src/game/cadence.ts'
import { DAILY_MISSIONS } from '../../src/game/content/missions.ts'
import { journeyCollections } from '../../src/game/journeys.ts'
import { FIRST_SEASON_ID, seasonView } from '../../src/game/season.ts'
import { characterCity } from '../character.ts'
import { requestOrigin } from '../execution-origin.ts'
import { transactWithCityContent } from '../prepared-city-transaction.ts'
import { progressionOf } from '../progression.ts'
import { DEFAULT_RETENTION_POLICY } from '../retention-policy.ts'
import type { RouteContext, RouteHandler, RouteKey } from '../types.ts'

export default function retentionRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const policy = ctx.config.retention ?? DEFAULT_RETENTION_POLICY
  return {
    'GET /api/retention': async request => ({ body: await ctx.store.read(db => {
      const session = request.requireSession(db), city = characterCity(session)
      const entry = city ? session.cities[city] : undefined, today = lagosTime(ctx.now()).day
      const missions = entry?.state.missions
      const collections = entry ? journeyCollections(entry.state) : []
      const complete = missions?.day === today ? missions.daily.filter(row => {
        const definition = DAILY_MISSIONS.find(def => def.id === row.id)
        return definition && row.n >= (definition.count ?? 1)
      }).length : 0
      return { flags: { dailyMilestones: policy.dailyMilestones, rhythm: policy.rhythm },
        rhythm: viewRhythm(entry?.progression?.rhythm, today, policy),
        milestones: policy.dailyMilestones ? getDailyMilestones(complete) : null, collections,
        season: seasonView(entry?.progression?.season, policy.seasonStartDay, ctx.now(), collections.flatMap(row => row.members)) }
    }) }),
    'POST /api/retention/rhythm': async request => {
      const body = await request.json(), cityId = ctx.cityIds.find(id => id === body.cityId)
      if (!cityId) throw ctx.fail(400, 'invalid_city')
      if (typeof body.optedIn !== 'boolean') throw ctx.fail(400, 'invalid_setting')
      const optedIn = body.optedIn
      const result = await transactWithCityContent(ctx, request, [cityId], db => {
        const session = request.requireSession(db, { renew: true })
        if (requestOrigin(request, session) !== 'human' || session.agent?.char) throw ctx.fail(403, 'human_required')
        ctx.settle(session, cityId)
        return ctx.once(db, session, { id: body.actionId, kind: 'retention.rhythm', fingerprint: [cityId, optedIn] }, () => {
          if (optedIn && !policy.rhythm) throw ctx.fail(409, 'rhythm_unavailable')
          const entry = session.cities[cityId]!
          progressionOf(entry, ctx.now()).rhythm = setRhythmOptIn(entry.progression?.rhythm, optedIn)
          return { ok: true as const, code: 'saved' as const }
        })
      })
      return { body: result, renew: true }
    },
    'POST /api/retention/season': async request => {
      const body = await request.json(), cityId = ctx.cityIds.find(id => id === body.cityId)
      if (!cityId) throw ctx.fail(400, 'invalid_city')
      if (body.op !== 'join' && body.op !== 'claim' && body.op !== 'reminder') throw ctx.fail(400, 'invalid_setting')
      if (body.op === 'reminder' && body.reminder !== null && typeof body.reminder !== 'string') throw ctx.fail(400, 'invalid_setting')
      const result = await transactWithCityContent(ctx, request, [cityId], db => {
        const session = request.requireSession(db, { renew: true })
        if (requestOrigin(request, session) !== 'human' || session.agent?.char) throw ctx.fail(403, 'human_required')
        const state = ctx.settle(session, cityId), entry = session.cities[cityId]!
        return ctx.once(db, session, { id: body.actionId, kind: 'retention.season', fingerprint: [cityId, body.op, body.op === 'reminder' ? body.reminder : null] }, () => {
          const book = progressionOf(entry, ctx.now()), evidence = journeyCollections(state).flatMap(row => row.members)
          const view = seasonView(book.season, policy.seasonStartDay, ctx.now(), evidence)
          if (!view) throw ctx.fail(409, 'season_unavailable')
          if (body.op === 'join') {
            if (book.season) return { ok: true as const, code: 'saved' as const }
            if (view.status !== 'open' || policy.seasonStartDay === null) throw ctx.fail(409, 'season_closed')
            book.season = { id: FIRST_SEASON_ID, startDay: policy.seasonStartDay, joinedAt: ctx.now(), playedDay: null, earnedAt: null, reminder: null }
          } else {
            if (!book.season) throw ctx.fail(409, 'season_not_ready')
            if (body.op === 'claim') {
              if (book.season.earnedAt === null) {
                if (!view.canClaim) throw ctx.fail(409, 'season_not_ready')
                book.season.earnedAt = ctx.now()
              }
            } else {
              if (body.reminder !== null && !view.reminderOptions.some(row => row.id === body.reminder)) throw ctx.fail(400, 'invalid_setting')
              book.season.reminder = body.reminder as string | null
            }
          }
          return { ok: true as const, code: 'saved' as const }
        })
      })
      return { body: result, renew: true }
    },
  }
}
