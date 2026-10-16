import type * as THREE from 'three';
import type { Kit } from '../kit.ts';
import { createCanonicalStaticAvatar } from '../body/canonical-crowd.ts';
import { totalRenderCost } from '../body/render-cost.ts';
import { nativeWalkCycleDistance } from '../character-lab/native-body.ts';
import { nearDress } from './near.ts';
import type { Person, PersonPose } from './crowd.ts';

/** Bounded native-source snapshots. A pending phase never replaces the last ready phase. */
export function createNativeStreetPeople(kit: Kit, people: readonly Person[], seed: string, changed: () => void) {
  const group = new kit.THREE.Group(); group.name = 'native-street-people';
  type Frame = ReturnType<typeof createCanonicalStaticAvatar>;
  type Entry = { holder: THREE.Group; frames: Map<number,Frame>; shown: Frame | null; dress: ReturnType<typeof nearDress> };
  const entries = new Map<number,Entry>(); let disposed = false;
  function drop(entry: Entry) { for (const frame of entry.frames.values()) frame.userData.dispose(); entry.holder.removeFromParent(); }
  return {
    group,
    get shown(){return [...entries.values()].filter(entry=>entry.holder.visible).length;},
    update(poses: readonly (PersonPose|null)[], heights: ArrayLike<number>, hidden: ReadonlySet<number> | null, eye: {x:number;z:number}|null, room: {triangles:number;drawCalls:number}, inside: (x:number,z:number)=>boolean): ReadonlySet<number> {
      const candidates = poses.flatMap((pose,id)=>pose && pose.fade >= .5 && inside(pose.x,pose.z) && !hidden?.has(id) ? [{id,pose}] : [])
        .sort((a,b)=>eye ? Math.hypot(a.pose.x-eye.x,a.pose.z-eye.z)-Math.hypot(b.pose.x-eye.x,b.pose.z-eye.z) || a.id-b.id : a.id-b.id).slice(0,4);
      const keep = new Set(candidates.map(p=>p.id));
      for (const [id,entry] of entries) if(!keep.has(id)){drop(entry);entries.delete(id);}
      const visible=new Set<number>();let triangles=room.triangles,drawCalls=room.drawCalls;
      for(const {id,pose} of candidates){
        let entry=entries.get(id);
        if(!entry){if(triangles<2500||drawCalls<7)continue;const holder=new kit.THREE.Group();holder.visible=false;group.add(holder);entry={holder,frames:new Map(),shown:null,dress:nearDress(people[id]!,id,seed)};entries.set(id,entry);}
        const {dress}=entry;
        const cycle=nativeWalkCycleDistance(dress.look,dress.seed)*dress.scale;
        const phase=pose.mode===0?Math.floor((((pose.travelled??0)/cycle)%1+1)%1*8):-1;
        let frame=entry.frames.get(phase);
        if(!frame){frame=createCanonicalStaticAvatar(kit,dress.look,{seed:dress.seed,detail:'lod',sceneScale:dress.scale,pose:phase<0?'stand':'walk',stride:Math.max(0,phase)/8});frame.visible=false;entry.holder.add(frame);entry.frames.set(phase,frame);void frame.userData.ready?.then(()=>{if(!disposed)changed();});}
        if(frame.userData.characterStatus==='ready'&&frame!==entry.shown){if(entry.shown)entry.shown.visible=false;frame.visible=true;entry.shown=frame;}
        const cost=entry.shown?totalRenderCost(entry.shown):null;
        entry.holder.visible=Boolean(cost&&cost.triangles<=triangles&&cost.drawCalls<=drawCalls);
        entry.holder.position.set(pose.x,heights[id]??0,pose.z);entry.holder.rotation.y=pose.ry;
        if(entry.holder.visible&&cost){triangles-=cost.triangles;drawCalls-=cost.drawCalls;visible.add(id);}
      }
      return visible;
    },
    dispose(){disposed=true;for(const entry of entries.values())drop(entry);entries.clear();group.removeFromParent();},
  };
}
