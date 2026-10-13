/**
 * Ambient campus life: a few students who walk the A* routes between nearby landmarks, and a campus
 * shuttle that loops its mapped stops. Positions come from the wall clock at draw time (the scene is
 * drawn on demand, so this never keeps a frame loop alive and costs nothing while idle).
 * Walkers use one merged mesh each (~100 triangles) and count against the crowd budget of 12.
 */
import type { Group, Mesh } from 'three';
import type { Kit } from '../../scene/kit.ts';
import { ANCHORS } from './layout.ts';
import type { CampusNavigation } from './scene.ts';
import { studentMesh } from './life.ts';
import { SHUTTLE_STOPS, shuttlePose, shuttleRoute } from './shuttle.ts';
import { buildShuttle } from './shuttle-scene.ts';

interface Track { pts: Array<{ x: number; z: number }>; cum: number[]; length: number }
const MAX_WALKERS = 4, WALK_SPEED = 1.3, DWELL = 6;
const LOOP = ['main-gate', 'new-hall-shopping', 'senate', 'engineering', 'sports-centre', 'senate', 'lagoon-front'];

export function createAmbient(kit: Kit, navigation: CampusNavigation, playerVisible: () => boolean) {
  const { THREE } = kit;
  const group = new THREE.Group(); group.name = 'UNILAG ambient life';
  const walkers: Array<{ mesh: Mesh; track: Track | null; offset: number }> = [];
  const routes = new Map<string, Track | null>();
  let capacity = MAX_WALKERS, key = '', disposed = false;
  const ids = Object.keys(ANCHORS).filter(id => id !== 'main-gate');

  const trackOf = (a: string, b: string): Track | null => {
    const k = `${a}>${b}`;
    if (routes.has(k)) return routes.get(k)!;
    const A = ANCHORS[a]!, B = ANCHORS[b]!, path = navigation.route({ x: A.x, z: A.z }, { x: B.x, z: B.z });
    let track: Track | null = null;
    if (path && path.length > 1) {
      const cum = [0];
      for (let i = 1; i < path.length; i++) cum.push(cum[i - 1]! + Math.hypot(path[i]!.x - path[i - 1]!.x, path[i]!.z - path[i - 1]!.z));
      if (cum.at(-1)! > 8 && cum.at(-1)! < 500) track = { pts: path.map(p => ({ x: p.x, z: p.z })), cum, length: cum.at(-1)! };
    }
    routes.set(k, track); return track;
  };

  /** Re-pick the walkers' routes among the landmarks nearest the player. */
  function retarget(px: number, pz: number) {
    const near = ids.map(id => ({ id, d: Math.hypot(ANCHORS[id]!.x - px, ANCHORS[id]!.z - pz) })).filter(i => i.d < 260).sort((a, b) => a.d - b.d).map(i => i.id).slice(0, MAX_WALKERS + 1);
    const k = near.join(',') + capacity;
    if (k === key) return;
    key = k;
    for (let i = 0; i < MAX_WALKERS; i++) {
      let w = walkers[i];
      if (!w) { const mesh = studentMesh(kit, 90 + i * 7); group.add(mesh); w = { mesh, track: null, offset: i * 17.3 }; walkers[i] = w; }
      const a = near[i], b = near[i + 1];
      w.track = i < capacity && a && b ? trackOf(a, b) : null;
      w.mesh.visible = !!w.track;
    }
  }

  // The ambient shuttle loops the mapped stops; it hides while the player rides the real one.
  const bus = buildShuttle(kit); bus.group.visible = false; group.add(bus.group);
  const stopIds = new Set(SHUTTLE_STOPS.map(s => s.id));
  const loop = LOOP.filter(id => stopIds.has(id as never));
  let leg = 0, legStart = 0, legRoute: ReturnType<typeof shuttleRoute> = null;
  const t0 = () => performance.now() / 1000;
  function stepBus(now: number) {
    if (loop.length < 2 || !playerVisible()) { bus.group.visible = false; return; }
    if (!legRoute) {
      legRoute = shuttleRoute(loop[leg % loop.length]!, loop[(leg + 1) % loop.length]!);
      if (!legRoute) { leg++; legStart = now; bus.group.visible = false; return; }
      legStart = now;
    }
    const e = now - legStart, travel = legRoute.duration;
    if (e > travel + DWELL) { leg++; legRoute = null; return; }
    const pose = shuttlePose({ origin: legRoute.origin, destination: legRoute.destination, duration: travel, remaining: travel }, Math.min(1, e / travel));
    if (!pose) { bus.group.visible = false; return; }
    bus.group.visible = true; bus.group.position.set(pose.x, .2, pose.z); bus.group.rotation.y = pose.ry;
  }

  const base = group.updateMatrixWorld.bind(group);
  group.updateMatrixWorld = (force?: boolean) => {
    if (!disposed) {
      const now = t0();
      for (const w of walkers) {
        const tr = w.track; if (!tr || !w.mesh.visible) continue;
        const s = (now * WALK_SPEED + w.offset) % (2 * tr.length), back = s > tr.length, d = back ? 2 * tr.length - s : s;
        let i = 1; while (i < tr.cum.length - 1 && tr.cum[i]! < d) i++;
        const a = tr.pts[i - 1]!, b = tr.pts[i]!, span = tr.cum[i]! - tr.cum[i - 1]! || 1, t = Math.max(0, Math.min(1, (d - tr.cum[i - 1]!) / span));
        w.mesh.position.set(a.x + (b.x - a.x) * t, Math.abs(Math.sin(now * 7 + w.offset)) * .05, a.z + (b.z - a.z) * t);
        w.mesh.rotation.y = Math.atan2(b.x - a.x, b.z - a.z) + (back ? Math.PI : 0);
      }
      stepBus(now);
    }
    base(force);
  };

  return {
    group, retarget,
    setCapacity(n: number) { capacity = Math.max(0, Math.min(MAX_WALKERS, n)); key = ''; },
    dispose() {
      if (disposed) return; disposed = true;
      for (const w of walkers) w.mesh.geometry.dispose();
      bus.dispose(); group.removeFromParent(); group.clear();
    },
  };
}
