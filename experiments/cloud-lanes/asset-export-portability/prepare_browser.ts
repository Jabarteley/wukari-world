// Compile only the read-only production static importer; all its imports are type-only.
import { stripTypeScriptTypes } from 'node:module';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const source = new URL('../../../src/scene/models/gltf-source.ts', import.meta.url);
const output = new URL('./.generated/', import.meta.url);
mkdirSync(output, { recursive: true });
const bytes = readFileSync(source, 'utf8');
writeFileSync(new URL('gltf-source.js', output), stripTypeScriptTypes(bytes, {mode: 'strip'}));
writeFileSync(new URL('importer-pin.json', output), JSON.stringify({path: 'src/scene/models/gltf-source.ts', sha256: createHash('sha256').update(bytes).digest('hex')}, null, 2));
