/**
 * Campus "life" layer: lagoon water, waterfront promenade and the street furniture, trees, signs, kiosks,
 * parked vehicles, sports kit and seated students that make Akoka read as Akoka.
 *
 * Positions are a deterministic decorative plan derived from the pinned OSM roads, boundary and anchors
 * (not a surveyed inventory). Only props near the player are baked, in one batch (solid + glow), so the
 * resident cost is small and fixed: ~2 draw calls plus one static water mesh.
 */
import type { BufferGeometry, Group, InstancedMesh, Mesh } from 'three';
import type { Kit } from '../../scene/kit.ts';
import { createBatch, sceneMaterials } from '../../scene/build.ts';
import type { Batch } from '../../scene/types.ts';
import { signLetters } from '../shared/signs.ts';
import { CAMPUS_MAP } from './map.generated.ts';

import type { Prop, PropKind } from './life-plan.ts';
import { campusPlan, hash, shoreEdges, segs } from './life-plan.ts';
import { buildLagoon } from './lagoon.ts';
const RADIUS = 100, CAP_TRIS = 4200, LINE_TRIS = 900;

/* ---------- draw routines (local coordinates, +z forward) ---------- */
const CAR_COLOURS = ['#e8e8e4', '#2f3338', '#9aa3a8', '#a33a35', '#2f5f8a', '#d9d4c6', '#4a5a4c', '#c8c8c8'];
const SHIRTS = ['#f4f1e8', '#3f72c4', '#d6a83a', '#3f9a5a', '#c9423a', '#243a66', '#dd6fa0', '#ece2c6', '#8055c2', '#2f9d98'];
const SKINS = ['#8a5a3c', '#6e422c', '#573323', '#9a6341', '#40261b', '#b0764d'];
const UMBRELLAS = ['#f5c400', '#e3262f', '#2c9f3e', '#1c6fb8'];
const COST: Record<PropKind, number> = { palm: 200, flame: 150, almond: 150, lamp: 62, bench: 50, sign: 60, kiosk: 120, car: 90, keke: 110, bus: 150, goal: 70, hoop: 50, net: 60, student: 90, gen: 80, hedge: 40, bump: 30, zebra: 60, guard: 100, pier: 400, canoe: 40, board: 60, bin: 30,
  mango: 190, coconut: 190, frangi: 110, shuttle: 140, boat: 90, mast: 40, roadsign: 40, mapboard: 70, guardman: 70, shrub: 26, bed: 55, paving: 4, fountain: 170, terrace: 36, wall: 36, booth: 50, stall: 130 };
/** How far each kind is drawn: low understorey and flat decals vanish sooner than trees and landmarks. */
const REACH: Partial<Record<PropKind, number>> = { roadsign: 60, mast: 110, sign: 70, shrub: 85, bed: 95, frangi: 90, student: 70, bin: 50, board: 70, hedge: 80, bump: 70, canoe: 90 };

