import assert from 'node:assert/strict'
import { lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import test from 'node:test'
import { DEFAULT_GATEWAY_URL, DEFAULT_LISTS, OPENROUTER_URL, type Provider } from '../../server/models/catalog.ts'
import { TALK_TOPICS, type ApprovedTalkLineV1, type HumanPhrasebookEntryV1 } from './bank.ts'
import { type TalkDraftBindingV1 } from './draft.ts'
import { FACTORY_CAP_MICRO, initializeFactoryJournal, openFactoryJournal, type FactoryJournal } from './journal.ts'
import {
  createTalkRunner, planTalkRun, type TalkRunPlanV1, type TalkTransport, type WireResponseV1,
} from './runner.ts'

const ROOT = resolve(import.meta.dirname, '../..')
const BASE: Readonly<Record<Provider, string>> = { gateway: DEFAULT_GATEWAY_URL, openrouter: OPENROUTER_URL }
const NATIVE: HumanPhrasebookEntryV1 = {
  lang: 'x-test', text: 'Fixture native greeting', gloss: 'A fixture greeting',
  source: { kind: 'human', citation: 'Reviewed phrasebook fixture', contributor: 'Fixture writer' },
}

function word(index: number): string {
  return String.fromCharCode(97 + Math.floor(index / 26) % 26) + String.fromCharCode(97 + index % 26)
}

function binding(voice: TalkDraftBindingV1['voice'] = 'plain'): TalkDraftBindingV1 {
  return {
    city: { id: 'kano', name: 'Kano', source: 'fixture-city' },
    npc: { id: 'market-seller', name: 'Market seller', source: 'fixture-npc' },
    venue: { id: 'kantin-kwari', name: 'Kantin Kwari Market', source: 'fixture-venue' },
    voice, lang: 'en',
    facts: [{ id: 'market-setting', text: 'The market has cloth stalls.', source: 'fixture-fact' }],
    phrasebook: [structuredClone(NATIVE)], phrases: [{ lang: NATIVE.lang, text: NATIVE.text }],
  }
}

function line(text: string, sources: string[] = ['city', 'venue']): ApprovedTalkLineV1 { return { text, sources } }

function draftReply(): Record<string, unknown> {
  const rows = (section: string, count: number) => Array.from({ length: count }, (_, at) => line(`The ${section} note ${word(at)} belongs to Kantin Kwari Market in Kano.`))
  return {
    greet: [line('Welcome to Kantin Kwari Market in Kano.')], ambient: rows('ambient', 10),
    about: Object.fromEntries(TALK_TOPICS.map(topic => [topic, rows(topic, 6)])), bye: rows('goodbye', 7),
  }
}

function answer(content: string = JSON.stringify(draftReply()), usage: unknown = { prompt_tokens: 20, completion_tokens: 40 }): string {
  return JSON.stringify({ choices: [{ message: { content } }], usage })
}

async function workspace(t: test.TestContext): Promise<{ dir: string; output: string; journalPath: string }> {
  const dir = await mkdtemp(join(tmpdir(), 'allworld-talk-runner-')), output = join(dir, 'banks')
  t.after(() => rm(dir, { recursive: true, force: true }))
  return { dir, output, journalPath: join(dir, 'journal.json') }
}

async function prepared(t: test.TestContext, rawBinding = binding(), prior = 0): Promise<{ plan: TalkRunPlanV1; journal: FactoryJournal; output: string; journalPath: string }> {
  const { output, journalPath } = await workspace(t)
  const plan = await planTalkRun(rawBinding, { repoRoot: ROOT, outputRoot: output })
  const journal = await initializeFactoryJournal(journalPath, { sourceDigest: plan.sourceDigest, priorExternalSpendMicro: prior })
  t.after(() => journal.close().catch(() => {}))
  return { plan, journal, output, journalPath }
}

function access(provider: Provider): { key: string; baseUrl: string } { return { key: 'fixture-key', baseUrl: BASE[provider] } }

function transportFrom(steps: Array<WireResponseV1 | Error>, calls: Array<{ url: string; init: Parameters<TalkTransport>[1] }>): TalkTransport {
  return async (url, init) => {
    calls.push({ url, init })
    const step = steps.shift()
    if (!step) throw new Error('unexpected fixture request')
    if (step instanceof Error) throw step
    return step
  }
}

function deferred<T>(): { promise: Promise<T>; resolve(value: T): void; reject(error: unknown): void } {
  let resolve!: (value: T) => void, reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

test('dry planning is deterministic and never touches provider access or transport', async t => {
  const { output } = await workspace(t)
  let providers = 0, requests = 0
  const first = await planTalkRun(binding(), { repoRoot: ROOT, outputRoot: output })
  const second = await planTalkRun(binding(), { repoRoot: ROOT, outputRoot: output })
  assert.deepEqual(first, second)
  assert.equal(providers, 0); assert.equal(requests, 0)
  assert.equal(first.entries.length, DEFAULT_LISTS['agent-talk'].length)
  assert.equal(first.reservation.slots.length, first.entries.length * 2)
  assert.equal(first.request.maxTokens, 4096)
  assert.equal(first.timeoutMs, 60_000)
  assert.equal(Object.isFrozen(first), true)
})

test('a valid 60-line reply publishes one bound bank and accounts strict wire usage', async t => {
  const { plan, journal, output } = await prepared(t)
  const calls: Array<{ url: string; init: Parameters<TalkTransport>[1] }> = []
  const runner = createTalkRunner({ journal, outputRoot: output, repoRoot: ROOT, provider: access, transport: transportFrom([{ status: 200, body: answer() }], calls) })
  const result = await runner.execute(plan)
  assert.equal(result.status, 'committed')
  assert.equal(calls.length, 1)
  assert.equal(JSON.parse(calls[0]!.init.body).max_tokens, 4096)
  assert.equal(calls[0]!.init.redirect, 'manual')
  const run = await journal.getRun(plan.runId)
  assert.equal(run?.slots[0]?.state, 'accounted')
  assert.equal(run?.slots[0]?.observedMicro, Math.ceil(20 * plan.entries[0]!.price.input + 40 * plan.entries[0]!.price.output))
  assert.equal(run?.slots.slice(1).every(slot => slot.state === 'released'), true)
  assert.equal(result.status === 'committed' && result.bank.phrases[0]?.text, NATIVE.text)
  assert.equal((await lstat(plan.targetPath)).isFile(), true)
})

test('missing or partial usage retains the full dispatched bound while valid output may commit', async t => {
  for (const [at, usage] of [null, { prompt_tokens: 2 }].entries()) {
    await t.test(`usage-${at}`, async child => {
      const { plan, journal, output } = await prepared(child)
      const runner = createTalkRunner({ journal, outputRoot: output, repoRoot: ROOT, provider: access, transport: async () => ({ status: 200, body: answer(JSON.stringify(draftReply()), usage) }) })
      assert.equal((await runner.execute(plan)).status, 'committed')
      const run = await journal.getRun(plan.runId)
      assert.equal(run?.slots[0]?.state, 'held')
      assert.equal((await journal.totals()).heldMicro, plan.entries[0]!.slots[0].maxMicro)
    })
  }
})

test('a 400 parameter retry uses its second durable slot and leaves the first held', async t => {
  const { plan, journal, output } = await prepared(t)
  const calls: Array<{ url: string; init: Parameters<TalkTransport>[1] }> = []
  const runner = createTalkRunner({ journal, outputRoot: output, repoRoot: ROOT, provider: access, transport: transportFrom([
    { status: 400, body: 'max_tokens is unsupported' }, { status: 200, body: answer() },
  ], calls) })
  assert.equal((await runner.execute(plan)).status, 'committed')
  assert.equal(calls.length, 2)
  assert.equal(JSON.parse(calls[0]!.init.body).max_tokens, 4096)
  assert.equal(JSON.parse(calls[1]!.init.body).max_completion_tokens, 4096)
  const run = await journal.getRun(plan.runId)
  assert.equal(run?.slots[0]?.state, 'held')
  assert.equal(run?.slots[1]?.state, 'accounted')
})

test('a failed primary can fall back once and commit while its earlier charge stays held', async t => {
  const { plan, journal, output } = await prepared(t)
  const calls: Array<{ url: string; init: Parameters<TalkTransport>[1] }> = []
  const runner = createTalkRunner({ journal, outputRoot: output, repoRoot: ROOT, provider: access, transport: transportFrom([
    { status: 503, body: 'unavailable' }, { status: 200, body: answer() },
  ], calls) })
  assert.equal((await runner.execute(plan)).status, 'committed')
  assert.equal(calls.length, 2)
  const run = await journal.getRun(plan.runId)
  assert.equal(run?.slots[0]?.state, 'held')
  assert.equal(run?.slots[2]?.state, 'accounted')
})

test('invalid replies are accounted but never produce output', async t => {
  const { plan, journal, output } = await prepared(t)
  const runner = createTalkRunner({ journal, outputRoot: output, repoRoot: ROOT, provider: access, transport: async () => ({ status: 200, body: answer('{}') }) })
  assert.equal((await runner.execute(plan)).status, 'invalid-reply')
  await assert.rejects(readFile(plan.targetPath), /ENOENT/)
  assert.equal((await journal.getRun(plan.runId))?.finalReason, 'invalid-reply')
})

test('reservation and dispatch authorization failures make zero network calls', async t => {
  await t.test('reserve', async child => {
    const setup = await prepared(child, binding(), FACTORY_CAP_MICRO)
    let requests = 0, providers = 0
    const runner = createTalkRunner({ journal: setup.journal, outputRoot: setup.output, repoRoot: ROOT, provider: provider => { providers += 1; return access(provider) }, transport: async () => { requests += 1; return { status: 200, body: answer() } } })
    await assert.rejects(runner.execute(setup.plan), /programme cap/)
    assert.equal(requests, 0); assert.equal(providers, 0)
  })
  await t.test('claim', async child => {
    const setup = await prepared(child)
    let requests = 0
    Object.defineProperty(setup.journal, 'claimDispatch', { value: async () => { throw new Error('fixture claim failure') } })
    const runner = createTalkRunner({ journal: setup.journal, outputRoot: setup.output, repoRoot: ROOT, provider: access, transport: async () => { requests += 1; return { status: 200, body: answer() } } })
    await assert.rejects(runner.execute(setup.plan), /dispatch authorization/)
    assert.equal(requests, 0)
  })
  await t.test('no provider access', async child => {
    const setup = await prepared(child)
    let requests = 0
    const result = await createTalkRunner({ journal: setup.journal, outputRoot: setup.output, repoRoot: ROOT, provider: () => null, transport: async () => { requests += 1; return { status: 200, body: answer() } } }).execute(setup.plan)
    assert.equal(result.status, 'cancelled'); assert.equal(requests, 0)
    assert.equal((await setup.journal.getRun(setup.plan.runId))?.slots.every(slot => slot.state === 'released'), true)
  })
})

test('a thrown transport failure is terminal after its claimed slot and blocks fallback', async t => {
  const { plan, journal, output } = await prepared(t)
  let requests = 0
  const runner = createTalkRunner({ journal, outputRoot: output, repoRoot: ROOT, provider: access, transport: async () => { requests += 1; throw new Error('private transport detail') } })
  await assert.rejects(runner.execute(plan), error => error instanceof Error && error.message === 'dispatch authorization or transport failed')
  assert.equal(requests, 1)
  assert.equal((await journal.getRun(plan.runId))?.slots[0]?.state, 'dispatched')
})

test('a late failed claim is drained after the deadline and cannot trigger fallback or publication', async t => {
  const { plan, journal, output } = await prepared(t)
  let requests = 0, clock = 0, settled = false
  const claim = deferred<never>(), entered = deferred<void>()
  Object.defineProperty(journal, 'claimDispatch', { value: () => { entered.resolve(); return claim.promise } })
  const runner = createTalkRunner({ journal, outputRoot: output, repoRoot: ROOT, provider: provider => { clock = 59_999; return access(provider) }, now: () => clock, transport: async () => { requests += 1; return { status: 200, body: answer() } } })
  const running = runner.execute(plan).finally(() => { settled = true })
  await entered.promise
  await new Promise(resolve => setTimeout(resolve, 10))
  assert.equal(settled, false)
  claim.reject(new Error('late fixture failure'))
  await assert.rejects(running, /dispatch authorization/)
  assert.equal(requests, 0)
  await assert.rejects(readFile(plan.targetPath), /ENOENT/)
})

test('a successful claim suspended past cancellation is fully drained and never starts transport', async t => {
  const { plan, journal, output } = await prepared(t)
  const entered = deferred<void>(), release = deferred<void>(), control = new AbortController()
  let requests = 0, settled = false
  const runner = createTalkRunner({
    journal, outputRoot: output, repoRoot: ROOT, provider: access,
    hooks: { afterDispatchClaim: async () => { entered.resolve(); await release.promise } },
    transport: async () => { requests += 1; return { status: 200, body: answer() } },
  })
  const running = runner.execute(plan, control.signal).finally(() => { settled = true })
  await entered.promise
  control.abort()
  await new Promise<void>(resolve => setImmediate(resolve))
  assert.equal(settled, false)
  release.resolve()
  assert.equal((await running).status, 'cancelled')
  assert.equal(requests, 0)
  assert.equal((await journal.getRun(plan.runId))?.slots[0]?.state, 'held')
})

test('caller cancellation aborts the actual in-flight transport signal and retains its exposure', async t => {
  const { plan, journal, output } = await prepared(t)
  const entered = deferred<void>(), control = new AbortController()
  let observedAbort = false, requests = 0
  const runner = createTalkRunner({ journal, outputRoot: output, repoRoot: ROOT, provider: access, transport: async (_url, init) => {
    requests += 1; entered.resolve()
    return new Promise<WireResponseV1>((_resolve, reject) => init.signal.addEventListener('abort', () => { observedAbort = init.signal.aborted; reject(new Error('fixture aborted')) }, { once: true }))
  } })
  const running = runner.execute(plan, control.signal)
  await entered.promise
  control.abort()
  assert.equal((await running).status, 'cancelled')
  assert.equal(requests, 1); assert.equal(observedAbort, true)
  assert.equal((await journal.getRun(plan.runId))?.slots[0]?.state, 'held')
})

test('cancellation and an expired absolute deadline release every unsent slot', async t => {
  await t.test('cancelled', async child => {
    const { plan, journal, output } = await prepared(child)
    const control = new AbortController(); control.abort()
    let providers = 0
    const result = await createTalkRunner({ journal, outputRoot: output, repoRoot: ROOT, provider: provider => { providers += 1; return access(provider) }, transport: async () => ({ status: 200, body: answer() }) }).execute(plan, control.signal)
    assert.equal(result.status, 'cancelled'); assert.equal(providers, 0)
    assert.equal((await journal.getRun(plan.runId))?.slots.every(slot => slot.state === 'released'), true)
  })
  await t.test('deadline', async child => {
    const { plan, journal, output } = await prepared(child)
    let clock = 0, requests = 0
    const result = await createTalkRunner({ journal, outputRoot: output, repoRoot: ROOT, now: () => clock, provider: provider => { clock = 70_000; return access(provider) }, transport: async () => { requests += 1; return { status: 200, body: answer() } } }).execute(plan)
    assert.equal(result.status, 'cancelled'); assert.equal(requests, 0)
  })
  await t.test('provider acquisition', async child => {
    const { plan, journal, output } = await prepared(child)
    const entered = deferred<void>(), control = new AbortController()
    let providers = 0, requests = 0
    const runner = createTalkRunner({ journal, outputRoot: output, repoRoot: ROOT, provider: async () => { providers += 1; entered.resolve(); return new Promise<never>(() => {}) }, transport: async () => { requests += 1; return { status: 200, body: answer() } } })
    const running = runner.execute(plan, control.signal)
    await entered.promise
    control.abort()
    assert.equal((await running).status, 'cancelled')
    assert.equal(requests, 0); assert.equal(providers, 1)
    assert.equal((await journal.getRun(plan.runId))?.slots.every(slot => slot.state === 'released'), true)
    assert.equal((await runner.execute(plan)).status, 'finished-no-output')
    assert.equal(providers, 1)
  })
})

test('configured-price overruns durably fence execution and reopening', async t => {
  const { plan, journal, output, journalPath } = await prepared(t)
  const huge = Math.ceil(plan.entries[0]!.slots[0].maxMicro / Math.max(plan.entries[0]!.price.input, 0.000001)) + 1
  const runner = createTalkRunner({ journal, outputRoot: output, repoRoot: ROOT, provider: access, transport: async () => ({ status: 200, body: answer(JSON.stringify(draftReply()), { prompt_tokens: huge, completion_tokens: 0 }) }) })
  await assert.rejects(runner.execute(plan), /durably fenced/)
  assert.equal((await journal.snapshot()).fault?.code, 'accounting-overrun')
  await journal.close()
  const reopened = await openFactoryJournal(journalPath, { sourceDigest: plan.sourceDigest })
  assert.equal((await reopened.snapshot()).fault?.runId, plan.runId)
  await assert.rejects(reopened.reserve({ ...plan.reservation, runId: `${plan.runId.slice(0, -1)}x` }), /terminal fault/)
  await reopened.close()
})

test('prepared and linked interruptions recover without provider access or redispatch', async t => {
  for (const point of ['prepared', 'linked'] as const) {
    await t.test(point, async child => {
      const { plan, journal, output, journalPath } = await prepared(child)
      const hooks = point === 'prepared' ? { afterPrepare: () => { throw new Error('stop after prepare') } } : { afterLink: () => { throw new Error('stop after link') } }
      await assert.rejects(createTalkRunner({ journal, outputRoot: output, repoRoot: ROOT, provider: access, transport: async () => ({ status: 200, body: answer() }), hooks }).execute(plan), /stop after/)
      await journal.close()
      const reopened = await openFactoryJournal(journalPath, { sourceDigest: plan.sourceDigest })
      let providers = 0, requests = 0
      const result = await createTalkRunner({ journal: reopened, outputRoot: output, repoRoot: ROOT, provider: provider => { providers += 1; return access(provider) }, transport: async () => { requests += 1; return { status: 500, body: '' } } }).execute(plan)
      assert.equal(result.status, 'recovered'); assert.equal(providers, 0); assert.equal(requests, 0)
      assert.equal((await reopened.getRun(plan.runId))?.state, 'committed')
      await reopened.close()
    })
  }
})

test('linked recovery must synchronize the directory before it can commit', async t => {
  const { plan, journal, output } = await prepared(t)
  await assert.rejects(createTalkRunner({
    journal, outputRoot: output, repoRoot: ROOT, provider: access,
    transport: async () => ({ status: 200, body: answer() }),
    hooks: { afterLink: () => { throw new Error('linked interruption') } },
  }).execute(plan), /linked interruption/)
  let providers = 0, requests = 0
  const failedRecovery = createTalkRunner({
    journal, outputRoot: output, repoRoot: ROOT,
    provider: provider => { providers += 1; return access(provider) },
    transport: async () => { requests += 1; return { status: 500, body: '' } },
    publicationIo: { async syncDirectory() { throw new Error('fixture directory sync failed') } },
  })
  await assert.rejects(failedRecovery.execute(plan), /directory sync failed/)
  assert.equal((await journal.getRun(plan.runId))?.state, 'output-prepared')
  assert.equal(providers, 0); assert.equal(requests, 0)
  const recovered = await createTalkRunner({ journal, outputRoot: output, repoRoot: ROOT, provider: access, transport: async () => ({ status: 500, body: '' }) }).execute(plan)
  assert.equal(recovered.status, 'recovered')
  assert.equal((await journal.getRun(plan.runId))?.state, 'committed')
})

test('collisions, symlinks, digest changes and changed bindings preserve existing files and refuse work', async t => {
  await t.test('target collision', async child => {
    const { plan, journal, output } = await prepared(child)
    await mkdir(output, { recursive: true })
    await writeFile(plan.targetPath, 'owned elsewhere')
    let providers = 0
    await assert.rejects(createTalkRunner({ journal, outputRoot: output, repoRoot: ROOT, provider: provider => { providers += 1; return access(provider) }, transport: async () => ({ status: 200, body: answer() }) }).execute(plan), /target already exists/)
    assert.equal(await readFile(plan.targetPath, 'utf8'), 'owned elsewhere'); assert.equal(providers, 0)
  })
  await t.test('target symlink', async child => {
    const { plan, journal, output, journalPath } = await prepared(child)
    await mkdir(output, { recursive: true })
    await writeFile(join(resolve(output, '..'), 'outside'), 'outside')
    await symlink(join(resolve(output, '..'), 'outside'), plan.targetPath)
    await assert.rejects(createTalkRunner({ journal, outputRoot: output, repoRoot: ROOT, provider: access, transport: async () => ({ status: 200, body: answer() }) }).execute(plan), /target already exists/)
    assert.equal(await readFile(join(resolve(output, '..'), 'outside'), 'utf8'), 'outside')
    assert.equal((await journal.getRun(plan.runId)), null)
    assert.ok(journalPath)
  })
  await t.test('candidate digest and changed binding', async child => {
    const { plan, journal, output, journalPath } = await prepared(child)
    await assert.rejects(createTalkRunner({ journal, outputRoot: output, repoRoot: ROOT, provider: access, transport: async () => ({ status: 200, body: answer() }), hooks: { afterPrepare: () => { throw new Error('pause') } } }).execute(plan), /pause/)
    await writeFile(plan.candidatePath, 'changed candidate')
    await journal.close()
    const reopened = await openFactoryJournal(journalPath, { sourceDigest: plan.sourceDigest })
    await assert.rejects(createTalkRunner({ journal: reopened, outputRoot: output, repoRoot: ROOT, provider: access, transport: async () => ({ status: 200, body: answer() }) }).execute(plan), /digest/)
    const changed = await planTalkRun(binding('formal'), { repoRoot: ROOT, outputRoot: output })
    await assert.rejects(createTalkRunner({ journal: reopened, outputRoot: output, repoRoot: ROOT, provider: access, transport: async () => ({ status: 200, body: answer() }) }).execute(changed), /does not match/)
    const otherOutput = join(resolve(output, '..'), 'other-banks')
    const changedTarget = await planTalkRun(binding(), { repoRoot: ROOT, outputRoot: otherOutput })
    await assert.rejects(createTalkRunner({ journal: reopened, outputRoot: otherOutput, repoRoot: ROOT, provider: access, transport: async () => ({ status: 200, body: answer() }) }).execute(changedTarget), /does not match/)
    assert.equal(await readFile(plan.candidatePath, 'utf8'), 'changed candidate')
    await reopened.close()
  })
})
