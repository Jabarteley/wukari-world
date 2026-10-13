/**
 * Campus "life" layer: lagoon water, waterfront promenade and the street furniture, trees, signs, kiosks,
 * parked vehicles, sports kit and seated students that make Akoka read as Akoka.
 *
 * Positions are a deterministic decorative plan derived from the pinned OSM roads, boundary and anchors
 * (not a surveyed inventory). Only props near the player are baked, in one batch (solid + glow), so the
 * resident cost is small and fixed: ~2 draw calls plus one static water mesh.
 */
import type { BufferGeometry, Group, Mesh } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Kit } from '../../scene/kit.ts';
import { createBatch, sceneMaterials } from '../../scene/build.ts';
import type { Batch } from '../../scene/types.ts';
import { signLetters } from '../shared/signs.ts';
import { pointInRing } from './geo.ts';
import { CAMPUS_MAP } from './map.generated.ts';

import type { Prop, PropKind } from './life-plan.ts';
import { campusPlan, hash, shoreEdges, segs } from './life-plan.ts';
const RADIUS = 100, CAP_TRIS = 3300, LINE_TRIS = 900;

/* ---------- draw routines (local coordinates, +z forward) ---------- */
const CAR_COLOURS = ['#e8e8e4', '#2f3338', '#9aa3a8', '#a33a35', '#2f5f8a', '#d9d4c6', '#4a5a4c', '#c8c8c8'];
const SHIRTS = ['#f4f1e8', '#3f72c4', '#d6a83a', '#3f9a5a', '#c9423a', '#243a66', '#dd6fa0', '#ece2c6', '#8055c2', '#2f9d98'];
const SKINS = ['#8a5a3c', '#6e422c', '#573323', '#9a6341', '#40261b', '#b0764d'];
const UMBRELLAS = ['#f5c400', '#e3262f', '#2c9f3e', '#1c6fb8'];
const COST: Record<PropKind, number> = { palm: 130, flame: 110, almond: 90, lamp: 50, bench: 50, sign: 60, kiosk: 120, car: 90, keke: 110, bus: 150, goal: 70, hoop: 50, net: 60, student: 70, gen: 80, hedge: 24, bump: 30, zebra: 60, guard: 100, pier: 400, canoe: 40, board: 60, bin: 30, };

