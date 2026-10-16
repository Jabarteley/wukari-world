import assert from 'node:assert/strict';
import { SCENE_CHARACTER_TRIANGLES, SCENE_DRAW_CALLS, SCENE_SCENERY_MESHES, SCENE_SCENERY_TRIANGLES, SCENE_TRIANGLES } from '../../budgets.ts';
/** Node-only asset boundary for scene tests. It loads the shipped native files while replacing only browser image decoding. */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scope = globalThis as unknown as Record<string, unknown>;
const root = fileURLToPath(new URL('../../../', import.meta.url));
const originalFetch = globalThis.fetch;
const originalDocument = scope.document;

if (!scope.location) scope.location = { href: 'http://native-character.test/' };
if (!scope.self) scope.self = globalThis;
if (!scope.ProgressEvent) scope.ProgressEvent = class ProgressEvent extends Event {
  constructor(type: string, values: Record<string, unknown> = {}) { super(type); Object.assign(this, values); }
};
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const raw = String(input instanceof Request ? input.url : input);
  const url = new URL(raw, String((scope.location as { href?: string }).href ?? 'http://native-character.test/'));
  if (url.protocol === 'file:' || url.hostname === 'native-character.test') {
    const filename = url.protocol === 'file:' ? fileURLToPath(url) : path.join(root, 'public', url.pathname);
    try {
      const bytes = await readFile(filename);
      const type = filename.endsWith('.json') ? 'application/json' : filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? 'image/jpeg' : 'application/octet-stream';
      return new Response(bytes, { status: 200, headers: { 'Content-Type': type } });
    } catch { return new Response('Missing local test asset', { status: 404 }); }
  }
  return originalFetch(input, init);
}) as typeof fetch;

scope.createImageBitmap = async () => ({ width: 1, height: 1, close() {} });
class FixtureImage {
  width = 1; height = 1;
  private listeners = new Map<string, (event: { target: FixtureImage }) => void>();
  addEventListener(type: string, listener: (event: { target: FixtureImage }) => void) { this.listeners.set(type, listener); }
  removeEventListener(type: string) { this.listeners.delete(type); }
  set src(_value: string) { queueMicrotask(() => this.listeners.get('load')?.({ target: this })); }
}
function fixtureElement(tag: string) {
  const element = {
    tagName: tag.toUpperCase(), className: '', textContent: '', hidden: false, parentElement: null as unknown,
    dataset: {} as Record<string, string>, style: {} as Record<string, string>, children: [] as unknown[],
    width: 1, height: 1,
    setAttribute() {}, addEventListener() {}, removeEventListener() {},
    appendChild(child: { parentElement?: unknown }) { child.parentElement = element; element.children.push(child); return child; },
    append(...children: Array<{ parentElement?: unknown }>) { children.forEach((child) => element.appendChild(child)); },
    replaceChildren(...children: Array<{ parentElement?: unknown }>) { element.children = []; element.append(...children); },
    remove() { element.parentElement = null; },
    getContext: tag === 'canvas' ? () => ({
      drawImage() {}, putImageData() {},
      getImageData: () => ({ data: new Uint8ClampedArray([128, 128, 128, 255]) }),
    }) : undefined,
  };
  return element;
}
export const nativeTestDocument = {
  createElementNS(_namespace: string, tag: string) { return tag === 'img' ? new FixtureImage() : fixtureElement(tag); },
  createElement: fixtureElement,
};
if (!originalDocument) scope.document = nativeTestDocument;

const [{ preloadLooks }, { preloadNativeStaticLod }] = await Promise.all([
  import('../character-lab/native-body.ts'),
  import('./native-static-lod.ts'),
]);
await Promise.all([
  preloadLooks([
    { look: { body: 'woman', hair: 'low-cut', outfit: 'casual' }, seed: 'fixture-female' },
    { look: { body: 'man', hair: 'low-cut', outfit: 'casual' }, seed: 'fixture-male' },
    { look: { body: 'woman', hair: 'braids', outfit: 'owambe' }, seed: 'preview' },
    { look: { body: 'woman', hair: 'afro', outfit: 'owambe' }, seed: 'preview' },
    { look: { body: 'woman', hair: 'braids', outfit: 'office' }, seed: 'preview' },
  ]),
  preloadNativeStaticLod(),
]);
if (originalDocument) scope.document = originalDocument;
else delete scope.document;

/** Geometry and submission accounting for shipped native scene fixtures. */
export function assertNativeSceneBudget(stats: import('../types.ts').SceneStats, label: string): void {
  assert.equal(stats.sceneryTriangles + stats.characterTriangles, stats.triangles, `${label}: triangle composition`);
  assert.equal(stats.sceneryMeshes + stats.characterMeshes, stats.meshes, `${label}: mesh composition`);
  assert.equal(stats.sceneryDrawCalls + stats.characterDrawCalls, stats.drawCalls, `${label}: draw composition`);
  assert.ok(stats.sceneryTriangles <= SCENE_SCENERY_TRIANGLES.value, `${label}: scenery ${stats.sceneryTriangles} triangles`);
  assert.ok(stats.characterTriangles <= SCENE_CHARACTER_TRIANGLES.value, `${label}: characters ${stats.characterTriangles} triangles`);
  assert.ok(stats.triangles <= SCENE_TRIANGLES.value, `${label}: total ${stats.triangles} triangles`);
  assert.ok(stats.sceneryMeshes <= SCENE_SCENERY_MESHES.value, `${label}: scenery ${stats.sceneryMeshes} meshes`);
  assert.ok(stats.drawCalls <= SCENE_DRAW_CALLS.value, `${label}: ${stats.drawCalls} draw calls`);
}
