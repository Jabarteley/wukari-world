// OWNER: social - the owambe in the 3D home (src/scene/party-dress.ts through home-scene.ts setParty): a jollof table while a party is
// on, notes flying on each new spray (the frame loop only while they fly), everyone re-dressed in the party colour, all gone at the end.
import { loadCityScenes } from './city-scenes.ts';
await loadCityScenes('lagos');
import './body/native-test-fixture.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createLife } from '../life.ts';
import { loadCityContent } from '../game/cities/registry.ts';
import { buildHomeScene } from './home-scene.ts';
import { createKit } from './kit.ts';
import { createPartyLayer } from './party-dress.ts';

await loadCityContent('lagos');
const life = () => createLife({ location: 'home', home: { custom: true, items: [] } }, { cityId: 'lagos', now: Date.UTC(2026, 0, 5, 12) });
const named = (root: THREE.Object3D, name: string): THREE.Object3D | null => { let found: THREE.Object3D | null = null; root.traverse((o) => { if (o.name === name) found = o; }); return found; };

test('the party layer: a table in the party colour, notes only on a new spray, landing after the flight', () => {
  const kit = createKit(), layer = createPartyLayer(kit);
  try {
    assert.equal(layer.set({ hex: '#d9a21b', sprays: 3 }, { x: 1, z: 1 }, 1), true, 'the table appears');
    assert.equal(layer.flying, false, 'sprays already counted before the party was seen send nothing');
    const table = named(layer.group, 'owambe-jollof-table')!;
    let gold = false;
    table.traverse((o) => { if (o instanceof THREE.Mesh && '#' + (o.material as THREE.MeshLambertMaterial).color.getHexString() === '#d9a21b') gold = true; });
    assert.ok(gold, 'the cloth is the party colour');
    assert.equal(layer.set({ hex: '#d9a21b', sprays: 4 }, { x: 1, z: 1 }, 1), true, 'a new spray');
    assert.equal(layer.flying, true);
    let frames = 0;
    while (layer.step(1 / 30)) frames++;
    assert.ok(frames > 30 && frames < 200, `${frames} frames of flight, then the loop may stop`);
    assert.equal(layer.flying, false);
    assert.equal(layer.set(null, { x: 0, z: 0 }, 1), true, 'the party ends');
    assert.equal(layer.group.visible, false);
  } finally { layer.dispose(); kit.dispose(); }
});

test('the home scene: setParty shows the table, dresses the guests, flies notes through the crowd loop, and ends cleanly', () => {
  const kit = createKit(), home = buildHomeScene(kit), state = life();
  try {
    home.update(state);
    home.setCrowd([{ id: 'guest-1', name: 'Bola', kind: 'player' }]);
    const before = named(home.group, 'canonical-crowd');
    assert.equal(home.setParty({ hex: '#7b3fa0', sprays: 0 }), true);
    const dressed = named(home.group, 'canonical-crowd');
    assert.ok(before && dressed && dressed !== before, 'the guests are drawn again, in the aso-ebi');
    const layer = named(home.group, 'owambe')!;
    assert.ok(layer && layer.visible, 'the owambe layer is in the home');
    assert.equal(home.easing, false, 'nothing moves until somebody sprays');
    home.setParty({ hex: '#7b3fa0', sprays: 1 });
    assert.equal(home.easing, true, 'notes in the air keep the frame loop going');
    for (let i = 0; i < 300 && home.easing; i++) home.stepCrowd(1 / 30);
    assert.equal(home.easing, false, 'and then it rests');
    home.setParty({ hex: '#7b3fa0', sprays: 2 });
    home.settleCrowd();
    assert.equal(home.easing, false, 'reduced motion: the notes land at once');
    assert.equal(home.setParty(null), true);
    assert.equal(layer.visible, false);
    assert.equal(home.setParty(null), false, 'no party, no change');
  } finally { home.dispose(); kit.dispose(); }
});
