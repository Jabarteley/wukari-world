import assert from 'node:assert/strict';
import test from 'node:test';
import type * as THREE from 'three';
await import('./node-test-fixture.ts');
const { loadCityScenes } = await import('../city-scenes.ts');
const { createVenueWorld } = await import('../../venue-world.ts');
const { DEFAULT_LOOK } = await import('../../game/content/traits.ts');
const { preloadLooks } = await import('../character-lab/native-body.ts');
const { regularsFor } = await import('../../game/cities/runtime.ts');
const { crowdList } = await import('../crowd.ts');
const { lagosTime } = await import('../../game/clock.ts');
const { weatherAt } = await import('../../game/systems/health.ts');
const { createLife } = await import('../../life.ts');

function frames(errors: string[]) {
  const original = [globalThis.requestAnimationFrame, globalThis.cancelAnimationFrame] as const;
  let id = 0, time = performance.now(), queue: { id: number; callback: FrameRequestCallback }[] = [];
  globalThis.requestAnimationFrame = callback => { queue.push({ id: ++id, callback }); return id; };
  globalThis.cancelAnimationFrame = id => { queue = queue.filter(task => task.id !== id); };
  return { flush() { const pending = queue; queue = []; time += 16; for (const task of pending) { try { task.callback(time); } catch (e) { errors.push(String(e)); } } }, size: () => queue.length,
    restore() { [globalThis.requestAnimationFrame, globalThis.cancelAnimationFrame] = original; } };
}

