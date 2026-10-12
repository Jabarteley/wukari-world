// A browser keeps a limited number of WebGL contexts for a page and, past it, takes the oldest away, whichever screen it belongs to.
// A scene that makes its own renderer therefore gives the context back when it is closed: dispose() alone keeps it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
/** Development pages that live as long as their tab: nothing in the game opens and closes them. */
const TOOLS = [/^scene\/harness\.ts$/, /^models\//, /^campus\/unilag\/preview\.ts$/];
function sources(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sources(path, found);
    else if (/\.(ts|vue)$/.test(name) && !/\.test\.ts$/.test(name)) found.push(path);
  }
  return found;
}

test('every scene that makes a WebGL renderer gives its context back when it is closed', () => {
  const makers = sources(root).filter((path) => /new (THREE\.)?WebGLRenderer\(/.test(readFileSync(path, 'utf8'))).map((path) => relative(root, path)).filter((path) => !TOOLS.some((tool) => tool.test(path)));
  assert.ok(makers.length >= 8, `found ${makers.length} scenes that make a renderer`);
  for (const path of makers) assert.match(readFileSync(join(root, path), 'utf8'), /forceContextLoss/, `src/${path} makes a renderer and never gives the context back`);
});
