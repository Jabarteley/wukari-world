import {gameplayRoads} from './model.ts';
import { inside, buildingCollision, type Study, type Point } from './model.ts';
import { footprintClearance } from './roads.ts';
export const vehicleKinds = ['motorcycle', 'car', 'suv', 'truck', 'trailer'] as const;
export type VehicleKind = typeof vehicleKinds[number];
export const vehicleSize = { motorcycle: [.65, 1.9], car: [1.45, 3.4], suv: [1.65, 3.9], truck: [1.8, 5.4], trailer: [2, 8.5] } satisfies Record<VehicleKind, number[]>;
export interface Edge {
    a: Point;
    b: Point;
    from: number;
    to: number;
    roadId: number;
    segment: number;
    length: number;
    width: number;
    laneOffset?: number;
    heavyAllowed?: boolean;
}
export interface Vehicle extends Point {
    id: number;
    kind: VehicleKind;
    edge: Edge;
    t: number;
    yaw: number;
    speed: number;
    distance: number;
    age: number;
    stopped: number;
    alpha: number;
    turns: number;
    entry?: Point;
}
export function trafficGraph(study: Study) {
    const widths = new Map<string, {
        min: number;
        length: number;
    }>();
    for (const p of study.roadSurface ?? []) {
        const key = p.roadId + '/' + p.segment, q = widths.get(key) ?? { min: Infinity, length: 0 };
        q.min = Math.min(q.min, p.halfWidth);
        q.length += Math.hypot(p.b.x - p.a.x, p.b.z - p.a.z);
        widths.set(key, q);
    }
    const edges: Edge[] = [], adjacency = new Map<number, Edge[]>();
    for (const road of gameplayRoads(study)) {
        const t = road.tags;
        if (!['residential', 'service', 'living_street', 'primary', 'secondary', 'tertiary', 'unclassified'].includes(t.highway ?? '') || ['no', 'private', 'permit', 'military'].includes(t.access ?? '') || ['no', 'private'].includes(t.motor_vehicle ?? '') || t.bridge || t.tunnel || t.ford || t.construction)
            continue;
        for (let i = 1; i < road.points.length; i++) {
            const a = road.points[i - 1]!, b = road.points[i]!, length = Math.hypot(b.x - a.x, b.z - a.z), w = widths.get(road.id + '/' + (i - 1));
            if (!w || w.length < length - .01 || w.min < .6 || length < (study.trafficLanes ? .2 : 3))
                continue;
            const base = { a, b, from: road.nodes[i - 1]!, to: road.nodes[i]!, roadId: road.id, segment: i - 1, length, width: w.min,heavyAllowed:!road.tags['wukari:geometry'] };
            if (t.oneway !== '-1')
                edges.push(base);
            if (t.oneway !== 'yes' && t.oneway !== '1' && t.junction !== 'roundabout')
                edges.push({ ...base, a: b, b: a, from: base.to, to: base.from });
        }
    }
    for (const edge of edges) {
        // Right-hand offsets taper to the shared OSM node at junctions. Source edges stay unchanged.
        edge.laneOffset = study.trafficLanes && edge.width >= 2.8 ? Math.min(1.55,edge.width/2) : 0;
        const list = adjacency.get(edge.from) ?? [];
        list.push(edge);
        adjacency.set(edge.from, list);
    }
    return { edges, adjacency };
}
export function lanePosition(edge:Edge,t:number):Point {
    const offset=edge.laneOffset??0;
    return {x:edge.a.x+(edge.b.x-edge.a.x)*t-(edge.b.z-edge.a.z)/edge.length*offset,z:edge.a.z+(edge.b.z-edge.a.z)*t+(edge.b.x-edge.a.x)/edge.length*offset};
}
/** Separating-axis rectangles include a small safety margin; opposing lanes may pass. */
export function vehiclesConflict(a:Pick<Vehicle,'x'|'z'|'yaw'|'kind'>,b:Pick<Vehicle,'x'|'z'|'yaw'|'kind'>,margin=.35){
    const ra=vehicleRing(a),rb=vehicleRing(b);
    for(const yaw of [a.yaw,b.yaw])for(const axis of [{x:Math.cos(yaw),z:-Math.sin(yaw)},{x:Math.sin(yaw),z:Math.cos(yaw)}]){const pa=ra.map(p=>p.x*axis.x+p.z*axis.z),pb=rb.map(p=>p.x*axis.x+p.z*axis.z);if(Math.max(...pa)+margin<Math.min(...pb)||Math.max(...pb)+margin<Math.min(...pa))return false;}
    return true;
}
export function vehicleRing(v: Pick<Vehicle, 'x' | 'z' | 'yaw' | 'kind'>) { const [width, length] = vehicleSize[v.kind], s = Math.sin(v.yaw), c = Math.cos(v.yaw); const ring = [[-width! / 2, -length! / 2], [width! / 2, -length! / 2], [width! / 2, length! / 2], [-width! / 2, length! / 2]].map(([x, z]) => ({ x: v.x + x! * c + z! * s, z: v.z - x! * s + z! * c })); return [...ring, ring[0]!]; }
export function trafficSimulation(study: Study) {
    const graph = trafficGraph(study), vehicles: Vehicle[] = [], boxes = study.buildings.map(b => ({ b, minX: Math.min(...b.points.map(p => p.x)), maxX: Math.max(...b.points.map(p => p.x)), minZ: Math.min(...b.points.map(p => p.z)), maxZ: Math.max(...b.points.map(p => p.z)) }));
    let serial = 0, seed = 931, spawnClock = 0;
    const junctions=new Set([...graph.adjacency].filter(([,edges])=>edges.length>2).map(([id])=>id));
    const reservations=new Map<number,number>();
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const permitted=(e:Edge,kind:VehicleKind)=>e.width>=vehicleSize[kind][0]!/2+.25&&(!study.trafficLanes||!['truck','trailer'].includes(kind)||(!!e.laneOffset&&e.heavyAllowed));
    const hasExit=(e:Edge,kind:VehicleKind)=>(graph.adjacency.get(e.to)??[]).some(next=>next.to!==e.from&&permitted(next,kind));
    function clear(v: Pick<Vehicle, 'x' | 'z' | 'yaw' | 'kind'>) { const ring = vehicleRing(v), [width, length] = vehicleSize[v.kind], radius = Math.hypot(width!, length!) / 2 + .1; for (const q of boxes) {
        if (q.minX > v.x + radius || q.maxX < v.x - radius || q.minZ > v.z + radius || q.maxZ < v.z - radius)
            continue;
        if (ring.some(p => inside(p, q.b.points)) || q.b.points.some(p => inside(p, ring)))
            return false;
        for (let i = 1; i < ring.length; i++)
            if (footprintClearance(ring[i - 1]!, ring[i]!, q.b.points) < .08)
                return false;
    } return true; }
    function blocks(p: Point, margin = .45) { return vehicles.some(v => { if (v.alpha < .1)
        return false; const dx = p.x - v.x, dz = p.z - v.z, c = Math.cos(v.yaw), s = Math.sin(v.yaw), [w, l] = vehicleSize[v.kind]; return Math.abs(dx * c - dz * s) < w! / 2 + margin && Math.abs(dx * s + dz * c) < l! / 2 + margin; }); }
    function spawn(player: Point) {
        const order: VehicleKind[] = ['motorcycle', 'motorcycle', 'car', 'motorcycle', 'suv', 'motorcycle', 'truck', 'motorcycle', 'trailer', 'motorcycle', 'car', 'motorcycle'];
        const kind = order[serial % order.length]!, [width, length] = vehicleSize[kind];
        const start = study.spawn!, startRoad = study.roads.find(r => r.id === start?.roadId), startIndex = startRoad?.nodes.indexOf(start.nodeId) ?? -1, forward = startRoad?.points[startIndex + 1] ?? startRoad?.points[startIndex - 1] ?? { x: player.x, z: player.z - 1 }, vx = forward.x - (start?.point.x ?? player.x), vz = forward.z - (start?.point.z ?? player.z), norm = Math.hypot(vx, vz) || 1, target = { x: player.x + vx / norm * 55, z: player.z + vz / norm * 55 };
        const intro = serial === 0 ? [...graph.edges].filter(e => (e.b.x - e.a.x) * (-vx) + (e.b.z - e.a.z) * (-vz) > 0).sort((a, b) => Math.hypot((a.a.x + a.b.x) / 2 - target.x, (a.a.z + a.b.z) / 2 - target.z) - Math.hypot((b.a.x + b.b.x) / 2 - target.x, (b.a.z + b.b.z) / 2 - target.z)) : [];
        for (let i = 0; i < 100; i++) {
            const edge = serial === 0 ? intro[i] : graph.edges[Math.floor(random() * graph.edges.length)];
            if (!edge || !permitted(edge,kind) || edge.length < length! + 3 || (study.trafficLanes&&!hasExit(edge,kind)))
                continue;
            const t = serial === 0 ? Math.max(.05, Math.min(.95, ((target.x - edge.a.x) * (edge.b.x - edge.a.x) + (target.z - edge.a.z) * (edge.b.z - edge.a.z)) / (edge.length * edge.length))) : .25 + random() * .5, x = edge.a.x + (edge.b.x - edge.a.x) * t, z = edge.a.z + (edge.b.z - edge.a.z) * t, d = Math.hypot(x - player.x, z - player.z);
            if (d < 35 || d > 180 || Math.abs(x) > study.halfSize - 10 || Math.abs(z) > study.halfSize - 10)
                continue;
            const candidate: Vehicle = { id: serial, kind, edge, t, ...lanePosition(edge,t), yaw: Math.atan2(edge.b.x - edge.a.x, edge.b.z - edge.a.z), speed: 0, distance: 0, age: 0, stopped: 0, alpha: 0, turns: 0 };
            if (!clear(candidate) || vehicles.some(v => Math.hypot(v.x - x, v.z - z) < (vehicleSize[v.kind][1]! + length!) / 2 + 5))
                continue;
            serial++;
            vehicles.push(candidate);
            return;
        }
        // An ineligible heavy vehicle must not stall the entire spawn queue.
        if(study.trafficLanes)serial++;
    }
    function step(dt: number, player: Point, density: number) {
        dt = Math.min(.05, Math.max(0, dt));
        for(const [node,id]of reservations){const v=vehicles.find(v=>v.id===id),p=graph.adjacency.get(node)?.[0]?.a;if(!v||!p||Math.hypot(v.x-p.x,v.z-p.z)>10||v.stopped>7)reservations.delete(node);}
        spawnClock += dt;
        if (density > vehicles.length && spawnClock > .3) {
            spawnClock = 0;
            spawn(player);
        }
        for (const [vehicleIndex, v] of vehicles.entries()) {
            v.age += dt;
            const playerDistance = Math.hypot(v.x - player.x, v.z - player.z);
            const retire = (v.stopped > (study.trafficLanes?12:18) && playerDistance > (study.trafficLanes?20:45)) || (study.trafficLanes&&v.stopped>22) || (vehicleIndex >= density && (playerDistance > 35 || density === 0));
            const opacity = retire ? 0 : Math.min(1, v.age / 1.5) * Math.min(1, Math.max(0, (240 - playerDistance) / 25));
            v.alpha += Math.max(-dt / 1.5, Math.min(dt / 1.5, opacity - v.alpha));
            const remaining = (1 - v.t) * v.edge.length, target = remaining < vehicleSize[v.kind][1]! + 5 ? 2 : v.kind === 'motorcycle' ? 6 : v.kind === 'trailer' ? 4 : 5;
            // One vehicle owns a junction conflict zone until it has cleared the exit.
            // Queues stop before the node, leaving the turning surface open.
            if(study.trafficLanes&&remaining<9&&junctions.has(v.edge.to)){
                const owner=reservations.get(v.edge.to);
                if(owner===undefined){const node=v.edge.b,occupied=vehicles.some(o=>o!==v&&Math.hypot(o.x-node.x,o.z-node.z)<6&&o.edge.from===v.edge.to);if(!occupied)reservations.set(v.edge.to,v.id);}
                if(reservations.get(v.edge.to)!==v.id&&remaining<vehicleSize[v.kind][1]!/2+5){v.speed=0;v.stopped+=dt;continue;}
            }
            v.speed = Math.min(target, v.speed + dt * 1.4);
            let travel = v.speed * dt, blocked = false;
            while (travel > 1e-6) {
                const amount = Math.min(.1, travel, Math.max(0, (1 - v.t) * v.edge.length));
                if (amount < 1e-6) {
                    const choices = (graph.adjacency.get(v.edge.to) ?? []).filter(e => permitted(e,v.kind)&&(!study.trafficLanes||hasExit(e,v.kind)) && e.to !== v.edge.from && ((e.b.x - e.a.x) * Math.sin(v.yaw) + (e.b.z - e.a.z) * Math.cos(v.yaw)) / e.length > (v.kind === 'trailer' ? .65 : -.65));
                    if (!choices.length) {
                        blocked = true;
                        break;
                    }
                    const next = study.trafficLanes?[...choices].sort((a,b)=>{
                        const score=(e:Edge)=>vehicles.filter(o=>o!==v&&o.edge.from===e.from&&o.edge.to===e.to&&o.t*e.length<18).length*20+2*(1-((e.b.x-e.a.x)*Math.sin(v.yaw)+(e.b.z-e.a.z)*Math.cos(v.yaw))/e.length);
                        return score(a)-score(b);
                    })[0]!:choices[Math.floor(random() * choices.length)]!;
                    v.entry=study.trafficLanes?{x:v.x,z:v.z}:undefined;
                    v.edge = next;
                    v.t = 0;
                    v.turns++;
                    continue;
                }
                const t = v.t + amount / v.edge.length;
                const at=(u:number)=>{const p=lanePosition(v.edge,u),start=lanePosition(v.edge,0),blend=Math.max(0,1-u*v.edge.length/Math.min(6,v.edge.length));return v.entry?{x:p.x+(v.entry.x-start.x)*blend,z:p.z+(v.entry.z-start.z)*blend}:p;};
                const {x,z}=at(t), ahead=at(Math.min(1,t+.005)),desired = Math.hypot(ahead.x-x,ahead.z-z)<1e-7?Math.atan2(v.edge.b.x-v.edge.a.x,v.edge.b.z-v.edge.a.z):Math.atan2(ahead.x-x,ahead.z-z), turn = Math.atan2(Math.sin(desired - v.yaw), Math.cos(desired - v.yaw)), yaw = v.yaw + turn * Math.min(1, dt * 5), candidate = { ...v, x, z, yaw };
                const gap = (vehicleSize[v.kind][1]!) / 2 + 1.3;
                const px=player.x-x,pz=player.z-z,playerInLane=Math.abs(px*Math.cos(yaw)-pz*Math.sin(yaw))<vehicleSize[v.kind][0]!/2+.7&&Math.abs(px*Math.sin(yaw)+pz*Math.cos(yaw))<gap;
                if ((study.trafficLanes?playerInLane:Math.hypot(x - player.x, z - player.z) < gap) || vehicles.some(o => o !== v && (study.trafficLanes?vehiclesConflict(candidate,o):Math.hypot(o.x - x, o.z - z) < (vehicleSize[o.kind][1]! + vehicleSize[v.kind][1]!) / 2 + 1)) || !clear(candidate)) {
                    blocked = true;
                    break;
                }
                v.x = x;
                v.z = z;
                v.yaw = yaw;
                v.t = t;
                v.distance += amount;
                travel -= amount;
            }
            if (blocked) {
                v.speed = 0;
                v.stopped += dt;
            }
            else
                v.stopped = 0;
        }
        for (let i = vehicles.length - 1; i >= 0; i--) {
            const v = vehicles[i]!, d = Math.hypot(v.x - player.x, v.z - player.z);
            if (v.age > 2 && v.alpha <= .001 && (d > 215 || (v.stopped > (study.trafficLanes?12:18) && d > (study.trafficLanes?20:45)) || (study.trafficLanes&&v.stopped>22) || vehicles.length > density))
                vehicles.splice(i, 1);
        }
    }
    return { vehicles, graph, step, clear, blocks, reset() { vehicles.length = 0; reservations.clear();serial = 0; seed = 931; spawnClock = 0; } };
}
