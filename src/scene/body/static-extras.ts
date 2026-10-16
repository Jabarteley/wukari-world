/** Records venue prop characters separately from the colour-only scenery batch. */
import type { Kit } from '../kit.ts';
import type { Batch } from '../types.ts';
import { hash } from '../build.ts';
import { normalizeLook } from '../characters.ts';
import type { Crowd, DrawnAvatar, DrawOptions, Look } from '../characters.ts';
import { totalRenderCost } from './render-cost.ts';
import { requestNativeRender } from '../character-lab/native-body.ts';
import { buildCanonicalCrowd } from './canonical-crowd.ts';
import type { CanonicalCrowdPerson } from './canonical-crowd.ts';

interface Extra {
  look: Look;
  seed: unknown;
  pose: NonNullable<DrawOptions['pose']>;
  stride: number | undefined;
  seat: number;
  scale: number;
  sleeping: boolean;
  matrix: readonly number[];
}
const pending = new WeakMap<Batch, Extra[]>();

/** Capture all three transformed basis vectors, so nested scale and pitch survive the batch boundary. */
function worldMatrix(batch: Batch, x: number, y: number, z: number, ry: number): readonly number[] {
  const c = Math.cos(ry), s = Math.sin(ry);
  const origin = batch.world(x, y, z);
  const right = batch.world(x + c, y, z - s);
  const up = batch.world(x, y + 1, z);
  const front = batch.world(x + s, y, z + c);
  return [
    right.x - origin.x, right.y - origin.y, right.z - origin.z, 0,
    up.x - origin.x, up.y - origin.y, up.z - origin.z, 0,
    front.x - origin.x, front.y - origin.y, front.z - origin.z, 0,
    origin.x, origin.y, origin.z, 1,
  ];
}

/** Props call this while their batch transform stack is active. No avatar enters the scenery's vertex-colour path. */
export function recordCanonicalExtra(batch: Batch, input: unknown, options: DrawOptions): DrawnAvatar {
  const seed = input == null ? `canonical-extra-${hash(String(options.seed ?? 'extra')) % 6}` : options.seed;
  const look = normalizeLook(input, seed);
  const pose = options.pose ?? 'stand';
  const seat = options.seat ?? 0.6;
  const scale = options.scale ?? 1;
  const x = options.x ?? 0, y = options.y ?? 0, z = options.z ?? 0, ry = options.ry ?? 0;
  const descriptor: Extra = {
    look, seed, pose, stride: options.stride, seat, scale, sleeping: options.sleeping ?? false,
    matrix: worldMatrix(batch, x, y, z, ry),
  };
  const list = pending.get(batch) ?? [];
  list.push(descriptor);
  pending.set(batch, list);
  // Retain drawAvatar's return contract for layout code; the rendered top is measured from canonical geometry.
  const effectiveScale = scale * (look.native?.appearance.height ?? 1);
  const lift = pose === 'sit' ? seat + 0.13 - 1.05 : 0;
  return { look, top: y + (lift + 2.95) * effectiveScale };
}

export function pendingCanonicalExtras(batch: Batch): number { return pending.get(batch)?.length ?? 0; }

/** Fail at a scene build boundary if a caller forgot to mount the recorded canonical characters. */
export function assertNoPendingCanonicalExtras(batch: Batch): void {
  const count = pendingCanonicalExtras(batch);
  if (count) throw new Error(`${count} canonical venue extras were recorded but never built`);
}

/** Consume a batch's extras once, retaining their full affine placement and canonical materials. */
export function buildCanonicalExtras(kit: Kit, batch: Batch, options: {room?:()=>{triangles:number;drawCalls:number}} = {}): Crowd {
  const extras = pending.get(batch) ?? [];
  const people: CanonicalCrowdPerson[] = extras.map(({ look, seed, pose, stride, seat, scale, sleeping, matrix }) => ({
    look, seed, pose, stride, seat: seat * scale, scale, sleeping, matrix,
  }));
  pending.delete(batch);
  const occupiedPositions = extras.map(({matrix}) => ({x:matrix[12]!,z:matrix[14]!}));
  if(!options.room){
    const crowd=buildCanonicalCrowd(kit,people);
    crowd.group.userData.occupiedPositions=occupiedPositions;
    return crowd;
  }
  // Decorative extras are candidates, not scene members, until their real native snapshot cost fits.
  const group=new kit.THREE.Group();group.name='native-decorative-extras';
  Object.assign(group.userData,{canonicalCharacter:true,characterFoundation:'native53',characterStatus:'loading',optionalCandidate:true,occupiedPositions});
  const tags: Crowd['tags']=[];
  let active:Crowd|undefined,disposed=false;
  const removeCleanup=kit.onDispose(()=>dispose());
  const dispose=()=>{if(disposed)return;disposed=true;removeCleanup();active?.dispose();group.removeFromParent();};
  let lastRoom='',running=false,queued=false;
  const rebudget=()=>{
    if(disposed)return;
    const room=options.room!(), key=JSON.stringify([Math.floor(room.triangles),Math.floor(room.drawCalls)]);
    if(key===lastRoom)return;lastRoom=key;
    if(running){queued=true;return;}
    running=true;
    if(active){const cost=totalRenderCost(active.group);if(cost.triangles>room.triangles||cost.drawCalls>room.drawCalls)active.group.visible=false;}
    group.userData.ready=(async()=>{
    let count=people.length;
    while(count>0&&!disposed){
      const candidate=buildCanonicalCrowd(kit,people.slice(0,count));
      try{await candidate.group.userData.ready;}catch(error){candidate.dispose();throw error;}
      if(disposed){candidate.dispose();return;}
      const cost=totalRenderCost(candidate.group),room=options.room!();
      if(cost.triangles<=Math.max(0,room.triangles)&&cost.drawCalls<=Math.max(0,room.drawCalls)){
        active?.dispose();active=candidate;group.add(candidate.group);tags.splice(0,tags.length,...candidate.tags);break;
      }
      candidate.dispose();
      const fraction=Math.min(1,Math.max(0,room.triangles)/Math.max(1,cost.triangles),Math.max(0,room.drawCalls)/Math.max(1,cost.drawCalls));
      count=Math.min(count-1,Math.floor(count*fraction));
    }
    if(!disposed&&count===0){active?.dispose();active=undefined;tags.length=0;}
    if(!disposed){Object.assign(group.userData,{characterStatus:'ready',admitted:active?.tags.length??0,requested:people.length});requestNativeRender(kit);}
  })().finally(()=>{running=false;if(queued){queued=false;lastRoom='';rebudget();}});
  group.userData.ready.catch((error:unknown)=>{if(!disposed){group.userData.characterStatus='error';group.userData.characterError=String(error);requestNativeRender(kit);}});
  };
  group.userData.rebudget=rebudget;rebudget();
  return {group,tags,get triangles(){return active?.triangles??0;},dispose};
}