test('actual Accra outer host admits late native population alongside mandatory recipe geometry', { timeout: 180_000 }, async () => {
  // Enable the street-life capability gate; all geometry comes from real native assets.
  const webgl = globalThis.WebGL2RenderingContext; Object.defineProperty(globalThis, 'WebGL2RenderingContext', { configurable: true, writable: true, value: class BrowserCapability {} });
  const errors: string[] = [];
  const submitted: { actual: { triangles: number; draws: number }; entryDraws?: number }[] = [];
  const scheduler = frames(errors), realNow = Date.now, realError = console.error;
  let world: ReturnType<typeof createVenueWorld> | undefined, scene: THREE.Scene | undefined;
  let time = 1792430142855;
  Date.now = () => time;
  console.error = (...args) => { errors.push(args.map(String).join(' ')); realError(...args); };
  let expectedRoot: THREE.Object3D | undefined;
  const actual = (root: THREE.Object3D) => {
    let triangles = 0, draws = 0, native = 0, skinned = 0, loading = 0;
    root.traverseVisible(node => {
      if (node.userData.characterFoundation === 'native53') native++;
      if (node.userData.characterStatus === 'loading') loading++;
      const mesh = node as THREE.Mesh; if (!mesh.isMesh) return;
      if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) skinned++;
      const g = mesh.geometry, count = Math.max(0, Math.min(g.index?.count ?? g.getAttribute('position')?.count ?? 0, g.drawRange.start + g.drawRange.count) - g.drawRange.start);
      const materials = mesh.material, calls = Array.isArray(materials) ? g.groups.filter(part => part.start < g.drawRange.start + count && part.start + part.count > g.drawRange.start && materials[part.materialIndex ?? 0]?.visible).length : Number(materials.visible);
      if (calls) { triangles += Math.floor(count / 3) * ((mesh as THREE.InstancedMesh).isInstancedMesh ? (mesh as THREE.InstancedMesh).count : 1); draws += calls * (mesh.castShadow ? 2 : 1); }
    });
    return { triangles, draws, native, skinned, loading };
  };
  const retained = (label: string) => {
    assert.ok(scene); assert.equal(world!.diagnostics().runtime?.status, 'ready', label);
    assert.equal(scene.getObjectByName('recipe:accra-market-game'), expectedRoot, `${label}: same complete geometry`);
    assert.deepEqual(world!.diagnostics().people.filter(p => p.kind === 'npc').map(p => p.id).sort(), ['npc:accra-accra-market-game-1', 'npc:accra-accra-market-game-2']);
    const cost = actual(scene); assert.ok(cost.native > 0 && cost.skinned > 0 && cost.loading === 0, `${label}: actual native readiness`);
    assert.ok(cost.draws <= 60 && cost.triangles <= 87000, `${label}: actual visible cost ${JSON.stringify(cost)}`);
  };
  async function drain(label: string, rounds = 250) {
    for (let i = 0; i < rounds; i++) {
      time += 16; scheduler.flush(); await new Promise(resolve => setTimeout(resolve, 4));
      if (world?.diagnostics().runtime?.error) break;
    }
    assert.ok(world, `${label}: host is present`);
  }
  try {
    await loadCityScenes('accra');
    // Nonsecret synthetic QA appearance, fixed to reproduce the seven-draw native player.
    const player = { look: {"body":"man","hair":"curls","outfit":"site-work","fabric":"adire","skin":"skin-5","hairColor":"black","outfitColor":"cream","bottomsColor":"orange","native":{"schema":"allworld-character","version":2,"appearance":{"version":2,"body":"male","hair":"afro01","garments":["male-worksuit-01"],"shoes":"shoes01","eyeColor":"brown","complexion":"deep","height":1,"features":{"nose-width":0,"nose-depth":0,"nose-height":0,"nose-tip":0,"nostril-width":0,"chin-width":0,"chin-height":0,"chin-prognathism":0,"chin-prominence":0,"mouth-width":0,"mouth-height":0,"upper-lip-volume":0,"lower-lip-volume":0,"brow-height":0,"brow-angle":0,"eye-aperture":0,"eye-width":0,"eye-slant":0,"inner-eye-fold":0,"eye-fold-angle":0,"face-width":0,"jaw-width":0,"cheekbones":0,"cheek-volume":0,"east-asian-head":0,"muscle":0,"weight":0,"shoulder-width":0,"upper-back-chest":0,"upper-arm-size":0,"bust-size":0,"waist":0,"hips":0,"buttock-volume":0,"thigh-size":0},"colors":{"skin":"#7a4a2c","hair":"#15110f","upper":"#ffffff","lower":"#ffffff","shoes":"#ffffff"},"handPose":"relaxed"},"emotion":"happy","emotionStrength":0.7}}, seed: 'recipe-population-player', name: 'Population fixture' };
    await preloadLooks([player]);
    const renderer = { shadowMap: {}, domElement: { remove() {} }, setPixelRatio() {}, setClearColor() {}, setSize() {}, dispose() {}, render(root: THREE.Scene) {
      scene = root;
      const entry = root.getObjectByName('recipe:accra-market-game')?.parent;
      submitted.push({ actual: actual(root), entryDraws: entry ? actual(entry).draws : undefined });
    } } as unknown as THREE.WebGLRenderer;
    world = createVenueWorld({ appendChild() {}, getBoundingClientRect: () => ({ width: 390, height: 844 }) } as unknown as HTMLElement, { location: 'home', cityId: 'accra', renderer });
    world.setPlayer(player);
    world.setLocation('accra-market-game');
    world.setState(createLife({ location: 'accra-market-game', estate: { city: 'accra' }, spot: 'aisle', t: time }, { now: time, cityId: 'accra' }));
    expectedRoot = scene?.getObjectByName('recipe:accra-market-game'); assert.ok(expectedRoot);
    await drain('initial-native');
    const regulars = crowdList({ npcs: regularsFor('accra').filter(n => n.venue === 'accra-market-game') });
    world.setCrowd(regulars);
    await drain('regulars-native');
    if (!world.diagnostics().runtime?.error) {
      world.setAmbient((venueId, kind) => ({ cityId: 'accra', venueId, kind, tier: 'full', rainingAt: at => weatherAt(at, 'accra').raining, hourAt: at => lagosTime(at).minuteOfDay / 60 }));
      await drain('ambient-load', 500);

      world.wakeAmbient(); await drain('late-wake', 500);
      world.zoom(-1); world.recentre(); await drain('zoom-reset', 250);
    }
    assert.equal(world.diagnostics().runtime?.status, 'ready', 'mandatory recipe survives native street settlement');
    {
      retained('late settlement');
      for (let i = 0; i < 3; i++) { world.wakeAmbient(); await drain(`bounded-wake-${i}`, 180); retained(`wake ${i}`); }
      world.setPlayer({ ...player, look: DEFAULT_LOOK }); await drain('hot-appearance', 250); retained('hot appearance');
      {
        const players = Array.from({ length: 6 }, (_, i) => ({ id: `network-${i}`, name: `Network ${i}`, look: DEFAULT_LOOK, ...(i === 4 ? {friend: true} : {}) }));
        const positions = Object.fromEntries(players.map((p,i) => [p.id, { x: i - 3, z: 3 }]));
        const appCrowd = crowdList({ players, positions, npcs: regularsFor('accra').filter(n => n.venue === 'accra-market-game') });
        assert.deepEqual(appCrowd.map(p => p.id), ['network-4','network-0','network-1','network-2','network-3','network-5',...regulars.map(p => p.id)]);
        world.setCrowd(appCrowd); await drain('network-admission', 300); retained('network admission');
        const network = world.diagnostics().people.filter(p => p.kind === 'player');
        assert.ok(network.length > 0 && network.length < players.length, 'optional live people are bounded');
        assert.deepEqual(network.map(p => p.id), appCrowd.filter(p => p.kind === 'player').slice(0,network.length).map(p => p.id), 'friends-first stable guest prefix');
        for (const person of network) assert.deepEqual({x:person.x,z:person.z}, positions[person.id], 'retained live coordinates unchanged');
        const settled = world.diagnostics().people.map(p => ({id:p.id,x:p.x,z:p.z}));
        world.setCrowd(appCrowd); world.wakeAmbient(); await drain('network-repeat', 180); retained('network repeat');
        assert.deepEqual(world.diagnostics().people.map(p => ({id:p.id,x:p.x,z:p.z})), settled, 'unchanged input preserves all retained positions');
        world.setCrowd(regulars); await drain('network-leave', 180); retained('network leave');
      }
      const old = expectedRoot; world.setAmbient(null); world.setLocation('home'); await drain('leave', 80); assert.equal(old?.parent, null);
      world.setLocation('accra-market-game'); expectedRoot = scene?.getObjectByName('recipe:accra-market-game'); assert.ok(expectedRoot && expectedRoot !== old);
      world.setAmbient((venueId, kind) => ({ cityId: 'accra', venueId, kind, tier: 'full', rainingAt: at => weatherAt(at, 'accra').raining, hourAt: at => lagosTime(at).minuteOfDay / 60 }));
      await drain('reentry', 400); retained('reentry');
      for (const frame of submitted) {
        assert.ok(frame.actual.draws <= 60 && frame.actual.triangles <= 87000, `submitted visible geometry ${JSON.stringify(frame.actual)}`);
        if (frame.entryDraws !== undefined) assert.ok(frame.entryDraws <= 57, 'recipe entry preserves the external three-draw allowance');
      }
      assert.deepEqual(errors, []);
      world.dispose(); world = undefined; await new Promise(resolve => setTimeout(resolve, 20)); scheduler.flush();
      await loadCityScenes('kano');
      world = createVenueWorld({ appendChild() {}, getBoundingClientRect: () => ({ width: 390, height: 844 }) } as unknown as HTMLElement, { location: 'kurmi-market', cityId: 'kano', renderer });
      await drain('authored-kano', 300); assert.ok(scene); assert.equal(scene.getObjectByName('recipe:kurmi-market'), undefined); assert.equal(world.diagnostics().runtime?.error, null);
    }

  } finally {
    world?.dispose(); scheduler.flush(); await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(scheduler.size(), 0, 'no callbacks after disposal');
    Object.defineProperty(globalThis, 'WebGL2RenderingContext', { configurable: true, writable: true, value: webgl }); scheduler.restore(); Date.now = realNow; console.error = realError;
  }
});
