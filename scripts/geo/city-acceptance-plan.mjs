import { readFileSync, writeFileSync, appendFileSync, globSync } from 'node:fs';
import { resolve } from 'node:path';

const [mode = 'plan', target = 'scripts/geo/city-acceptance-batch.json', shard] = process.argv.slice(2);
const fail = (message) => { throw new Error(message); };
if (mode === 'plan') {
  const config = JSON.parse(readFileSync(target, 'utf8'));
  if (config.schemaVersion !== 1 || !Array.isArray(config.queue)) fail('Invalid acceptance queue');
  const ids = new Set();
  for (const batch of config.queue) {
    if (!/^[a-z0-9-]+$/.test(batch.id) || ids.has(batch.id)) fail('Invalid or duplicate batch id');
    ids.add(batch.id);
    for (const key of ['appSha', 'driverSha']) if (!/^[a-f0-9]{40}$/.test(batch[key])) fail(`Invalid ${key}`);
    if (!Array.isArray(batch.cities) || batch.cities.length < 1 || batch.cities.length > 5 || new Set(batch.cities).size !== batch.cities.length || batch.cities.some(city => !/^[a-z0-9-]+$/.test(city))) fail('Batch must contain one to five unique city ids');
  }
  // Queue only new work. Completed/current batches are removed by the operator, never inferred or rerun here.
  const batch = config.queue[0];
  const output = { active: String(Boolean(batch)), app: batch?.appSha ?? '', driver: batch?.driverSha ?? '', batch: batch?.id ?? '', cities: JSON.stringify(batch?.cities ?? []) };
  writeFileSync('acceptance-plan.json', JSON.stringify({ nodeVersion: '24.19.0', shards: 4, ...output, queue: config.queue }, null, 2));
  if (process.env.GITHUB_OUTPUT) for (const [key, value] of Object.entries(output)) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  console.log(JSON.stringify(output));
} else if (mode === 'shard') {
  if (!/^[1-4]$/.test(shard ?? '')) fail('Shard must be 1 through 4');
  const pkg = JSON.parse(readFileSync(resolve(target, 'package.json'), 'utf8'));
  const command = pkg.scripts?.test;
  // Preserve every option and glob from the pinned npm test command; reject unfamiliar syntax.
  if (!/^node --experimental-strip-types --test --test-concurrency=1(?: "[a-zA-Z0-9_./*?-]+")+$/.test(command)) fail('Pinned npm test command changed; review sharding before proceeding');
  const patterns = [...command.matchAll(/"([^"]+)"/g)].map(match => match[1]);
  const files = [...new Set(patterns.flatMap(pattern => globSync(pattern, { cwd: target })))].sort();
  if (!files.length) fail('No tests matched the full suite');
  const sharded = command.replace(/^node /, `node --test-shard=${shard}/4 `);
  writeFileSync(resolve(process.env.ACCEPTANCE_LOGS ?? '.', 'shard-manifest.json'), JSON.stringify({ nodeVersion: process.version, originalScript: command, command: sharded, shard: `${shard}/4`, patterns, fullSuiteFiles: files }, null, 2));
  // npm retains its normal pretest lifecycle and shell glob handling.
  pkg.scripts.test = sharded;
  writeFileSync(resolve(target, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
} else fail(`Unknown mode: ${mode}`);
