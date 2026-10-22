/** Clearance search for an explicitly illustrative gameplay road. Not a geographic observation. */
import {footprintClearance} from '../../src/wukari/play/roads.ts';
import type {Point,Study} from '../../src/wukari/play/model.ts';
export function virtualBypass(study:Study,start:Point,end:Point,clearance=5.3){
 const buildings=study.buildings.filter(b=>b.points.some(p=>p.x>-50&&p.x<110&&p.z>-80&&p.z<90));
 const clear=(a:Point,b:Point)=>buildings.every(f=>footprintClearance(a,b,f.points)>=clearance);
 const step=2,key=(p:Point)=>p.x+','+p.z,point=(x:number,z:number)=>({x:start.x+x*step,z:start.z+z*step});
 const open=[{x:0,z:0,g:0,f:0}],cost=new Map<string,number>([['0,0',0]]),parent=new Map<string,string>();let last='';
 for(let it=0;open.length&&it<20000;it++){open.sort((a,b)=>a.f-b.f);const n=open.shift()!,p=point(n.x,n.z),k=key(n);if(clear(p,end)&&Math.hypot(p.x-end.x,p.z-end.z)<14){last=k;break;}
  for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const x=n.x+dx!,z=n.z+dz!,q=point(x,z),id=x+','+z,g=n.g+Math.hypot(dx!,dz!)*step;if(q.x<-25||q.x>90||q.z<-55||q.z>65||g>=(cost.get(id)??Infinity)||!clear(p,q))continue;cost.set(id,g);parent.set(id,k);open.push({x,z,g,f:g+Math.hypot(q.x-end.x,q.z-end.z)});}}
 if(!last)throw Error('No footprint-clear virtual bypass available');const route:Point[]=[end];for(let k=last;;){const [x,z]=k.split(',').map(Number);route.push(point(x!,z!));const prev=parent.get(k);if(!prev)break;k=prev;}route.reverse();
 const simple:Point[]=[start];for(let i=0;i<route.length-1;){let j=route.length-1;while(j>i+1&&!clear(route[i]!,route[j]!))j--;simple.push(route[j]!);i=j;}
 // Rounded bends remain inside the conservative search clearance envelope, rechecked exactly.
 const rounded:Point[]=[simple[0]!];for(let i=1;i<simple.length-1;i++){const a=simple[i-1]!,b=simple[i]!,c=simple[i+1]!,r=Math.min(4,Math.hypot(a.x-b.x,a.z-b.z)/3,Math.hypot(c.x-b.x,c.z-b.z)/3),u={x:b.x+(a.x-b.x)*r/Math.hypot(a.x-b.x,a.z-b.z),z:b.z+(a.z-b.z)*r/Math.hypot(a.x-b.x,a.z-b.z)},v={x:b.x+(c.x-b.x)*r/Math.hypot(c.x-b.x,c.z-b.z),z:b.z+(c.z-b.z)*r/Math.hypot(c.x-b.x,c.z-b.z)};const curve=[u,...Array.from({length:4},(_,j)=>{const t=(j+1)/4;return{x:(1-t)**2*u.x+2*(1-t)*t*b.x+t*t*v.x,z:(1-t)**2*u.z+2*(1-t)*t*b.z+t*t*v.z};})];if(curve.every((p,j)=>clear(j?curve[j-1]!:rounded.at(-1)!,p)))rounded.push(...curve);else rounded.push(b);}
 rounded.push(simple.at(-1)!);if(!rounded.slice(1).every((p,i)=>clear(rounded[i]!,p)))throw Error('Bypass smoothing clearance failed');return rounded;
}
