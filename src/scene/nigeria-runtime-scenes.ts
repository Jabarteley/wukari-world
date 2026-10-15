/** Dedicated batch001 venues. Source payloads stay metre-scaled; host support/navigation is fixed across LODs. */
import type { SceneDef } from './types.ts';
import { createRuntimeHost } from './models/runtime-host.ts';
import { NIGERIA_BATCH001_NAVIGATION as NAV, NIGERIA_METRE_SCALE as S } from './models/nigeria-navigation.ts';
const FILES = {
  "lagos-broad-street-01": {
    "near": {
      "url": "/assets/nigeria-runtime/revisions/lagos-broad-street-02/lagos_broadstreet_v2_lod0.glb",
      "sha256": "60d833c9593ce0ad41bd179561c9631d847901ea5addebbe8db0a7325febd4ed"
    },
    "far": {
      "url": "/assets/nigeria-runtime/batch-001/lagos-broad-street-01/lagos_broadstreet_lod1.glb",
      "sha256": "197b7e5d4b85173ea533ada8afb3a0da6db6bbd309e9805427520195b147e0bd"
    }
  },
  "abuja-mosque-boulevard-01": {
    "near": {
      "url": "/assets/nigeria-runtime/batch-001/abuja-mosque-boulevard-01/near.glb",
      "sha256": "93f54d127a5b87414928ff8db90f377bc00d2cb640e26b848a40b9ed13564983"
    },
    "far": {
      "url": "/assets/nigeria-runtime/batch-001/abuja-mosque-boulevard-01/far.glb",
      "sha256": "14e2cd5faaebd23365858cf765a4f639a68027add83e0b7b732ca9737d70ad5d"
    }
  }
} as const;
function definition(id: keyof typeof FILES): SceneDef {
  const nav = NAV[id], mosque = id === 'abuja-mosque-boulevard-01';
  const bounds: [number,number,number,number,number,number] = mosque ? [-77,0,-70,77,75.6,43.4] : [-13.721,-.0071,-12.811,13.721,32.081,4.405];
  return {
    mood: 'outdoor', accent: mosque ? '#d8a838' : '#dfaa62',
    camera: { landscape: mosque ? [60,70,115] : [17,23,40], portrait: mosque ? [45,85,155] : [14,32,53], start: mosque ? 2.3 : 1.2, azimuth: [-1.2, 1.2], bounds },
    walk: { bounds: [...nav.bounds], entrance: [nav.entrance.x,nav.entrance.z], open: true, block: nav.block },
    runtime: {
      createHost: createRuntimeHost,
      reservation: { triangles: mosque ? 4942 : 4174, drawCalls: mosque ? 8 : 10 },
      bounds: [bounds[0],bounds[2],bounds[3],bounds[5]], support: nav.support,
      entranceYaw: nav.entrance.ry,
      request: {
        id, ...FILES[id], indoors: false, position: [0,0,0], yaw: 0,
        navigation: {
          entrance: [nav.entrance.x/S,nav.entrance.z/S,nav.entrance.ry],
          walkable: nav.walkable.map(r => r.map(v=>v/S) as [number,number,number,number]),
          collision: nav.solids.map((r,i)=>({id: `host-solid-${i}`,min:[r[0]/S,r[1]/S,r[2]/S] as [number,number,number],max:[r[3]/S,r[4]/S,r[5]/S] as [number,number,number]})),
          anchors: Object.entries(nav.anchors).map(([id,p])=>({id,kind:'host-action',position:[p.x/S,p.y/S,p.z/S] as [number,number,number]})),
        },
      },
    },
    build(b, context) {
      // These are real rendered fallback support planes, replaced only after the GLB is accepted.
      for (const {rect:[x0,z0,x1,z1],y} of nav.support) b.box((x0+x1)/2,y-.05,(z0+z1)/2,x1-x0,.1,z1-z0,mosque?'#b8b29c':'#aaa094');
      for (const [x0,y0,z0,x1,y1,z1] of nav.solids) b.box((x0+x1)/2,(y0+y1)/2,(z0+z1)/2,x1-x0,y1-y0,z1-z0,mosque?'#ded1b1':'#c5ae8f');
      const spots = context.spots.map(spot => {
        const p=nav.anchors[spot.id] ?? nav.entrance;
        return {key:context.venue?.scene?.anchors?.[spot.id] ?? spot.id,x:p.x,y:p.y,z:p.z,ry:p.ry};
      });
      return { spots, crowd: [], spare: Object.values(nav.anchors).map(p=>[p.x,p.z]), raised: nav.support.filter(p=>p.y>0).map(p=>({rect:p.rect,y:p.y})) };
    },
  };
}
export const NIGERIA_RUNTIME_SCENES = { lagosMarket: definition('lagos-broad-street-01'), abujaMosque: definition('abuja-mosque-boulevard-01') };
