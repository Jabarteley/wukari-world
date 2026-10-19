import assert from 'node:assert/strict'
import { mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  FACTORY_ACCOUNTING_SOURCE, FACTORY_CAP_MICRO,
  initializeFactoryJournal, nodeFactoryJournalIo, openFactoryJournal,
  type FactoryJournal, type FactoryJournalIo,
} from './journal.ts'

const SOURCE = 'a'.repeat(64), INPUT = 'b'.repeat(64), CONFIG = 'c'.repeat(64), ARTIFACT = 'd'.repeat(64)

async function folder(t: test.TestContext): Promise<{ dir: string; path: string }> {
  const dir = await mkdtemp(join(tmpdir(), 'allworld-factory-journal-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  return { dir, path: join(dir, 'journal.json') }
}

const reservation = (runId: string, kind: 'draft' | 'gpu', slots: Array<{ id: string; maxMicro: number }>) => ({
  runId, inputSha256: INPUT, configSha256: CONFIG, publicIds: [`public-${runId}`], kind, slots,
})

async function initialized(t: test.TestContext, priorExternalSpendMicro = 0): Promise<{ path: string; journal: FactoryJournal }> {
  const { path } = await folder(t)
  const journal = await initializeFactoryJournal(path, { sourceDigest: SOURCE, priorExternalSpendMicro })
  t.after(async () => { await journal.close().catch(() => {}) })
  return { path, journal }
}

test('initialization is explicit, missing ledgers stay missing, and a real exclusive lock rejects contention', async t => {
  const { dir, path } = await folder(t)
  await assert.rejects(openFactoryJournal(path, { sourceDigest: SOURCE }), /ENOENT|not valid JSON|unavailable/)
  await assert.rejects(readFile(path), /ENOENT/)

  const first = await initializeFactoryJournal(path, { sourceDigest: SOURCE, priorExternalSpendMicro: 17 })
  assert.deepEqual(await first.totals(), { settledMicro: 17, heldMicro: 0, exposureMicro: 17, remainingMicro: FACTORY_CAP_MICRO - 17, workerComputeCost: 'unknown' })
  await assert.rejects(openFactoryJournal(path, { sourceDigest: SOURCE }), /lock is unavailable/)
  await assert.rejects(initializeFactoryJournal(path, { sourceDigest: SOURCE, priorExternalSpendMicro: 0 }), /lock is unavailable/)
  await first.close()

  const reopened = await openFactoryJournal(path, { sourceDigest: SOURCE })
  await reopened.close()
  assert.equal((await readFile(path, 'utf8')).includes('"priorExternalSpendMicro": 17'), true)
  assert.equal(dir.length > 0, true)
})

test('a durable programme marker prevents silent ledger recreation after loss', async t => {
  const { path } = await folder(t)
  const journal = await initializeFactoryJournal(path, { sourceDigest: SOURCE, priorExternalSpendMicro: 9 })
  await journal.close()
  await rm(path)
  await assert.rejects(openFactoryJournal(path, { sourceDigest: SOURCE }), /ENOENT|not a regular file/)
  await assert.rejects(initializeFactoryJournal(path, { sourceDigest: SOURCE, priorExternalSpendMicro: 0 }), /EEXIST|already initialized|unavailable/)
  await assert.rejects(readFile(path), /ENOENT/)
  assert.equal((await readFile(`${path}.initialized`, 'utf8')).includes(SOURCE), true)
})

test('programme cap includes prior spend, held draft exposure and future GPU slots at the exact boundary', async t => {
  const { journal } = await initialized(t, 100_000_000)
  await journal.reserve(reservation('draft-one', 'draft', [{ id: 'primary', maxMicro: 60_000_000 }]))
  assert.equal((await journal.claimDispatch('draft-one', 'primary')).status, 'claimed')
  const held = await journal.finalize('draft-one', { reason: 'request-failed' })
  assert.equal(held.state, 'held')

  await journal.reserve(reservation('gpu-one', 'gpu', [{ id: 'job', maxMicro: 40_000_000 }]))
  assert.deepEqual(await journal.totals(), { settledMicro: 100_000_000, heldMicro: 100_000_000, exposureMicro: FACTORY_CAP_MICRO, remainingMicro: 0, workerComputeCost: 'unknown' })
  await assert.rejects(journal.reserve(reservation('gpu-two', 'gpu', [{ id: 'job', maxMicro: 1 }])), /exceed the programme cap/)
})

test('duplicate reservations and dispatches only return recovery readback, while conflicts and excess claims are refused', async t => {
  const { journal } = await initialized(t)
  const request = reservation('draft-recovery', 'draft', [{ id: 'first', maxMicro: 100 }, { id: 'fallback', maxMicro: 200 }])
  assert.equal((await journal.reserve(request)).status, 'reserved')
  assert.equal((await journal.reserve(request)).status, 'existing')
  await assert.rejects(journal.reserve({ ...request, configSha256: 'e'.repeat(64) }), /conflicting reservation data/)
  await assert.rejects(journal.reserve({ ...reservation('duplicate-slots', 'draft', [{ id: 'same', maxMicro: 1 }, { id: 'same', maxMicro: 2 }]) }), /duplicate id/)

  assert.equal((await journal.claimDispatch('draft-recovery', 'first')).status, 'claimed')
  assert.equal((await journal.claimDispatch('draft-recovery', 'first')).status, 'already-claimed')
  await assert.rejects(journal.claimDispatch('draft-recovery', 'unknown'), /unknown slot/)
  await assert.rejects(journal.claimDispatch('unknown-run', 'first'), /unknown run/)
  await journal.finalize('draft-recovery', { reason: 'request-failed' })
  await assert.rejects(journal.claimDispatch('draft-recovery', 'fallback'), /finalized without dispatch/)
})

test('restart keeps an existing reserved run at full exposure and cannot authorize its first dispatch', async t => {
  const { path, journal } = await initialized(t)
  const request = reservation('reserved-before-restart', 'draft', [{ id: 'request', maxMicro: 800 }])
  await journal.reserve(request)
  await journal.close()

  const recovered = await openFactoryJournal(path, { sourceDigest: SOURCE })
  assert.equal((await recovered.reserve(request)).status, 'existing')
  assert.deepEqual(await recovered.totals(), { settledMicro: 0, heldMicro: 800, exposureMicro: 800, remainingMicro: FACTORY_CAP_MICRO - 800, workerComputeCost: 'unknown' })
  await assert.rejects(recovered.claimDispatch('reserved-before-restart', 'request'), /recovery-only/)
  const finalized = await recovered.finalize('reserved-before-restart', { reason: 'cancelled' })
  assert.equal(finalized.slots[0]?.state, 'released')
  assert.equal((await recovered.totals()).exposureMicro, 0)
  await recovered.close()
})

test('malformed, negative, overflowing and unknown monetary data fail closed', async t => {
  const { dir, path } = await folder(t)
  for (const [at, prior] of [-1, Number.MAX_SAFE_INTEGER + 1, 0.5, Number.NaN].entries()) {
    await assert.rejects(initializeFactoryJournal(join(dir, `bad-${at}.json`), { sourceDigest: SOURCE, priorExternalSpendMicro: prior }), /safe integer/)
  }
  await assert.rejects(initializeFactoryJournal(path, { sourceDigest: 'short', priorExternalSpendMicro: 0 }), /SHA-256/)

  const journal = await initializeFactoryJournal(path, { sourceDigest: SOURCE, priorExternalSpendMicro: 0 })
  t.after(async () => { await journal.close().catch(() => {}) })
  for (const maxMicro of [-1, 0, 0.5, Number.MAX_SAFE_INTEGER + 1, FACTORY_CAP_MICRO + 1]) {
    await assert.rejects(journal.reserve(reservation(`bad-${String(maxMicro).replace(/\W/g, 'x')}`, 'draft', [{ id: 'slot', maxMicro }])), /safe integer|greater than zero/)
  }
  await assert.rejects(journal.reserve({ ...reservation('unknown-field', 'draft', [{ id: 'slot', maxMicro: 1 }]), price: 1 }), /unknown field price/)

  await journal.reserve(reservation('accounting', 'draft', [{ id: 'slot', maxMicro: 50 }]))
  await journal.claimDispatch('accounting', 'slot')
  await assert.rejects(journal.accountDispatch('accounting', 'slot', { observedMicro: -1, source: FACTORY_ACCOUNTING_SOURCE }), /nonnegative safe integer/)
  await assert.rejects(journal.accountDispatch('accounting', 'slot', { observedMicro: Number.NaN, source: FACTORY_ACCOUNTING_SOURCE }), /nonnegative safe integer/)
  await assert.rejects(journal.accountDispatch('accounting', 'slot', { observedMicro: Number.MAX_SAFE_INTEGER + 1, source: FACTORY_ACCOUNTING_SOURCE }), /nonnegative safe integer/)
  await assert.rejects(journal.accountDispatch('accounting', 'slot', { observedMicro: 1, source: 'invoice' }), /configured-table-usage/)
})

test('public operations serialize concurrent claims and reservations, and close waits for an active write', async t => {
  const { path, journal } = await initialized(t)
  await journal.reserve(reservation('concurrent-claim', 'draft', [{ id: 'request', maxMicro: 30 }]))
  const claims = await Promise.all([journal.claimDispatch('concurrent-claim', 'request'), journal.claimDispatch('concurrent-claim', 'request')])
  assert.deepEqual(claims.map(result => result.status).sort(), ['already-claimed', 'claimed'])

  await Promise.all([
    journal.reserve(reservation('concurrent-a', 'gpu', [{ id: 'job', maxMicro: 40 }])),
    journal.reserve(reservation('concurrent-b', 'gpu', [{ id: 'job', maxMicro: 50 }])),
  ])
  assert.deepEqual((await journal.snapshot()).runs.map(run => run.runId).sort(), ['concurrent-a', 'concurrent-b', 'concurrent-claim'])
  assert.equal((await journal.totals()).heldMicro, 120)
  await journal.close()

  const base = nodeFactoryJournalIo()
  let entered!: () => void, release!: () => void
  const writing = new Promise<void>(resolve => { entered = resolve })
  const gate = new Promise<void>(resolve => { release = resolve })
  let block = true
  const io: FactoryJournalIo = {
    ...base,
    async replace(from, to) {
      if (block) { block = false; entered(); await gate }
      await base.replace(from, to)
    },
  }
  const waiting = await openFactoryJournal(path, { sourceDigest: SOURCE }, { io })
  const reserving = waiting.reserve(reservation('close-waits', 'draft', [{ id: 'request', maxMicro: 60 }]))
  await writing
  let closed = false
  const closing = waiting.close().then(() => { closed = true })
  await new Promise<void>(resolve => setImmediate(resolve))
  assert.equal(closed, false)
  assert.equal((await readFile(`${path}.lock`, 'utf8')).includes('owner'), true)
  release()
  await Promise.all([reserving, closing])
  assert.equal(closed, true)
  const recovered = await openFactoryJournal(path, { sourceDigest: SOURCE })
  assert.equal((await recovered.getRun('close-waits'))?.slots[0]?.maxMicro, 60)
  await recovered.close()
})

test('a configured-price accounting overrun is durably fenced across reopen', async t => {
  const { path, journal } = await initialized(t)
  await journal.reserve(reservation('overrun', 'draft', [{ id: 'request', maxMicro: 100 }]))
  await journal.claimDispatch('overrun', 'request')
  await assert.rejects(journal.accountDispatch('overrun', 'request', { observedMicro: 101, source: FACTORY_ACCOUNTING_SOURCE }), /durably fenced/)
  assert.deepEqual((await journal.snapshot()).fault, {
    code: 'accounting-overrun', runId: 'overrun', slotId: 'request', maxMicro: 100, observedMicro: 101, source: FACTORY_ACCOUNTING_SOURCE,
  })
  await assert.rejects(journal.reserve(reservation('later', 'draft', [{ id: 'request', maxMicro: 1 }])), /terminal fault/)
  await assert.rejects(journal.claimDispatch('overrun', 'request'), /terminal fault/)
  await journal.close()

  const recovered = await openFactoryJournal(path, { sourceDigest: SOURCE })
  assert.equal((await recovered.snapshot()).fault?.observedMicro, 101)
  await assert.rejects(recovered.reserve(reservation('after-reopen', 'gpu', [{ id: 'job', maxMicro: 1 }])), /terminal fault/)
  await recovered.close()
})

test('a reserve persistence failure latches the session and forbids every later mutation', async t => {
  const { path, journal } = await initialized(t)
  await journal.close()
  const base = nodeFactoryJournalIo()
  let failed = false
  const io: FactoryJournalIo = {
    ...base,
    async replace(from, to) {
      if (!failed) { failed = true; throw new Error('fixture replace failure') }
      await base.replace(from, to)
    },
  }
  const broken = await openFactoryJournal(path, { sourceDigest: SOURCE }, { io })
  await assert.rejects(broken.reserve(reservation('not-saved', 'draft', [{ id: 'slot', maxMicro: 10 }])), /persistence failed and is latched/)
  await assert.rejects(broken.reserve(reservation('later', 'draft', [{ id: 'slot', maxMicro: 10 }])), /is latched/)
  await assert.rejects(broken.claimDispatch('not-saved', 'slot'), /is latched/)
  await broken.close()

  const recovered = await openFactoryJournal(path, { sourceDigest: SOURCE })
  assert.equal(await recovered.getRun('not-saved'), null)
  await recovered.close()
})

test('an unconfirmed accounting-overrun fence retains its lock and prevents reopen', async t => {
  const { path, journal } = await initialized(t)
  await journal.close()
  const base = nodeFactoryJournalIo()
  let fail = false
  const io: FactoryJournalIo = {
    ...base,
    async replace(from, to) {
      if (fail) { fail = false; throw new Error('fixture fault persistence failure') }
      await base.replace(from, to)
    },
  }
  const uncertain = await openFactoryJournal(path, { sourceDigest: SOURCE }, { io })
  await uncertain.reserve(reservation('uncertain-overrun', 'draft', [{ id: 'request', maxMicro: 25 }]))
  await uncertain.claimDispatch('uncertain-overrun', 'request')
  fail = true
  await assert.rejects(uncertain.accountDispatch('uncertain-overrun', 'request', { observedMicro: 26, source: FACTORY_ACCOUNTING_SOURCE }), /persistence failed and is latched/)
  await assert.rejects(uncertain.close(), /terminal fault persistence is uncertain/)
  await assert.rejects(openFactoryJournal(path, { sourceDigest: SOURCE }), /lock is unavailable/)
})

test('a post-rename dispatch failure latches locally and restart never authorizes the same request twice', async t => {
  const { path, journal } = await initialized(t)
  await journal.close()

  const base = nodeFactoryJournalIo()
  let failNextSync = false
  const io: FactoryJournalIo = {
    ...base,
    async syncDirectory(path) {
      if (failNextSync) { failNextSync = false; throw new Error('fixture directory fsync failure') }
      await base.syncDirectory(path)
    },
  }
  const uncertain = await openFactoryJournal(path, { sourceDigest: SOURCE }, { io })
  await uncertain.reserve(reservation('uncertain-dispatch', 'draft', [{ id: 'request', maxMicro: 500 }]))
  failNextSync = true
  await assert.rejects(uncertain.claimDispatch('uncertain-dispatch', 'request'), /persistence failed and is latched/)
  await assert.rejects(uncertain.claimDispatch('uncertain-dispatch', 'request'), /is latched/)
  await uncertain.close()

  const recovered = await openFactoryJournal(path, { sourceDigest: SOURCE })
  assert.equal((await recovered.claimDispatch('uncertain-dispatch', 'request')).status, 'already-claimed')
  const held = await recovered.finalize('uncertain-dispatch', { reason: 'request-failed' })
  assert.equal(held.state, 'held')
  assert.equal((await recovered.totals()).heldMicro, 500)
  await recovered.close()

  const accounted = await openFactoryJournal(path, { sourceDigest: SOURCE })
  assert.equal((await accounted.claimDispatch('uncertain-dispatch', 'request')).status, 'already-claimed')
  const run = await accounted.accountDispatch('uncertain-dispatch', 'request', { observedMicro: 125, source: FACTORY_ACCOUNTING_SOURCE })
  assert.equal(run.state, 'accounted')
  assert.deepEqual(await accounted.totals(), { settledMicro: 125, heldMicro: 0, exposureMicro: 125, remainingMicro: FACTORY_CAP_MICRO - 125, workerComputeCost: 'unknown' })
  await accounted.close()
})

test('mid-write ownership and ledger replacements never return a dispatch claim', async t => {
  await t.test('lock replacement after the temporary write is detected before rename', async t => {
    const { path, journal } = await initialized(t)
    await journal.close()
    const base = nodeFactoryJournalIo(), lockPath = `${path}.lock`
    let attack = false
    const io: FactoryJournalIo = {
      ...base,
      async writeExclusive(file, text) {
        await base.writeExclusive(file, text)
        if (attack && file.includes('.tmp-')) {
          attack = false
          await rename(lockPath, `${lockPath}.original`)
          await writeFile(lockPath, '{"owner":"foreign"}\n', { encoding: 'utf8', mode: 0o600 })
        }
      },
    }
    const active = await openFactoryJournal(path, { sourceDigest: SOURCE }, { io })
    await active.reserve(reservation('lock-replaced', 'draft', [{ id: 'request', maxMicro: 10 }]))
    attack = true
    await assert.rejects(active.claimDispatch('lock-replaced', 'request'), /persistence failed and is latched/)
    const disk = JSON.parse(await readFile(path, 'utf8')) as { runs: Array<{ slots: Array<{ state: string }> }> }
    assert.equal(disk.runs[0]?.slots[0]?.state, 'reserved')
    await assert.rejects(active.close(), /close refused/)
  })

  await t.test('ledger replacement after the temporary write is not overwritten', async t => {
    const { path, journal } = await initialized(t)
    await journal.close()
    const base = nodeFactoryJournalIo()
    let attack = false
    const io: FactoryJournalIo = {
      ...base,
      async writeExclusive(file, text) {
        await base.writeExclusive(file, text)
        if (attack && file.includes('.tmp-')) {
          attack = false
          await rename(path, `${path}.original`)
          await writeFile(path, 'foreign-ledger\n', { encoding: 'utf8', mode: 0o600 })
        }
      },
    }
    const active = await openFactoryJournal(path, { sourceDigest: SOURCE }, { io })
    await active.reserve(reservation('ledger-replaced', 'draft', [{ id: 'request', maxMicro: 10 }]))
    attack = true
    await assert.rejects(active.claimDispatch('ledger-replaced', 'request'), /persistence failed and is latched/)
    assert.equal(await readFile(path, 'utf8'), 'foreign-ledger\n')
    await active.close()
  })

  await t.test('same-text destination replacement after rename is rejected by inode identity', async t => {
    const { path, journal } = await initialized(t)
    await journal.close()
    const base = nodeFactoryJournalIo()
    let attack = false
    const io: FactoryJournalIo = {
      ...base,
      async replace(from, to) {
        await base.replace(from, to)
        if (attack && to === path) {
          attack = false
          const sameText = await readFile(to, 'utf8')
          await rename(to, `${to}.authorized-inode`)
          await writeFile(to, sameText, { encoding: 'utf8', mode: 0o600 })
        }
      },
    }
    const active = await openFactoryJournal(path, { sourceDigest: SOURCE }, { io })
    await active.reserve(reservation('same-text-replaced', 'draft', [{ id: 'request', maxMicro: 10 }]))
    attack = true
    await assert.rejects(active.claimDispatch('same-text-replaced', 'request'), /persistence failed and is latched/)
    await active.close()
    const recovered = await openFactoryJournal(path, { sourceDigest: SOURCE })
    assert.equal((await recovered.claimDispatch('same-text-replaced', 'request')).status, 'already-claimed')
    await recovered.close()
  })
})

test('invalid output is never prepared, while prepared artifacts recover and commit with immutable audit data', async t => {
  const { path, journal } = await initialized(t)
  await journal.reserve(reservation('invalid-output', 'draft', [{ id: 'request', maxMicro: 50 }]))
  await journal.claimDispatch('invalid-output', 'request')
  await journal.accountDispatch('invalid-output', 'request', { observedMicro: 12, source: FACTORY_ACCOUNTING_SOURCE })
  await journal.finalize('invalid-output', { reason: 'invalid-reply' })
  await assert.rejects(journal.prepareArtifact('invalid-output', { sha256: ARTIFACT, path: 'out/invalid.json' }), /not ready to prepare output/)

  await journal.reserve(reservation('valid-output', 'draft', [{ id: 'request', maxMicro: 70 }]))
  await journal.claimDispatch('valid-output', 'request')
  await journal.accountDispatch('valid-output', 'request', { observedMicro: 30, source: FACTORY_ACCOUNTING_SOURCE })
  await journal.finalize('valid-output', { reason: 'success' })
  const prepared = await journal.prepareArtifact('valid-output', { sha256: ARTIFACT, path: 'out/bank.json' })
  assert.equal(prepared.state, 'output-prepared')
  await journal.close()

  const recovered = await openFactoryJournal(path, { sourceDigest: SOURCE })
  const readback = await recovered.getRun('valid-output')
  assert.deepEqual(readback?.artifact, { sha256: ARTIFACT, path: 'out/bank.json', state: 'prepared' })
  assert.equal((await recovered.claimDispatch('valid-output', 'request')).status, 'already-claimed')
  await assert.rejects(recovered.prepareArtifact('valid-output', { sha256: 'e'.repeat(64), path: 'out/bank.json' }), /conflicting artifact data/)
  await assert.rejects(recovered.markCommitted('valid-output', { sha256: ARTIFACT, path: 'out/other.json' }), /does not match/)
  const committed = await recovered.markCommitted('valid-output', { sha256: ARTIFACT, path: 'out/bank.json' })
  assert.equal(committed.state, 'committed')
  assert.equal((await recovered.markCommitted('valid-output', { sha256: ARTIFACT, path: 'out/bank.json' })).state, 'committed')
  await recovered.close()
})

test('a successful fallback may publish while an ambiguous earlier dispatch remains fully held', async t => {
  const { path, journal } = await initialized(t)
  await journal.reserve(reservation('fallback-success', 'draft', [{ id: 'primary', maxMicro: 100 }, { id: 'fallback', maxMicro: 50 }]))
  await journal.claimDispatch('fallback-success', 'primary')
  await journal.claimDispatch('fallback-success', 'fallback')
  await journal.accountDispatch('fallback-success', 'fallback', { observedMicro: 20, source: FACTORY_ACCOUNTING_SOURCE })
  const finalized = await journal.finalize('fallback-success', { reason: 'success' })
  assert.equal(finalized.state, 'held')
  assert.equal(finalized.slots.find(slot => slot.id === 'primary')?.state, 'held')
  assert.equal(finalized.slots.find(slot => slot.id === 'fallback')?.state, 'accounted')
  await journal.prepareArtifact('fallback-success', { sha256: ARTIFACT, path: 'out/fallback-bank.json' })
  await journal.markCommitted('fallback-success', { sha256: ARTIFACT, path: 'out/fallback-bank.json' })
  assert.deepEqual(await journal.totals(), { settledMicro: 20, heldMicro: 100, exposureMicro: 120, remainingMicro: FACTORY_CAP_MICRO - 120, workerComputeCost: 'unknown' })
  await journal.close()

  const recovered = await openFactoryJournal(path, { sourceDigest: SOURCE })
  const run = await recovered.getRun('fallback-success')
  assert.equal(run?.state, 'committed')
  assert.equal(run?.slots.find(slot => slot.id === 'primary')?.state, 'held')
  assert.equal((await recovered.claimDispatch('fallback-success', 'primary')).status, 'already-claimed')
  assert.equal((await recovered.totals()).heldMicro, 100)
  await recovered.close()
})

test('corrupt or externally replaced ledgers and replaced locks fail closed', async t => {
  const first = await folder(t)
  const corrupt = await initializeFactoryJournal(first.path, { sourceDigest: SOURCE, priorExternalSpendMicro: 0 })
  await corrupt.close()
  await writeFile(first.path, '{bad json', 'utf8')
  await assert.rejects(openFactoryJournal(first.path, { sourceDigest: SOURCE }), /not valid JSON/)

  const second = await folder(t)
  const active = await initializeFactoryJournal(second.path, { sourceDigest: SOURCE, priorExternalSpendMicro: 0 })
  const saved = join(second.dir, 'saved.json'), sameText = await readFile(second.path, 'utf8')
  await rename(second.path, saved)
  await writeFile(second.path, sameText, { encoding: 'utf8', mode: 0o600 })
  await assert.rejects(active.getRun('anything'), /latched.*replaced or changed/)
  await assert.rejects(active.reserve(reservation('later', 'draft', [{ id: 'slot', maxMicro: 1 }])), /is latched/)
  await active.close()

  const third = await folder(t)
  const lockOwner = await initializeFactoryJournal(third.path, { sourceDigest: SOURCE, priorExternalSpendMicro: 0 })
  const lockPath = `${third.path}.lock`, originalLock = join(third.dir, 'original.lock')
  await rename(lockPath, originalLock)
  await writeFile(lockPath, '{"owner":"someone-else"}\n', { encoding: 'utf8', mode: 0o600 })
  await assert.rejects(lockOwner.close(), /close refused/)
  assert.equal(await readFile(lockPath, 'utf8'), '{"owner":"someone-else"}\n')
})