/** Foliage as clustered sub-blobs, two-tone: the lower blobs take the dark colour, the upper ones the light. */
function blobs(b: Batch, list: number[][], dark: string, light: string, far: boolean): void {
  const n = far ? Math.min(3, list.length) : list.length;
  for (let i = 0; i < n; i++) { const [x, y, z, r] = list[i]!; b.ico(x!, y!, z!, r!, r! * .72, r! * .95, y! > 5 ? light : dark); }
}
const TREES = new Set<PropKind>(['palm', 'coconut', 'mango', 'frangi', 'almond', 'flame']);
function draw(b: Batch, p: Prop, text: boolean, lit = false, far = false): void {
  const scale = TREES.has(p.t) ? .78 + hash(p.x * .37 + p.z * .91) * .52 : 1;
  b.at(p.x, 0, p.z, p.ry, () => {
    switch (p.t) {
      case 'palm': { // royal palm: tall pale ringed trunk, crownshaft, irregular drooping fronds (not a star)
        const h = 8 + p.v * 5, n = far ? 5 : 9;
        b.cyl(0, h / 2, 0, .26, h, '#a29a8a', { seg: 5, top: .72 });
        b.cyl(0, h + .35, 0, .3, .7, '#6a8a45', { seg: 5 });
        for (let i = 0; i < n; i++) {
          const yaw = i * 2.4 + p.v * 3, len = 1.35 + hash(i + p.v * 9) * .5, tilt = i % 3 === 0 ? .25 : i % 3 === 1 ? .6 : .95;
          b.at(0, h + .7, 0, yaw, () => b.ico(0, -.2 - tilt * .5, len * 1.1, .22, .07, len * 1.35, i % 2 ? '#4e7a3a' : '#5f8f45', { rx: tilt }));
        }
        break;
      }
      case 'coconut': { // leaning coconut palm with a curved trunk and drooping crown
        const lean = (p.v - .5) * .5;
        b.cyl(lean * .3, 1.4, 0, .22, 2.8, '#8a7a62', { seg: 5, top: .85 }); b.cyl(lean * .9, 4.2, 0, .18, 2.9, '#85755e', { seg: 5, top: .85, rz: -lean * .25 });
        const cx = lean * 1.4, n = far ? 4 : 7;
        for (let i = 0; i < n; i++) {
          const yaw = i * 2.4 + p.v * 4, tilt = .5 + (i % 3) * .35;
          b.at(cx, 5.7, 0, yaw, () => b.ico(0, -.3, 1.25, .2, .06, 1.5, i % 2 ? '#548a3e' : '#6a9a48', { rx: tilt }));
        }
        if (!far) b.ico(cx, 5.5, 0, .3, .22, .3, '#7a8f3a');
        break;
      }
      case 'mango': { // broad spreading mango: dome of clustered sub-blobs, dark below and lighter above
        b.cyl(0, 1.5, 0, .38, 3, '#5e4a38', { seg: 6, top: .65 }); b.cone(0, .35, 0, .75, .7, '#5e4a38', { seg: 6, top: .5 });
        blobs(b, [[0, 4.5, 0, 2.0], [-2.1, 4.0, .9, 1.6], [2.0, 4.1, -.8, 1.7], [-.5, 5.8, .4, 1.5], [1.2, 5.3, 1.7, 1.3], [-1.7, 4.7, -1.5, 1.4]], '#2f5a30', '#5f9150', far);
        break;
      }
      case 'frangi': { // frangipani: gnarled grey branches, sparse leaves, white and pink flowers
        b.cyl(0, .8, 0, .2, 1.7, '#8c8678', { seg: 4, top: .8 }); b.box(-.5, 2.0, 0, .12, 1.2, .12, '#8c8678', { rz: .5 }); b.box(.55, 2.1, .1, .12, 1.3, .12, '#8c8678', { rz: -.5 });
        b.ico(-1.0, 2.8, 0, 1.0, .55, 1.0, '#6f9a52'); b.ico(1.1, 2.9, .1, 1.0, .55, .95, '#7aa55a');
        if (!far) { b.ico(-.9, 3.25, .2, .45, .25, .45, p.v < .5 ? '#f6ece4' : '#eba2b4'); b.ico(1.0, 3.35, 0, .4, .22, .4, p.v < .5 ? '#eba2b4' : '#f6ece4'); }
        break;
      }
      case 'shrub': { // low understorey clump, some in flower
        const c = ['#4a7a42', '#3c6a3a', '#58864a', '#4a7a42'][Math.floor(p.v * 4) % 4]!;
        b.ico(0, .5, 0, .95, .62, .9, c); if (p.v > .45) b.ico(.55, .85, .2, .3, .22, .3, ['#c8405e', '#e8a030', '#f4efe2'][Math.floor(p.v * 7) % 3]!);
        break;
      }
      case 'bed': { // flowerbed: kerb, soil and bright rows
        const w = 3.4, d = 1.6, cols = ['#d94a3a', '#f0b429', '#e8708a', '#8e5bc2', '#f4efe2'];
        b.quad(0, .1, 0, w + .5, d + .5, '#bdb7a4', { rx: -Math.PI / 2 }); b.quad(0, .11, 0, w, d, '#5a4430', { rx: -Math.PI / 2 });
        for (let i = 0; i < 4; i++) b.box(-w / 2 + .6 + i * .75, .2 + hash(p.v + i * 2) * .15, (i % 2 - .5) * .5, .42, .3, .5, cols[Math.floor(hash(p.v + i) * 5)]!);
        break;
      }
      case 'paving': { // paved forecourt / plaza with a lighter border
        const w = p.w ?? 12, d = p.d ?? 8, tone = ['#cfc7b2', '#c4bcaa', '#d6cdb8', '#b9b3a4'][Math.floor(p.v) % 4]!;
        b.quad(0, .085, 0, w + .6, d + .6, '#a9a393', { rx: -Math.PI / 2 }); b.quad(0, .09, 0, w, d, tone, { rx: -Math.PI / 2 });
        break;
      }
      case 'fountain': {
        b.cyl(0, .3, 0, 2.7, .6, '#b6b1a3', { seg: 14 }); b.cyl(0, .62, 0, 2.3, .08, '#6fb5c9', { seg: 14 });
        b.cyl(0, 1.0, 0, .28, 1.4, '#a8a396', { seg: 6 }); b.cyl(0, 1.75, 0, .9, .2, '#b6b1a3', { seg: 10, top: .5 });
        b.cone(0, 2.5, 0, .22, 1.3, '#c6e6f0', { seg: 6 });
        break;
      }
      case 'terrace': { // stepped seating towards the lagoon
        const w = p.w ?? 24;
        b.box(0, .15, 0, w, .3, 3.2, '#c8c1b0'); b.box(0, .45, -.9, w, .3, 1.4, '#bfb8a6'); b.box(0, .75, -1.6, w, .3, .8, '#b6af9d');
        break;
      }
      case 'wall': { // boundary wall: plastered panel, capped, with a pier
        const w = p.w ?? 6;
        b.box(0, 1.1, 0, .3, 2.2, w, '#cfc8b4'); b.box(0, 2.28, 0, .45, .16, w, '#9a9488'); b.box(0, 1.25, w / 2, .55, 2.5, .5, '#c4bca6');
        break;
      }
      case 'booth': { // security booth with a lit window at night
        b.box(0, 1.3, 0, 2.4, 2.6, 2.4, ['#2f5f8a', '#e8e4d4'][p.v % 2]!); b.box(0, 2.7, 0, 3, .16, 3, '#5a5f60');
        b.box(0, 1.5, 1.22, 1.6, .9, .05, lit ? '#f5d78a' : '#27343b', lit ? { layer: 'glow' } : undefined);
        break;
      }
      case 'stall': { // hawker stall: table, produce and a bright umbrella
        const um = ['#f5c400', '#e3262f', '#2c9f3e', '#1c6fb8', '#e8708a'][p.v % 5]!;
        b.box(0, .75, 0, 2.6, .12, 1.4, '#8a6a45'); b.box(-1.1, .37, -.5, .1, .75, .1, '#4a3d2e'); b.box(1.1, .37, -.5, .1, .75, .1, '#4a3d2e'); b.box(-1.1, .37, .5, .1, .75, .1, '#4a3d2e'); b.box(1.1, .37, .5, .1, .75, .1, '#4a3d2e');
        for (let i = 0; i < 4; i++) b.box(-.9 + i * .6, .95, 0, .4, .25, .6, ['#e8a030', '#c93a2c', '#4f9a3a', '#f4efe2'][(i + p.v) % 4]!);
        b.cyl(0, 1.2, -.5, .04, 2.4, '#3a4042', { seg: 4 }); b.cone(0, 2.55, -.5, 1.9, .6, um, { seg: 8 });
        break;
      }
      case 'flame': { // flame-of-the-forest: wide flat crown of red-orange sub-blobs on a flared trunk
        b.cyl(0, 2, 0, .3, 4, '#6f5c46', { seg: 6, top: .65 }); b.cone(0, .35, 0, .62, .7, '#6f5c46', { seg: 6, top: .5 });
        blobs(b, [[0, 5.2, 0, 2.1], [-2.3, 4.7, .8, 1.6], [2.3, 4.9, -.7, 1.7], [.6, 5.8, 1.6, 1.4], [-.9, 5.5, -1.8, 1.5]], '#c9362a', '#ef6a30', far);
        break;
      }
      case 'almond': { // tropical almond: layered flat tiers of sub-blobs
        b.cyl(0, 2.3, 0, .3, 4.6, '#6a5a45', { seg: 6, top: .65 }); b.cone(0, .35, 0, .6, .7, '#6a5a45', { seg: 6, top: .5 });
        blobs(b, [[0, 4.6, 0, 1.9], [-2.1, 4.4, .6, 1.5], [2.0, 4.5, -.4, 1.5], [.4, 5.9, -.2, 1.5], [-.3, 5.3, 1.7, 1.3]], '#4a7a3a', '#74a14e', far);
        break;
      }
      case 'lamp': {
        b.cyl(0, 3.2, 0, .1, 6.4, '#4a5254', { seg: 4 });
        b.box(0, 6.35, .7, .14, .14, 1.5, '#4a5254');
        b.box(0, 6.22, 1.4, lit ? .5 : .32, .12, lit ? .7 : .5, lit ? '#fff0b0' : '#9a9a90', lit ? { layer: 'glow' } : undefined);
        if (lit) { b.quad(0, .13, 1.4, 9, 9, '#8f7436', { layer: 'glow', rx: -Math.PI / 2 }); b.quad(0, .14, 1.4, 5, 5, '#c9a24c', { layer: 'glow', rx: -Math.PI / 2 }); b.quad(0, .15, 1.4, 2.2, 2.2, '#f0cf7a', { layer: 'glow', rx: -Math.PI / 2 }); }
        break;
      }
      case 'bench': {
        b.box(0, .5, 0, 1.8, .1, .5, '#8a6a45'); b.box(0, .85, -.25, 1.8, .45, .08, '#8a6a45');
        b.box(-.8, .25, 0, .1, .5, .45, '#3a4042'); b.box(.8, .25, 0, .1, .5, .45, '#3a4042');
        break;
      }
      case 'sign': { // ground sign board: bold two-line lettering on the nearest boards, a plain painted board otherwise
        const hd = ['#1c5fa8', '#7a2430', '#1f3f6e'][p.v % 3]!, ft = ['#2d8a4a', '#d6a83a', '#2d8a4a'][p.v % 3]!;
        b.box(-2.4, 1.3, 0, .14, 2.6, .14, '#3a4042'); b.box(2.4, 1.3, 0, .14, 2.6, .14, '#3a4042');
        b.box(0, 2.0, 0, 5.2, 1.9, .1, p.v % 3 === 2 ? '#e8ecef' : '#f4f4ee'); b.box(0, 2.9, .06, 5.2, .22, .05, hd); b.box(0, 1.15, .06, 5.2, .18, .05, ft);
        if (text && p.label) {
          const words = p.label.toUpperCase().replace(/[^A-Z0-3 ]/g, '').split(' '), lines: string[] = [''];
          for (const w of words) { const last = lines.length - 1; if ((lines[last] + ' ' + w).trim().length <= 12) lines[last] = (lines[last] + ' ' + w).trim(); else lines.push(w); }
          lines.slice(0, 2).forEach((l, i) => signLetters(b, l, 0, 2.38 - i * .5, .08, 4.8, '#10294f'));
        }
        break;
      }
      case 'board': { // notice board with pinned papers
        b.box(-.8, .9, 0, .08, 1.8, .08, '#4a3d2e'); b.box(.8, .9, 0, .08, 1.8, .08, '#4a3d2e');
        b.box(0, 1.5, 0, 1.9, 1.1, .08, '#8a6a45'); b.box(0, 1.5, .05, 1.7, .9, .03, '#c9b48a');
        for (let i = 0; i < 5; i++) b.box(-.6 + i * .3, 1.55 + (i % 2) * .15 - .1, .08, .22, .3, .01, i % 2 ? '#f4f1e8' : '#7db6c5');
        break;
      }
      case 'shuttle': { // campus shuttle: white body, green livery (livery unsourced)
        b.box(0, 1.5, 0, 2.3, 2.2, 7, '#f1f4ef'); b.box(0, .95, 0, 2.32, .5, 7.02, '#1f7a46'); b.box(0, 1.95, 0, 2.32, .75, 6.2, '#27343b'); b.box(0, 2.65, 0, 2.0, .12, 6, '#d5dad4');
        for (const sx of [-1.05, 1.05]) for (const z of [-2.3, 2.3]) b.cyl(sx, .45, z, .45, .26, '#1c1f21', { seg: 7, rz: Math.PI / 2 });
        break;
      }
      case 'boat': { // moored lagoon boat: painted hull, cabin and a mooring post
        const hull = ['#2f5f8a', '#d8d4c4', '#a33a35'][p.v % 3]!;
        b.box(0, .35, 0, 1.9, .7, 7, hull); b.box(0, .5, 3.7, .9, .55, 1.2, hull, { rx: -.5 }); b.box(0, 1.2, -.8, 1.5, .9, 2.4, '#e8e8e2'); b.box(0, 1.7, -.8, 1.7, .12, 2.6, '#7a7f80');
        b.cyl(1.4, .6, 3.2, .06, 1.2, '#4a3d2e', { seg: 4 });
        break;
      }
      case 'mast': { // floodlight mast
        b.cyl(0, 6, 0, .14, 12, '#4a5254', { seg: 4 }); b.box(0, 12.1, .3, 1.8, .7, .3, lit ? '#fff4c8' : '#9a9a90', lit ? { layer: 'glow' } : undefined);
        break;
      }
      case 'roadsign': { // street-name blade (lettering only on the nearest)
        b.cyl(0, 1.5, 0, .05, 3, '#4a5254', { seg: 4 }); b.box(0, 3.0, 0, 2.6, .5, .06, '#1f6a4a');
        if (text && p.label) signLetters(b, p.label.toUpperCase().replace(/[^A-Z0-3 ]/g, '').slice(0, 14), 0, 3.12, .05, 2.5, '#f4f4ee');
        break;
      }
      case 'mapboard': { // campus map board at the gate
        b.box(-1.7, 1.2, 0, .1, 2.4, .1, '#3a4042'); b.box(1.7, 1.2, 0, .1, 2.4, .1, '#3a4042');
        b.box(0, 1.7, 0, 3.8, 2.2, .1, '#1f3f6e'); b.box(0, 1.5, .06, 3.4, 1.5, .03, '#e6e1cd');
        b.box(-.8, 1.4, .09, 1.2, .5, .02, '#9fb7a0'); b.box(.7, 1.7, .09, .9, .6, .02, '#c9a97a'); b.box(0, 1.1, .09, 3, .1, .02, '#f4f4ee'); b.box(1.0, 1.1, .1, .16, .16, .02, '#c9423a');
        if (text) signLetters(b, 'CAMPUS MAP', 0, 2.5, .07, 3.2, '#f4f4ee');
        break;
      }
      case 'guardman': { // gate guard: dark uniform and cap
        b.box(-.1, .4, 0, .15, .8, .18, '#1f2a24'); b.box(.1, .4, 0, .15, .8, .18, '#1f2a24'); b.box(0, 1.2, 0, .42, .55, .26, '#2d4a3a'); b.ball(0, 1.62, 0, .13, .14, .13, SKINS[p.v % 6]!); b.box(0, 1.76, .02, .3, .08, .3, '#1f2a24');
        break;
      }
      case 'bin': b.cyl(0, .45, 0, .3, .9, ['#2d8a4a', '#1c5fa8'][p.v % 2]!, { seg: 7 }); break;
      case 'kiosk': { // buka / provision kiosk with recharge-card umbrella
        b.box(0, 1.1, 0, 2.6, 2.2, 2, '#c9a97a'); b.box(0, 2.3, .1, 3, .12, 2.5, '#8c8f90', { rx: .12 });
        b.box(0, 1.3, 1.02, 1.8, .9, .05, lit ? '#f5d78a' : '#2b2f31', lit ? { layer: 'glow' } : undefined); b.box(0, .85, 1.1, 2.4, .1, .5, '#7a6144');
        b.box(0, 2.0, 1.05, 2.6, .35, .06, UMBRELLAS[p.v % 4]!);
        b.cyl(2.6, 1.1, 1.4, .04, 2.2, '#3a4042', { seg: 4 }); b.cone(2.6, 2.3, 1.4, 1.35, .5, UMBRELLAS[(p.v + 1) % 4]!, { seg: 8 });
        break;
      }
      case 'car': {
        const c = CAR_COLOURS[p.v % 8]!;
        b.box(0, .62, 0, 1.75, .6, 4.2, c); b.box(0, 1.15, -.1, 1.55, .5, 2.2, c); b.box(0, 1.17, -.1, 1.58, .36, 2.0, '#27343b');
        for (const sx of [-.85, .85]) for (const z of [-1.35, 1.35]) b.cyl(sx, .32, z, .32, .22, '#1c1f21', { seg: 6, rz: Math.PI / 2 });
        break;
      }
      case 'keke': { // Lagos tricycle: yellow body, black roof
        b.box(0, .85, 0, 1.3, .9, 2.2, '#f2c418'); b.box(0, 1.65, -.3, 1.4, .08, 1.7, '#202224');
        b.box(-.6, 1.25, -.3, .06, .8, .06, '#202224'); b.box(.6, 1.25, -.3, .06, .8, .06, '#202224');
        b.box(0, .55, 1.2, .3, .5, .5, '#f2c418'); b.cyl(0, .25, 1.4, .25, .2, '#1c1f21', { seg: 6, rz: Math.PI / 2 });
        for (const sx of [-.6, .6]) b.cyl(sx, .25, -.7, .25, .2, '#1c1f21', { seg: 6, rz: Math.PI / 2 });
        break;
      }
      case 'bus': { // danfo-style minibus: yellow with black band
        b.box(0, 1.35, 0, 2.1, 1.7, 6, '#f2c418'); b.box(0, 1.0, 0, 2.12, .3, 6.02, '#202224'); b.box(0, 1.95, 0, 2.12, .55, 5, '#27343b');
        for (const sx of [-1, 1]) for (const z of [-2, 2]) b.cyl(sx, .45, z, .45, .26, '#1c1f21', { seg: 7, rz: Math.PI / 2 });
        break;
      }
      case 'goal': { // posts, crossbar and a net
        b.box(-3.6, 1.2, 0, .12, 2.4, .12, '#f0f0ea'); b.box(3.6, 1.2, 0, .12, 2.4, .12, '#f0f0ea'); b.box(0, 2.4, 0, 7.3, .12, .12, '#f0f0ea');
        b.box(0, 1.2, -1.2, 7.2, 2.4, .04, '#d8dad4'); b.box(-3.6, 1.2, -.6, .04, 2.4, 1.2, '#d8dad4'); b.box(3.6, 1.2, -.6, .04, 2.4, 1.2, '#d8dad4');
        break;
      }
      case 'hoop': b.cyl(0, 1.6, -.4, .08, 3.2, '#3a4042', { seg: 4 }); b.box(0, 3.1, 0, 1.8, 1.1, .08, '#f4f4ee'); b.cyl(0, 2.7, .35, .25, .05, '#e0522a', { seg: 8 }); break;
      case 'net': { const w = p.w ?? 10; b.box(-w / 2, .55, 0, .08, 1.1, .08, '#3a4042'); b.box(w / 2, .55, 0, .08, 1.1, .08, '#3a4042'); b.box(0, .8, 0, w, .8, .03, '#d8dad4'); break; }
      case 'student': { // seated or standing student with a bag
        const h = hash(p.v * 3.3), shirt = SHIRTS[Math.floor(h * 10)]!, skin = SKINS[Math.floor(hash(p.v * 1.7) * 6)]!, bottoms = ['#243a66', '#3a4042', '#5a4632', '#2f4f7a'][Math.floor(hash(p.v) * 4)]!;
        b.box(-.1, .4, 0, .15, .8, .18, bottoms); b.box(.1, .4, 0, .15, .8, .18, bottoms); b.box(0, .9, 0, .38, .2, .26, bottoms); b.box(0, 1.2, 0, .42, .5, .26, shirt);
        b.ball(0, 1.62, 0, .13, .14, .13, skin);
        b.box(0, 1.2, -.22, .3, .38, .16, ['#243a66', '#c9423a', '#3a4042', '#d6a83a'][Math.floor(hash(p.v * 5) * 4)]!);
        break;
      }
      case 'gen': { // generator house: block shed, louvres, exhaust
        b.box(0, 1.2, 0, 3.4, 2.4, 2.4, '#bdb49e'); b.box(0, 2.45, 0, 3.6, .15, 2.6, '#6f7576');
        for (let i = 0; i < 5; i++) b.box(0, .8 + i * .28, 1.22, 2, .08, .06, '#3a4042');
        b.box(0, .15, 1.25, 3.4, .3, .1, '#e3b02a'); b.cyl(1.4, 3.2, -.6, .1, 1.5, '#2b2f31', { seg: 5 });
        break;
      }
      case 'hedge': { // plain, bougainvillea or hibiscus hedge
        const w = p.w ?? 4;
        b.box(0, .4, 0, w, .8, .8, '#355d34');
        if (p.v === 1) for (let i = 0; i < Math.max(2, Math.floor(w / 1.6)); i++) b.ico(-w / 2 + .8 + i * 1.6, .85 + (i % 2) * .12, 0, .85, .38, .5, i % 2 ? '#c2307a' : '#e8467f');
        else if (p.v === 2) for (let i = 0; i < Math.floor(w / 1.2); i++) b.ico(-w / 2 + .7 + i * 1.2, .85, .2, .22, .18, .22, '#d8302e');
        break;
      }
      case 'bump': { const w = p.w ?? 8; for (let i = 0; i < 6; i++) b.quad(0, .105, -1 + i * .4, w, .38, i % 2 ? '#e8c820' : '#222527', { rx: -Math.PI / 2 }); break; }
      case 'zebra': { const w = p.w ?? 8; for (let i = 0; i < 10; i++) b.quad(-w / 2 + .5 + i * (w - 1) / 9, .106, 0, .55, 3.2, '#ece9da', { rx: -Math.PI / 2, ry: Math.PI / 2 }); break; }
      case 'guard': { // gate house
        b.box(0, 1.4, 0, 3.2, 2.8, 2.6, '#d6bd86'); b.box(0, 2.9, 0, 3.8, .2, 3.2, '#87443f'); b.box(0, 1.5, 1.32, 1.6, 1.0, .05, lit ? '#f5d78a' : '#27343b', lit ? { layer: 'glow' } : undefined);
        break;
      }
      case 'pier': { // timber jetty
        b.box(0, .35, 8, 2.8, .18, 16, '#8a6a45');
        for (let i = 0; i <= 5; i++) for (const s of [-1.3, 1.3]) b.cyl(s, .1, i * 3.2 - .2, .1, 1.1, '#4a3d2e', { seg: 5 });
        break;
      }
      case 'canoe': { // wooden fishing canoe, fisherman standing
        b.box(0, .1, 0, .9, .35, 5.2, ['#5a4632', '#6f5a40', '#3f5a6a'][p.v % 3]!); b.box(0, .15, 2.7, .35, .3, .7, '#5a4632', { rx: -.4 }); b.box(0, .15, -2.7, .35, .3, .7, '#5a4632', { rx: .4 });
        b.box(0, .6, -.4, .32, .6, .22, SHIRTS[(p.v * 3) % 10]!); b.ball(0, 1.05, -.4, .12, .13, .12, SKINS[p.v % 6]!); b.box(.5, 1.0, -.4, .05, 1.8, .05, '#4a3d2e', { rz: -.3 });
        break;
      }
    }
  }, 0, 0, scale);
}

