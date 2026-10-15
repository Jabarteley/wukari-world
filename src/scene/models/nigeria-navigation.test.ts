import test from 'node:test';
import assert from 'node:assert/strict';
import { createWalkGrid } from '../walk-grid.ts';
import { NIGERIA_BATCH001_NAVIGATION, NIGERIA_METRE_SCALE as S, nigeriaSupportHeight, rectangleUnionComplement } from './nigeria-navigation.ts';
import type { WalkRect } from '../walk-grid.ts';

test('rectangle complement preserves overlapping corridors and clips outside rectangles',()=>{
  const bounds: WalkRect=[0,0,10,10], areas: WalkRect[]=[[-2,1,6,3],[4,2,7,9],[9,9,12,12]];
  const blocks=rectangleUnionComplement(bounds,areas);
  for(let x=.125;x<10;x+=.25) for(let z=.125;z<10;z+=.25) {
    const inside=areas.some(r=>x>=r[0]&&x<=r[2]&&z>=r[1]&&z<=r[3]);
    const blocked=blocks.some(r=>x>=r[0]&&x<=r[2]&&z>=r[1]&&z<=r[3]);
    assert.equal(blocked,!inside,`${x},${z}`);
  }
  assert.deepEqual(rectangleUnionComplement(bounds,[]),[bounds]);
  assert.deepEqual(rectangleUnionComplement(bounds,[bounds]),[]);
  assert.throws(()=>rectangleUnionComplement([0,0,NaN,1],[]));
});

test('all batch001 anchors are reachable exactly from supported entrance without clearing blockers',()=>{
  for(const [id,nav] of Object.entries(NIGERIA_BATCH001_NAVIGATION)) {
    const grid=createWalkGrid({bounds:nav.bounds,block:nav.block});
    assert.equal(grid.free(nav.entrance.x,nav.entrance.z),true,id);
    for(const [key,a] of Object.entries(nav.anchors)) {
      assert.equal(grid.free(a.x,a.z),true,`${id}:${key} free`);
      const path=grid.path(nav.entrance.x,nav.entrance.z,a.x,a.z);
      assert.ok(path,`${id}:${key} route`);
      const end=path.at(-1);
      if(end) assert.ok(Math.hypot(end.x-a.x,end.z-a.z)<.001,`${id}:${key} exact destination`);
      assert.equal(nigeriaSupportHeight(nav,a.x,a.z),a.y,`${id}:${key} support`);
    }
    for(let r=0;r<grid.rows;r++) for(let c=0;c<grid.cols;c++) {
      const x=nav.bounds[0]+(c+.5)*grid.cell,z=nav.bounds[1]+(r+.5)*grid.cell;
      if(grid.free(x,z)) assert.notEqual(nigeriaSupportHeight(nav,x,z),null,`${id} unsupported cell ${x},${z}`);
    }
  }
});

test('Lagos excludes near furniture for both tiers and corrects elevated sidewalk/entrance',()=>{
  const nav=NIGERIA_BATCH001_NAVIGATION['lagos-broad-street-01'];
  const grid=createWalkGrid({bounds:nav.bounds,block:nav.block});
  assert.equal(grid.free(0,2*S),false,'old entrance intersects furniture');
  assert.equal(grid.free(.6*S,2.1*S),false);
  assert.equal(grid.free(-2*S,2*S),true);
  assert.equal(nav.entrance.y,.185*S);
  assert.equal(nigeriaSupportHeight(nav,-1.6*S,1.1*S),.185*S);
});

test('Abuja rejects unsupported north strip and preserves raised median crossing',()=>{
  const nav=NIGERIA_BATCH001_NAVIGATION['abuja-mosque-boulevard-01'];
  const grid=createWalkGrid({bounds:nav.bounds,block:nav.block});
  assert.equal(grid.free(40*S,-1.5*S),false);
  assert.equal(nigeriaSupportHeight(nav,40*S,-1.5*S),null);
  assert.equal(grid.free(0,15*S),true);
  assert.equal(nigeriaSupportHeight(nav,0,15*S),.18*S);
  assert.equal(nigeriaSupportHeight(nav,0,23*S),0);
  assert.ok(grid.path(0,28*S,0,1*S)?.some(p=>p.z<=1*S+.001));
  assert.equal(grid.free(10*S,4.75*S),false,'outside disconnected strips away from crossing');
});
