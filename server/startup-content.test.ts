import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('a cold Node host loads only the city requested by its first player', () => {
  const child = spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', `
    import { mkdtemp, rm } from 'node:fs/promises';
    import { tmpdir } from 'node:os';
    import { join } from 'node:path';
    import { createServer } from './server/server.ts';
    import { registeredCityIds, cachedCityContent } from './src/game/cities/registry.ts';
    const dir = await mkdtemp(join(tmpdir(), 'startup-content-'));
    const server = await createServer({ dataDir: dir });
    const loaded = () => registeredCityIds().filter(id => cachedCityContent(id) !== null);
    const before = loaded();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const origin = 'http://127.0.0.1:' + address.port;
    const session = await fetch(origin + '/api/session', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({name:'City Reader'}) });
    const cookie = session.headers.get('set-cookie')?.split(';')[0];
    const life = await fetch(origin + '/api/life?city=lagos', { headers: { origin, cookie } });
    const body = await life.json();
    console.log(JSON.stringify({ before, after: loaded(), sessionStatus: session.status, lifeStatus: life.status, city: body.state?.estate?.city }));
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await rm(dir, { recursive: true, force: true });
  `], { encoding: 'utf8', timeout: 30000 })
  assert.equal(child.status, 0, child.stderr)
  const result = JSON.parse(child.stdout)
  assert.deepEqual(result.before, [])
  assert.deepEqual(result.after, ['lagos'])
  assert.equal(result.sessionStatus, 200)
  assert.equal(result.lifeStatus, 200)
  assert.equal(result.city, 'lagos')
})

test('the Worker startup loads shared links without fetching every city', () => {
  const source = readFileSync(new URL('../deploy/cloudflare-worker.ts', import.meta.url), 'utf8')
  assert.match(source, /startup: \[loadCityLinks\(\)\]/)
  assert.doesNotMatch(source, /registeredCityIds\(\)\.map\(loadCityContent\)/)
  assert.match(source, /await Promise\.all\(context\.startup\.splice\(0\)\)/)
})