function draw(b: Batch, p: Prop, text: boolean, lit = false): void {
  b.at(p.x, 0, p.z, p.ry, () => {
    switch (p.t) {
      case 'palm': { // royal-palm look: tall pale trunk, drooping crown
        const h = 8 + p.v * 5;
        b.cyl(0, h / 2, 0, .26, h, '#9b9283', { seg: 5, top: .75 });
        b.cyl(0, h + .1, 0, .38, .35, '#5f7d3c', { seg: 5 });
        for (let i = 0; i < 7; i++) b.at(0, h + .3, 0, i * 0.9, () => b.box(0, -.35, 1.8, .22, .1, 3.6, i % 2 ? '#4e7a3a' : '#5d8a43', { rx: .55 }));
        break;
      }
      case 'flame': { // flame-of-the-forest: spreading red-orange canopy
        b.cyl(0, 2, 0, .3, 4, '#6f5c46', { seg: 5, top: .7 });
        b.ico(0, 5.4, 0, 4.4, 2.1, 4.2, '#d8442b'); b.ico(-2.4, 4.8, 1, 2.8, 1.7, 2.8, '#e65a2e'); b.ico(2.5, 5, -1, 2.6, 1.6, 2.7, '#c93a2c');
        break;
      }
      case 'almond': { // umbrella tiers of the tropical almond
        b.cyl(0, 2.3, 0, .3, 4.6, '#6a5a45', { seg: 5, top: .7 });
        b.ico(0, 4.9, 0, 3.8, 1.0, 3.8, '#5a8442'); b.ico(.4, 6.1, -.2, 2.6, .8, 2.6, '#6a9650');
        break;
      }
      case 'lamp': {
        b.cyl(0, 3.2, 0, .1, 6.4, '#4a5254', { seg: 4 });
        b.box(0, 6.35, .7, .14, .14, 1.5, '#4a5254');
        b.box(0, 6.22, 1.4, lit ? .5 : .32, .12, lit ? .7 : .5, lit ? '#fff0b0' : '#9a9a90', lit ? { layer: 'glow' } : undefined);
        if (lit) { b.quad(0, .13, 1.4, 7, 7, '#5f5a3a', { layer: 'glow', rx: -Math.PI / 2 }); b.quad(0, .14, 1.4, 3.4, 3.4, '#8a8350', { layer: 'glow', rx: -Math.PI / 2 }); }
        break;
      }
      case 'bench': {
        b.box(0, .5, 0, 1.8, .1, .5, '#8a6a45'); b.box(0, .85, -.25, 1.8, .45, .08, '#8a6a45');
        b.box(-.8, .25, 0, .1, .5, .45, '#3a4042'); b.box(.8, .25, 0, .1, .5, .45, '#3a4042');
        break;
      }
      case 'sign': { // white board, blue header band, green foot band, two posts
        b.box(-1.9, 1.3, 0, .12, 2.6, .12, '#3a4042'); b.box(1.9, 1.3, 0, .12, 2.6, .12, '#3a4042');
        b.box(0, 2.1, 0, 4.1, 1.5, .1, '#f4f4ee'); b.box(0, 2.72, .06, 4.1, .26, .05, '#1c5fa8'); b.box(0, 1.5, .06, 4.1, .2, .05, '#2d8a4a');
        if (text && p.label) {
          const words = p.label.toUpperCase().replace(/[^A-Z0-3 ]/g, '').split(' '), lines: string[] = [''];
          for (const w of words) { const last = lines.length - 1; if ((lines[last] + ' ' + w).trim().length <= 16) lines[last] = (lines[last] + ' ' + w).trim(); else lines.push(w); }
          lines.slice(0, 2).forEach((l, i) => signLetters(b, l, 0, 2.28 - i * .34, .08, 3.8, '#1c3f78'));
        } else { b.box(0, 2.22, .06, 3.2, .16, .04, '#1c3f78'); b.box(0, 1.92, .06, 2.2, .14, .04, '#1c3f78'); }
        break;
      }
      case 'board': { // notice board with pinned papers
        b.box(-.8, .9, 0, .08, 1.8, .08, '#4a3d2e'); b.box(.8, .9, 0, .08, 1.8, .08, '#4a3d2e');
        b.box(0, 1.5, 0, 1.9, 1.1, .08, '#8a6a45'); b.box(0, 1.5, .05, 1.7, .9, .03, '#c9b48a');
        for (let i = 0; i < 5; i++) b.box(-.6 + i * .3, 1.55 + (i % 2) * .15 - .1, .08, .22, .3, .01, i % 2 ? '#f4f1e8' : '#7db6c5');
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
      case 'hedge': b.box(0, .4, 0, p.w ?? 4, .8, .8, '#355d34'); break;
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
  });
}

/* ---------- builder ---------- */
export function createCampusLife(kit: Kit) {
  const { THREE } = kit;
  const group = new THREE.Group(); group.name = 'UNILAG street life';
  const materials = sceneMaterials(kit);
  const plan = campusPlan();
  const edges = shoreEdges();
  const live = new THREE.Group(); live.name = 'Near street life'; group.add(live);
  let key = '', rebuilds = 0, lit = false;

  // Static lagoon: banded water + foam along the shore. One merged vertex-coloured mesh.
  const water = (() => {
    const geos: BufferGeometry[] = [];
    const colour = (g: BufferGeometry, hex: string) => {
      const c = new THREE.Color(hex), a = new Float32Array(g.attributes.position!.count * 3);
      for (let i = 0; i < a.length; i += 3) { a[i] = c.r; a[i + 1] = c.g; a[i + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g;
    };
    const [x0, z0, x1, z1] = CAMPUS_MAP.bounds;
    // Off-campus ground: dry Akoka/Yaba earth. Water is only drawn seaward of the shore edges.
    const base = new THREE.PlaneGeometry(9000, 9000); base.rotateX(-Math.PI / 2); base.translate((x0 + x1) / 2, -.7, (z0 + z1) / 2);
    geos.push(colour(base.toNonIndexed(), '#a3a68a'));
    const poly = (pts: number[][], y: number, hex: string) => {
      const g = new THREE.BufferGeometry(), v = pts.flatMap(([x, z]) => [x!, y, z!]);
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(v), 3));
      g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(pts.flatMap(() => [0, 1, 0])), 3));
      const crossY = (v[5]! - v[2]!) * (v[6]! - v[0]!) - (v[3]! - v[0]!) * (v[8]! - v[2]!);
      const up = crossY > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
      g.setIndex(pts.length === 3 ? up.slice(0, 3) : up);
      const ni = g.toNonIndexed(); g.dispose(); geos.push(colour(ni, hex));
    };
    // each shore edge gets deep water, mid-water, shallows and foam strips out from the edge
    const FAR = 2600;
    // Water only runs seaward until the ray meets campus land again (bays and inlets must not flood the far side).
    const reach = new Map<object, number>();
    for (const e of edges) {
      const mx = (e.ax + e.bx) / 2, mz = (e.az + e.bz) / 2;
      let r = FAR;
      for (let d = 12; d < FAR; d += 12) if (pointInRing([mx + e.nx * d, mz + e.nz * d], CAMPUS_MAP.boundary)) { r = Math.max(14, d - 14); break; }
      reach.set(e, r);
    }
    const bands: Array<[number, number, number, string]> = [[110, FAR, -.6, '#4f8896'], [28, 110, -.5, '#5f9ba5'], [2.2, 28, -.38, '#7db3ae'], [-.5, 2.2, -.2, '#e3eee4']];
    for (const e of edges) {
      const ux = (e.bx - e.ax) / e.len, uz = (e.bz - e.az) / e.len;
      const R = reach.get(e)!;
      for (const [d0, d1raw, y, hex] of bands) { const d1 = Math.min(d1raw, R); if (d1 <= d0 + .3) continue; poly([
        [e.ax + e.nx * d0 - ux * 2, e.az + e.nz * d0 - uz * 2], [e.bx + e.nx * d0 + ux * 2, e.bz + e.nz * d0 + uz * 2],
        [e.bx + e.nx * d1 + ux * 2, e.bz + e.nz * d1 + uz * 2], [e.ax + e.nx * d1 - ux * 2, e.az + e.nz * d1 - uz * 2]], y, hex); }
    }
    // corner wedges so far water has no land-coloured gaps between neighbouring shore edges
    for (let i = 1; i < edges.length; i++) {
      const p = edges[i - 1]!, q = edges[i]!;
      if (Math.hypot(p.bx - q.ax, p.bz - q.az) > 1) continue;
      const R = Math.min(reach.get(p)!, reach.get(q)!);
      if (R > 111) poly([[q.ax, q.az], [q.ax + p.nx * R, q.az + p.nz * R], [q.ax + q.nx * R, q.az + q.nz * R]], -.6, '#4f8896');
    }
    const merged = mergeGeometries(geos.map(g => { g.deleteAttribute('uv'); return g; }), false)!;
    geos.forEach(g => g.dispose());
    const mesh = new THREE.Mesh(merged, materials.solid); mesh.name = 'Lagos Lagoon'; mesh.receiveShadow = true;
    // The plane normal must face up for lighting; strip normals are recomputed from winding above.
    return mesh;
  })();
  group.add(water);

  function rebuild(px: number, pz: number) {
    live.traverse(o => { const m = o as Mesh; if (m.isMesh) m.geometry.dispose(); });
    live.clear();
    const batch = createBatch(THREE);
    const near = plan.map(p => ({ p, d: Math.hypot(p.x - px, p.z - pz) })).filter(i => i.d < RADIUS).sort((a, b) => a.d - b.d);
    let budget = CAP_TRIS, signText = 1;
    for (const { p, d } of near) {
      const cost = COST[p.t] + (p.t === 'sign' && signText && d < 60 ? 700 : 0);
      if (cost > budget) continue;
      const text = p.t === 'sign' && signText > 0 && d < 60;
      if (text) signText--;
      draw(batch, p, text, lit); budget -= cost;
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
  }
  let disposed = false;
  return {
    group, update, get rebuilds() { return rebuilds; },
    dispose() {
      if (disposed) return; disposed = true;
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