/* ---------- builder ---------- */
export function createCampusLife(kit: Kit) {
  const { THREE } = kit;
  const group = new THREE.Group(); group.name = 'UNILAG street life';
  const materials = sceneMaterials(kit);
  const plan = campusPlan();
  const edges = shoreEdges();
  const live = new THREE.Group(); live.name = 'Near street life'; group.add(live);
  let disposed = false;
  let key = '', rebuilds = 0, lit = false;

  // Static lagoon: banded water + foam along the shore. One merged vertex-coloured mesh.
  // Built after the first frame (idle callback) so entering the campus is not held up by ~100 ms of shoreline maths.
  const buildWater = () => buildLagoon(kit);
  let waterTimer: number | ReturnType<typeof setTimeout> | undefined;
  const idle = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  const addWater = () => { waterTimer = undefined; if (!disposed) group.add(buildWater()); };
  waterTimer = idle ? idle(addWater, { timeout: 1500 }) : setTimeout(addWater, 0);


  // Lagoon sparkle: instanced glints that drift and twinkle by the wall clock. They are positioned when the scene updates its
  // matrices (during a draw), so nothing runs while the scene is idle (src/scene/motion-loop.ts battery rule).
  // Third Mainland Bridge: a hazy stylised silhouette far across the lagoon (bearing north-east/east of the Lagoon Front per the
  // reference notes; length, height and exact distance are estimates), shown only near the waterfront.
  const pier = plan.find(q => q.t === 'pier');
  const SPARKLES = 64;
  let sparkles: InstancedMesh | null = null, bridge: Group | null = null;
  const sparkleSeed = Array.from({ length: SPARKLES }, (_, i) => ({ f: 10 + hash(i * 1.7) * 190, u: (hash(i * 2.9) - .5) * 320, sz: .5 + hash(i * 4.3) * .9, a: .6 + hash(i * 5.1) * 1.4, ph: hash(i * 6.3) * 6.28, dr: hash(i * 7.7) * 6.28 }));
  if (pier) {
    const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2);
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(Array.from({ length: 4 }, () => [.8, .93, .96]).flat()), 3));
    sparkles = new THREE.InstancedMesh(g, materials.glow, SPARKLES); sparkles.name = 'Lagoon glints'; sparkles.frustumCulled = false; sparkles.visible = false; group.add(sparkles);
    const bb = createBatch(THREE), dirx = .6, dirz = -.8, bx = pier.x + 1300, bz = pier.z - 260, L = 1900;
    bb.at(bx, 0, bz, Math.atan2(dirx, dirz), () => {
      bb.box(0, 15, 0, 14, 2.4, L, '#8a9aa0'); bb.box(0, 16.4, 0, 14.4, .5, L, '#9aa8ad');
      for (let i = -8; i <= 8; i++) bb.box(0, 7, i * 110, 5, 14, 6, '#7d8e94');
    });
    bridge = new THREE.Group(); bridge.name = 'Third Mainland Bridge (stylised)'; bridge.visible = false;
    for (const m of bb.build(materials).meshes) { m.castShadow = false; m.receiveShadow = false; bridge.add(m); }
    group.add(bridge);
    const base = group.updateMatrixWorld.bind(group), matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), sc = new THREE.Vector3();
    const fx = Math.sin(pier.ry), fz = Math.cos(pier.ry), ux = Math.cos(pier.ry), uz = -Math.sin(pier.ry);
    group.updateMatrixWorld = (force?: boolean) => {
      if (sparkles && sparkles.visible && !disposed) {
        const t = performance.now() / 1000;
        for (let i = 0; i < SPARKLES; i++) {
          const k = sparkleSeed[i]!, tw = Math.max(0, Math.sin(t * k.a + k.ph)), size = k.sz * tw * tw * 1.3 + .02;
          pos.set(pier.x + fx * k.f + ux * k.u + Math.sin(t * .3 + k.dr) * 1.5, -.22, pier.z + fz * k.f + uz * k.u + Math.cos(t * .27 + k.dr) * 1.5);
          sc.set(size * 2.2, 1, size * .7); matrix.compose(pos, q, sc); sparkles.setMatrixAt(i, matrix);
        }
        sparkles.instanceMatrix.needsUpdate = true;
      }
      base(force);
    };
  }

  function rebuild(px: number, pz: number) {
    live.traverse(o => { const m = o as Mesh; if (m.isMesh) m.geometry.dispose(); });
    live.clear();
    const batch = createBatch(THREE);
    const near = plan.map(p => ({ p, d: Math.hypot(p.x - px, p.z - pz) })).filter(i => i.d < RADIUS).sort((a, b) => a.d - b.d);
    let budget = CAP_TRIS, signText = 2, roadText = 1;
    for (const { p, d } of near) {
      if (d > (REACH[p.t] ?? RADIUS)) continue;
      const far = d > 45 && (p.t === 'palm' || p.t === 'coconut' || p.t === 'mango' || p.t === 'frangi');
      if (p.t === 'sign' && d > 50) continue;
      const wantsText = (p.t === 'sign' && signText > 0 && d < 45) || (p.t === 'mapboard' && d < 40) || (p.t === 'roadsign' && roadText > 0 && d < 30);
      const cost = (far ? COST[p.t] * .55 : COST[p.t]) + (wantsText ? (p.t === 'roadsign' ? 450 : p.t === 'mapboard' ? 150 : 650) : 0);
      if (cost > budget) continue;
      const text = wantsText;
      if (text && p.t === 'sign') signText--; else if (text && p.t === 'roadsign') roadText--;
      draw(batch, p, text, lit, far); budget -= cost;
    }
    // waterfront promenade: seawall kerb, paved strip and bollards on shore edges near the player
    let lineBudget = LINE_TRIS;
    for (const e of edges) {
      const mx = (e.ax + e.bx) / 2, mz = (e.az + e.bz) / 2;
      if (Math.hypot(mx - px, mz - pz) > RADIUS + e.len / 2 || lineBudget < 40) continue;
      const ry = Math.atan2(e.bx - e.ax, e.bz - e.az);
      batch.at(mx - e.nx * 1.0, 0, mz - e.nz * 1.0, ry, () => {
        batch.box(0, .22, 0, .9, .55, e.len + .2, '#aeb0a8');
      });
      batch.at(mx - e.nx * 3.2, .055, mz - e.nz * 3.2, ry, () => batch.quad(0, 0, 0, 3.4, e.len, '#d4ccb4', { rx: -Math.PI / 2 }));
      lineBudget -= 18;
      for (let d = 0; d < e.len; d += 6) {
        const ux = (e.bx - e.ax) / e.len, uz = (e.bz - e.az) / e.len;
        batch.box(e.ax + ux * d - e.nx * 1.0, .75, e.az + uz * d - e.nz * 1.0, .14, .4, .14, d % 12 < 6 ? '#e8e4d4' : '#2b2f31'); lineBudget -= 12;
      }
    }
    // road edge marking and kerb paint on the nearest through-road segments
    for (const s of segs) {
      if (lineBudget < 16 || s.w < 7 || (s.hw !== 'secondary' && s.hw !== 'tertiary')) continue;
      const mx = (s.a[0] + s.b[0]) / 2, mz = (s.a[1] + s.b[1]) / 2, len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
      if (len < .5 || Math.hypot(mx - px, mz - pz) > 85 + len / 2) continue;
      const ry = Math.atan2(s.b[0] - s.a[0], s.b[1] - s.a[1]), ux = (s.b[0] - s.a[0]) / len, uz = (s.b[1] - s.a[1]) / len;
      for (const side of [-1, 1]) {
        const off = side * (s.w / 2 - .22);
        batch.at(mx - uz * off, .108, mz + ux * off, ry, () => batch.quad(0, 0, 0, .14, len, '#ece9da', { rx: -Math.PI / 2 }));
        const koff = side * (s.w / 2 + .45);
        for (let d = 0; d < len - 1; d += 2.4) {
          if (lineBudget < 16) break;
          const t = d + 1.2;
          batch.at(s.a[0] + ux * t - uz * koff, .045, s.a[1] + uz * t + ux * koff, ry, () => batch.quad(0, 0, 0, .9, 1.2, Math.floor(d / 2.4) % 2 ? '#1f2224' : '#ece9da', { rx: -Math.PI / 2 }));
          lineBudget -= 2;
        }
        lineBudget -= 2;
      }
    }
    for (const mesh of batch.build(materials).meshes) { mesh.receiveShadow = true; live.add(mesh); }
    rebuilds++;
  }

  function update(x: number, z: number, time = 'day') {
    const cell = `${Math.round(x / 30)}:${Math.round(z / 30)}:${time !== 'day'}`;
    if (cell === key) return;
    key = cell; lit = time !== 'day'; rebuild(x, z);
    if (pier) { const dist = Math.hypot(x - pier.x, z - pier.z); if (sparkles) sparkles.visible = dist < 330; if (bridge) bridge.visible = dist < 900; }
  }
  return {
    group, update, get rebuilds() { return rebuilds; },
    dispose() {
      if (disposed) return; disposed = true;
      if (waterTimer !== undefined) { const cancel = (globalThis as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback; if (idle && cancel) cancel(waterTimer as number); else clearTimeout(waterTimer as ReturnType<typeof setTimeout>); }
      group.traverse(o => { const m = o as Mesh; if (m.isMesh) m.geometry.dispose(); });
      group.removeFromParent(); group.clear();
    },
  } satisfies { group: Group; update(x: number, z: number, time?: string): void; rebuilds: number; dispose(): void };
}

/** One merged low-poly student (about 100 triangles, one draw call) for ambient walkers. */
export function studentMesh(kit: Kit, seed: number) {
  const batch = createBatch(kit.THREE);
  draw(batch, { t: 'student', x: 0, z: 0, ry: 0, v: seed }, false);
  const mesh = batch.build(sceneMaterials(kit)).meshes[0]!;
  mesh.name = 'ambient student'; mesh.castShadow = true;
  return mesh;
}
