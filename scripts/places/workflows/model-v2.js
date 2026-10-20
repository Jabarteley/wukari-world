export const meta = {
  name: 'unique-places-model-v2',
  description: 'Model places from evidence, then an independent critic checks each against its photo, then a fixer applies the fixes',
  phases: [
    { title: 'Model', detail: 'Sonnet modeller per batch (photos -> spec -> queue render -> validate)' },
    { title: 'Critique', detail: 'independent Sonnet critic per batch reads comparison images' },
    { title: 'Fix', detail: 'Sonnet fixer applies critic fixes, re-renders, validates' },
  ],
}
const ROOT = '/Users/anthonyakpan/work/allworld-unique'
const PLACE = { type: 'object', properties: {
  city: { type: 'string' }, venueId: { type: 'string' }, verified: { type: 'string' }, match: { type: 'string' },
  rounds: { type: 'number' }, lod0Triangles: { type: 'number' }, validated: { type: 'boolean' }, gaps: { type: 'string' } },
  required: ['city', 'venueId', 'verified', 'validated'] }
const MODEL_SCHEMA = { type: 'object', properties: { places: { type: 'array', items: PLACE }, problems: { type: 'string' } }, required: ['places'] }
const CRIT_SCHEMA = { type: 'object', properties: { places: { type: 'array', items: { type: 'object', properties: {
  city: { type: 'string' }, venueId: { type: 'string' }, match: { type: 'string' }, evidenceOk: { type: 'boolean' },
  fixes: { type: 'array', items: { type: 'string' } } }, required: ['city', 'venueId', 'match', 'fixes'] } } }, required: ['places'] }
const redo = args.redo === true
const batches = args.batches

const modelPrompt = (b) => `Read ${ROOT}/docs/agent-plans/unique-places/MODELLER.md and follow it exactly (including its Shape toolbox section). Your city: ${b.city}. Your places (venueIds): ${b.venues.join(', ')}.${redo ? ' Each place already has a spec from an earlier pilot: treat it as a draft, re-check against the photos and rebuild it with the current toolbox and atlas wherever that matches the photo better.' : ''} Other agents work on other places in parallel; touch only your own spec files. The shared render queue is already running (never start/stop it). Return per-place results.`
const critPrompt = (b) => `Read ${ROOT}/docs/agent-plans/unique-places/CRITIC.md and follow it. City: ${b.city}. Places: ${b.venues.join(', ')}. Return one entry per place.`
const fixPrompt = (b, crit) => `Read ${ROOT}/docs/agent-plans/unique-places/MODELLER.md (incl. Shape toolbox). An independent critic reviewed these models in city ${b.city}. Apply its fixes to scripts/places/models/${b.city}/<venueId>.json, re-render each with the shared queue (submit.ts with --photo when a photo exists), look at the new cmp image, make at most 2 rounds per place, update review {rounds, match, gaps}, and validate with validate-model.ts. If the critic says evidenceOk=false, find a correct photo or downgrade verified honestly. Critic findings:\n${JSON.stringify(crit, null, 1)}\nReturn per-place results.`

const results = await pipeline(batches,
  (b) => agent(modelPrompt(b), { label: `model:${b.city}:${b.venues[0]}+${b.venues.length - 1}`, phase: 'Model', schema: MODEL_SCHEMA, model: 'sonnet' }),
  (m, b) => agent(critPrompt(b), { label: `critic:${b.city}:${b.venues[0]}`, phase: 'Critique', schema: CRIT_SCHEMA, model: 'sonnet' })
    .then(c => ({ m, c })),
  ({ m, c }, b) => {
    const todo = (c?.places || []).filter(p => p.match !== 'close' && p.fixes?.length)
    if (!todo.length) return { model: m, critic: c, fixed: null }
    return agent(fixPrompt({ city: b.city, venues: todo.map(p => p.venueId) }, todo),
      { label: `fix:${b.city}:${b.venues[0]}`, phase: 'Fix', schema: MODEL_SCHEMA, model: 'sonnet' })
      .then(f => ({ model: m, critic: c, fixed: f }))
  })
const ok = results.filter(Boolean)
const final = ok.flatMap(r => {
  const fixed = new Map((r.fixed?.places || []).map(p => [p.venueId, p]))
  return (r.model?.places || []).map(p => fixed.get(p.venueId) || p)
})
const want = batches.flatMap(b => b.venues.map(v => `${b.city}/${v}`))
const missing = want.filter(k => !final.some(r => `${r.city}/${r.venueId}` === k && r.validated))
log(`done ${final.filter(r => r.validated).length}/${want.length}; missing ${missing.length}`)
return { final, missing, critics: ok.map(r => r.critic) }
