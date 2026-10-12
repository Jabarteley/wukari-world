import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const factorySha = '0786c00510f2827d6495a53fc3299f3112d0d6b4';
const baseSha256 = 'c81564790e70c3bb978c66e7530f0c869c0f46d5291092c440cca818a2f63b0f';
const override = { farWaterTolerance: 0.0012 };
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const args = process.argv.slice(2);
const check = args.includes('--check'), stdin = args.includes('--stdin');
const flags = check && stdin ? ['--manifest'] : ['--factory-source', '--manifest', '--table', ...(check ? [] : ['--receipt'])];
assert.equal(args.length, flags.length * 2 + Number(check) + Number(stdin), 'Usage: --check --stdin --manifest JSON (stdin: { source, table }), or [--check] --factory-source DIR --manifest JSON --table JSON [--receipt JSON]');
const pairs = args.filter(arg => arg !== '--check' && arg !== '--stdin');
assert.deepEqual(pairs.filter((_, index) => index % 2 === 0), flags, 'Unexpected argument order or flags');
const options = Object.fromEntries(flags.map((flag, index) => [flag, resolve(pairs[index * 2 + 1])]));
const pin = JSON.parse(readFileSync(options['--manifest'], 'utf8'));
assert.equal(pin.factorySha, factorySha);
assert.equal(pin.appSha, 'dc4686cf8c8be427a6e96f328e6581b6669715e4');
assert.equal(pin.farWaterRenderPolicy.kind, 'singapore-far-water-render-only-v1');
assert.equal(pin.farWaterRenderPolicy.factoryBatchSha256, baseSha256);
assert.deepEqual(pin.farWaterRenderPolicy.geometryOverrides, override);
let source, table, file;
if (stdin) {
    assert.ok(check, 'stdin is read-only');
    ({ source, table } = JSON.parse(readFileSync(0, 'utf8')));
} else {
    const root = options['--factory-source'];
    const head = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
    assert.equal(head.status, 0, head.stderr);
    assert.equal(head.stdout.trim(), factorySha, 'Factory checkout is not pinned');
    file = join(root, 'scripts/geo/factory/batch.mjs');
    source = readFileSync(file, 'utf8');
    table = JSON.parse(readFileSync(options['--table'], 'utf8'));
}
assert.equal(table.expectedSourceGitSHA, pin.appSha);
assert.equal(table.geometryPreset, 'standard');
assert.equal(table.targets.length, 1, 'Only singleton Singapore is authorized');
assert.equal(table.targets[0].id, 'singapore');
assert.equal(table.targets[0].country, 'sg');
assert.deepEqual(table.targets[0].geometryOverrides, override, 'Only farWaterTolerance 0.0012 is authorized');
assert.deepEqual(table.targets[0].sourceVenueOverrides ?? {}, {}, 'Venue selection overrides are not authorized');
assert.equal(digest(source), baseSha256, 'Factory batch bytes differ from exact baseline');
const seam = '        const config = { ...old, name: target.name, box: boxes.play, core: boxes.core, places: choices, names };';
assert.equal(source.split(seam).length, 2, 'Expected one exact final CONFIG seam');
const replacement = `        if (target.id !== 'singapore' || target.country !== 'sg' || table.targets.length !== 1 ||
            JSON.stringify(target.geometryOverrides) !== '${JSON.stringify(override)}')
            throw new Error('Only singleton Singapore farWaterTolerance 0.0012 is authorized');
        const config = { ...old, name: target.name, box: boxes.play, core: boxes.core, places: choices, names, farWaterTolerance: 0.0012 };`;
const patched = source.replace(seam, replacement);
assert.equal(patched.replace(replacement, seam), source, 'Unexpected change outside CONFIG seam');
const syntax = spawnSync(process.execPath, ['--check', '--input-type=module', '-'], { encoding: 'utf8', input: patched });
assert.equal(syntax.status, 0, `Patched batch syntax is invalid: ${syntax.stderr}`);
const receipt = {
    kind: pin.farWaterRenderPolicy.kind, appSha: pin.appSha, factorySha,
    baseBatchSha256: digest(source), patchedBatchSha256: digest(patched),
    helperSha256: digest(readFileSync(fileURLToPath(import.meta.url))),
    overrideSha256: digest(JSON.stringify(override)), geometryOverrides: override,
    effectiveConfig: { farWaterTolerance: 0.0012 },
    seamSha256: digest(seam), replacementSha256: digest(replacement), check,
    scope: pin.farWaterRenderPolicy.scope,
};
if (!check) {
    writeFileSync(options['--receipt'], `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' });
    writeFileSync(file, patched);
}
console.log(JSON.stringify(receipt));
