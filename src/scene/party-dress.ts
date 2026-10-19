/**
 * OWNER: social (docs/FESTIVALS.md "Owambe parties")
 * THE OWAMBE IN THE 3D HOME (src/scene/home-scene.ts): while a party is on, a jollof table stands in the room (a cloth in the party
 * colour, a pot of rice, plates), and each spray sends naira notes flying up from the middle of the room, turning and settling. The notes
 * are a picture only: the home party's spray is a counted cheer and moves no money (src/festivals/party.ts). A handful of plain meshes
 * and one instanced mesh of thin cards: nothing is loaded, and the frame loop runs only while notes are in the air.
 */
import { NOTES, noteAt, noteBurst } from '../festivals/party.ts';
import type { Note } from '../festivals/party.ts';
import type * as THREE from 'three';
import type { Kit } from './kit.ts';

export interface PartyDressing { hex: string; sprays: number }
export interface PartyLayer {
  readonly group: THREE.Group
  /** Show (or take away) the party: where the table stands, in the home group's units. A rise in `sprays` sends notes flying. */
  set(party: PartyDressing | null, table: { x: number; z: number }, scale: number): boolean
  /** Send notes flying now. */
  burst(): void
  /** Advance the notes; true while any are still in the air. */
  step(dt: number): boolean
  readonly flying: boolean
  dispose(): void
}

export function createPartyLayer(kit: Kit): PartyLayer {
  const { THREE } = kit;
  const group = new THREE.Group();
  group.name = 'owambe';
  const table = new THREE.Group();
  table.name = 'owambe-jollof-table';
  group.add(table);
  let cloth: THREE.Mesh | null = null, shown: string | null = null, sprays = -1, at = { x: 0, z: 0 }, size = 1;
  const material = new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.DoubleSide });
  const notes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.004, 0.075), material, NOTES.count);
  notes.name = 'owambe-notes';
  notes.visible = false;
  notes.frustumCulled = false;
  group.add(notes);
  const colour = new THREE.Color(), matrix = new THREE.Matrix4(), quat = new THREE.Quaternion(), euler = new THREE.Euler(), pos = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  let flight: Note[] = [], time = 0, seed = 1;

  /** The table: legs, a top, a cloth in the party colour, a big pot of jollof and plates around it. */
  function buildTable(hex: string): void {
    for (const child of [...table.children]) table.remove(child);
    const k = size;
    for (const [dx, dz] of [[-0.42, -0.25], [0.42, -0.25], [-0.42, 0.25], [0.42, 0.25]] as const) kit.box(dx * k, 0.35 * k, dz * k, 0.06 * k, 0.7 * k, 0.06 * k, '#6b4a2f', table);
    kit.box(0, 0.72 * k, 0, 1.0 * k, 0.05 * k, 0.62 * k, '#7a5636', table);
    cloth = kit.box(0, 0.75 * k, 0, 1.06 * k, 0.02 * k, 0.68 * k, hex, table);
    kit.round(0, 0.86 * k, 0, 0.17 * k, 0.2 * k, '#3a3a3e', table);
    kit.round(0, 0.97 * k, 0, 0.15 * k, 0.03 * k, '#e0642b', table);
    for (const [dx, dz] of [[-0.34, -0.17], [0.34, -0.17], [-0.34, 0.17], [0.34, 0.17]] as const) { kit.round(dx * k, 0.78 * k, dz * k, 0.09 * k, 0.02 * k, '#f4f1ea', table); kit.round(dx * k, 0.8 * k, dz * k, 0.06 * k, 0.015 * k, '#e0642b', table); }
  }
  function burst(): void {
    flight = noteBurst(seed = (seed * 48271) % 2147483647);
    time = 0;
    for (let i = 0; i < flight.length; i++) notes.setColorAt(i, colour.set(flight[i]!.colour));
    if (notes.instanceColor) notes.instanceColor.needsUpdate = true;
    notes.count = flight.length;
    notes.visible = true;
    place();
  }
  function place(): void {
    for (let i = 0; i < flight.length; i++) {
      const p = noteAt(flight[i]!, time);
      if (!p) { matrix.makeScale(0, 0, 0); notes.setMatrixAt(i, matrix); continue; }
      euler.set(p.turn * 0.6, p.turn, p.turn * 0.3);
      matrix.compose(pos.set(at.x + p.x * size, p.y * size, at.z + p.z * size), quat.setFromEuler(euler), one.set(size, size, size));
      notes.setMatrixAt(i, matrix);
    }
    notes.instanceMatrix.needsUpdate = true;
  }
  return {
    group,
    set(party, where, scale) {
      const was = shown;
      size = scale; at = { x: where.x, z: where.z + 1.1 * scale };
      if (!party) { shown = null; sprays = -1; group.visible = false; flight = []; notes.visible = false; return was !== null; }
      group.visible = true;
      table.position.set(where.x, 0, where.z);
      if (shown !== party.hex || !cloth) { shown = party.hex; buildTable(party.hex); }
      const more = sprays >= 0 && party.sprays > sprays;
      sprays = party.sprays;
      if (more) burst();
      return was !== shown || more;
    },
    burst,
    step(dt) {
      if (!flight.length) return false;
      time += Math.max(0, Math.min(0.1, dt));
      if (time > NOTES.seconds + 0.4) { time = NOTES.seconds + 0.4; place(); flight = []; return false; }
      place();
      return true;
    },
    get flying() { return flight.length > 0; },
    dispose() { group.removeFromParent(); notes.geometry.dispose(); notes.dispose(); material.dispose(); },
  };
}
