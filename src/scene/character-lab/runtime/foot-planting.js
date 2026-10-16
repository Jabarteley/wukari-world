// @ts-nocheck -- Vendored lab runtime; typed integration boundary is foreground-characters.d.mts.
import * as THREE from 'three';

const V = () => new THREE.Vector3();
const smooth = x => { x = THREE.MathUtils.clamp(x, 0, 1); return x * x * (3 - 2 * x); };

function rotateWorld(bone, from, to) {
  if (from.lengthSq() < 1e-10 || to.lengthSq() < 1e-10) return;
  const delta = new THREE.Quaternion().setFromUnitVectors(from.normalize(), to.normalize());
  const world = bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(delta);
  bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));
  bone.updateWorldMatrix(false, true);
}

// An analytic two-bone solve retains the captured knee plane and foot rotation.
export function solveLeg(thigh, calf, foot, target, poleDirection = null) {
  const h = thigh.getWorldPosition(V()), k = calf.getWorldPosition(V()), a = foot.getWorldPosition(V());
  const footRotation = foot.getWorldQuaternion(new THREE.Quaternion());
  const upper = h.distanceTo(k), lower = k.distanceTo(a), axis = target.clone().sub(h);
  const distance = THREE.MathUtils.clamp(axis.length(), Math.abs(upper-lower)+.001, upper+lower-(poleDirection?1e-8:.001));
  axis.normalize();
  const pole = poleDirection
    ? poleDirection.clone().applyQuaternion(new THREE.Quaternion().setFromUnitVectors(a.clone().sub(h).normalize(), axis))
    : k.clone().sub(h);
  pole.addScaledVector(axis, -pole.dot(axis));
  if (pole.lengthSq() < 1e-8) pole.set(0,0,1).addScaledVector(axis,-axis.z);
  pole.normalize();
  const along = (upper*upper - lower*lower + distance*distance)/(2*distance);
  const knee = h.clone().addScaledVector(axis, along).addScaledVector(pole, Math.sqrt(Math.max(0,upper*upper-along*along)));
  rotateWorld(thigh, k.sub(h), knee.sub(h));
  const newKnee = calf.getWorldPosition(V()), newAnkle = foot.getWorldPosition(V());
  rotateWorld(calf, newAnkle.sub(newKnee), target.clone().sub(newKnee));
  foot.quaternion.copy(foot.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(footRotation));
  foot.updateWorldMatrix(false, true);
}

export function soleMarkers(mesh) {
  const p = mesh.geometry.attributes.position, result = {};
  for (const side of ['l','r']) {
    const ids = Array.from({length:p.count},(_,i)=>i).filter(i=>side==='l'?p.getX(i)>0:p.getX(i)<0);
    if (!ids.length) continue;
    const floor = Math.min(...ids.map(i=>p.getY(i))), sole = ids.filter(i=>p.getY(i)<floor+.014);
    const low = Math.min(...sole.map(i=>p.getZ(i))), high = Math.max(...sole.map(i=>p.getZ(i)));
    const toe=sole.filter(i=>p.getZ(i)>low+(high-low)*.76), heel=sole.filter(i=>p.getZ(i)<low+(high-low)*.2);
    result[side] = {mesh, all: ids, sole, toe, heel, toeIds:new Set(toe),heelIds:new Set(heel)};
  }
  return result;
}

function sample(marker) {
  const vertex = V(), toe = V(), heel = V(); let minY=Infinity;
  marker.mesh.skeleton?.update();
  const {toeIds,heelIds}=marker;
  for (const i of marker.sole) {
    marker.mesh.getVertexPosition(i,vertex); marker.mesh.localToWorld(vertex);
    minY=Math.min(minY,vertex.y);
    if (toeIds.has(i)) toe.add(vertex);
    if (heelIds.has(i)) heel.add(vertex);
  }
  return {toe:toe.multiplyScalar(1/marker.toe.length),heel:heel.multiplyScalar(1/marker.heel.length),minY};
}

// Windows describe stable support in the current captured clips, in cycle phase.
// The run begins just before left contact; its support window starts later.
function support(phase, side, runBlend, walkSupport) {
  const envelope=walkSupport?.[side];
  if(envelope) {
    const runStart=.045+(side==='r'?.5:0),runEnd=.315+(side==='r'?.5:0);
    const start=THREE.MathUtils.lerp(envelope.start,runStart,runBlend),end=THREE.MathUtils.lerp(envelope.end,runEnd,runBlend);
    const p=(phase-start+1)%1,feather=THREE.MathUtils.lerp(envelope.feather,.035,runBlend);
    return smooth(p/feather)*smooth((end-start-p)/feather);
  }
  const p = (phase - (side==='r'?.5:0) + 1) % 1;
  const start = THREE.MathUtils.lerp(-.045,.045,runBlend);
  const end = THREE.MathUtils.lerp(.425,.315,runBlend);
  const wrapped = p>.85 ? p-1 : p;
  const feather = THREE.MathUtils.lerp(.045,.035,runBlend);
  return smooth((wrapped-start)/feather) * smooth((end-wrapped)/feather);
}

export function createFootPlanting({root, bones, groundHeight = (_x,_z)=>root.position.y, walkSupport, getKneePole, groundClamp = false, iteration2EarlyWalkContact = false, earlyWalkToeRiseM = .003}) {
  let markers={}, lastRoot=null, lastRotation=null, turnBlend=1;
  const feet={l:{anchor:null,weight:0},r:{anchor:null,weight:0}};
  let diagnostics={enabled:true,feet:{}};
  function reset() { lastRoot=null;lastRotation=null;turnBlend=1; for(const f of Object.values(feet)){f.anchor=null;f.weight=0;f.releasing=false;} }
  function setFootwear(meshes) {
    markers={}; for(const mesh of meshes) if(mesh.isSkinnedMesh) Object.assign(markers,soleMarkers(mesh)); reset();
  }
  function update({dt,phase,runBlend,movingWeight,actionBlend=0,speed=0,inPlace=false,enabled=true}) {
    root.updateMatrixWorld(true);
    const scale=Math.abs(root.getWorldScale(V()).y);
    const position=root.getWorldPosition(V()), rotation=root.getWorldQuaternion(new THREE.Quaternion());
    const earlyWalkWeight=iteration2EarlyWalkContact?1-smooth(runBlend/.15):0;
    if(lastRoot && lastRoot.distanceTo(position)>.6*scale) reset();
    const angularSpeed=lastRotation?lastRotation.angleTo(rotation)/Math.max(dt,.001):0;
    if(dt>0||!lastRotation)lastRotation=rotation;
    const turnSupport=1-smooth((angularSpeed-.5)/2);
    turnBlend=THREE.MathUtils.damp(turnBlend,turnSupport,18,dt);
    if(dt>0||!lastRoot)lastRoot=position;
    diagnostics={enabled,angularSpeed,feet:{}};
    if(!enabled||movingWeight<.005||actionBlend>.995){for(const state of Object.values(feet)){state.anchor=null;state.weight=0;state.releasing=false;}return;}
    // Let a walking sole settle after heel strike. The capture's foot basis
    // otherwise keeps the toe raised through midstance and prevents the
    // heel-to-toe support transfer. Preserve heel rise and running foot roll.
    for(const side of ['l','r']) {
      const marker=markers[side], foot=bones.get(`foot_${side}`), envelope=walkSupport?.[side];
      if(!marker||!foot||!envelope||runBlend>.999)continue;
      const elapsed=(phase-envelope.start+1)%1;
      const weight=smooth((elapsed-.06)/.07)*support(phase,side,0,walkSupport)
        *smooth((movingWeight-.2)/.5)*(1-actionBlend)*(1-runBlend)*turnBlend;
      if(weight<.001)continue;
      const raw=sample(marker), forward=raw.toe.clone().sub(raw.heel);
      if(forward.y<=.003*scale)continue;
      const flat=forward.clone();flat.y=.003*scale;
      const correction=new THREE.Quaternion().setFromUnitVectors(forward.normalize(),flat.normalize());
      const angle=2*Math.acos(THREE.MathUtils.clamp(Math.abs(correction.w),0,1));
      correction.slerp(new THREE.Quaternion(),1-weight*Math.min(1,(8*Math.PI/180)/Math.max(angle,.001)));
      const rotation=foot.getWorldQuaternion(new THREE.Quaternion()).premultiply(correction);
      foot.quaternion.copy(foot.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rotation));
      foot.updateWorldMatrix(false,true);
    }
    // The exported clips are already grounded. Only absorb a small reach error;
    // a large correction would add a second, artificial hip dip to the capture.
    let lowerPelvis=0;
    const pelvis=bones.get('pelvis');
    if(enabled && pelvis && actionBlend<.1) for(const side of ['l','r']) {
      const marker=markers[side], state=feet[side], thigh=bones.get(`thigh_${side}`), calf=bones.get(`calf_${side}`), foot=bones.get(`foot_${side}`);
      if(!marker||!thigh||!calf||!foot) continue;
      const weight=support(phase,side,runBlend,walkSupport)*smooth((movingWeight-.2)/.5)*(1-actionBlend)*turnBlend;
      if(weight<.5) continue;
      const raw=sample(marker), h=thigh.getWorldPosition(V()), k=calf.getWorldPosition(V()), target=foot.getWorldPosition(V());
      if(state.anchor){const shift=state.anchor.clone().sub(raw[state.contact||'toe']);shift.y=0;if(shift.length()<THREE.MathUtils.lerp(.065,.19,runBlend)*scale)target.addScaledVector(shift,weight);}
      target.y+=(groundHeight(raw.toe.x,raw.toe.z)+.002*scale-raw.minY)*weight;
      const reach=h.distanceTo(k)+k.distanceTo(foot.getWorldPosition(V()))-.003*scale;
      const horizontal=(target.x-h.x)**2+(target.z-h.z)**2;
      const required=h.y-target.y-Math.sqrt(Math.max(0,reach*reach-horizontal));
      lowerPelvis=Math.max(lowerPelvis,required);
    }
    lowerPelvis=THREE.MathUtils.clamp(lowerPelvis,0,THREE.MathUtils.lerp(.010,.035,runBlend)*scale);
    if(lowerPelvis>0){const p=pelvis.getWorldPosition(V());p.y-=lowerPelvis;pelvis.position.copy(pelvis.parent.worldToLocal(p));root.updateMatrixWorld(true);}
    diagnostics.pelvisLoweringM=lowerPelvis;
    for(const side of ['l','r']) {
      const marker=markers[side], state=feet[side], thigh=bones.get(`thigh_${side}`), calf=bones.get(`calf_${side}`), foot=bones.get(`foot_${side}`);
      if(!marker||!thigh||!calf||!foot) continue;
      const raw=sample(marker), phaseWeight=support(phase,side,runBlend,walkSupport);
      let weight=phaseWeight*smooth((movingWeight-.2)/.5)*(1-actionBlend)*turnBlend;
      if(phaseWeight<.001)state.releasing=false;
      if(state.releasing)weight=THREE.MathUtils.damp(state.weight,0,24,dt);
      if(weight<.001){state.anchor=null;state.weight=0;diagnostics.feet[side]={weight:0,toe:raw.toe.toArray(),heel:raw.heel.toArray(),minY:raw.minY};continue;}
      if(!state.anchor) {
        state.contact=raw.toe.y>raw.heel.y+.008*scale?'heel':'toe';
        state.anchor=raw[state.contact].clone();
      }
      else if(inPlace) state.anchor.addScaledVector(new THREE.Vector3(0,0,1).applyQuaternion(rotation),-speed*dt);
      const shift=state.anchor.clone().sub(raw[state.contact]); shift.y=0;
      if(shift.length()>THREE.MathUtils.lerp(.065,.19,runBlend)*scale){state.releasing=true;weight=THREE.MathUtils.damp(state.weight,0,24,dt);}
      shift.y=groundHeight(raw.toe.x,raw.toe.z)+.002*scale-raw.minY;
      shift.clampLength(0,.2*scale).multiplyScalar(weight);
      const desiredAnkle=foot.getWorldPosition(V()).add(shift),pole=getKneePole?.(side);
      let reachDeficit=0;
      if(earlyWalkWeight>.001 && weight>.98) {
        const h=thigh.getWorldPosition(V()),k=calf.getWorldPosition(V()),a=foot.getWorldPosition(V());
        reachDeficit=Math.max(0,h.distanceTo(desiredAnkle)-(h.distanceTo(k)+k.distanceTo(a)-(pole?1e-8:.001)));
      }
      solveLeg(thigh,calf,foot,desiredAnkle,pole);
      root.updateMatrixWorld(true);
      let corrected=sample(marker);
      // Calf skin weights can tilt the sole again after the knee solve. Settle
      // that small deformation before the final contact-position correction.
      if(walkSupport?.settle_after_skinning && runBlend<.999 && weight>.8) {
        const elapsed=(phase-walkSupport[side].start+1)%1;
        const settleGate=THREE.MathUtils.lerp(smooth((elapsed-.06)/.07),smooth((elapsed-.025)/.03),earlyWalkWeight);
        const settle=settleGate*smooth((weight-.8)/.2)*(1-runBlend);
        const direction=corrected.toe.clone().sub(corrected.heel);
        const targetRise=THREE.MathUtils.lerp(.003,earlyWalkToeRiseM,earlyWalkWeight)*scale;
        if(direction.y>targetRise && settle>.001) {
          const flat=direction.clone(); flat.y=targetRise;
          const delta=new THREE.Quaternion().setFromUnitVectors(direction.normalize(),flat.normalize());
          const angle=2*Math.acos(THREE.MathUtils.clamp(Math.abs(delta.w),0,1));
          const capDegrees=3+2*earlyWalkWeight;
          delta.slerp(new THREE.Quaternion(),1-settle*Math.min(1,(capDegrees*Math.PI/180)/Math.max(angle,.001)));
          const rotation=foot.getWorldQuaternion(new THREE.Quaternion()).premultiply(delta);
          foot.quaternion.copy(foot.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rotation));
          foot.updateWorldMatrix(false,true); corrected=sample(marker);
        }
      }
      // Opt-in correction for the measured early-Walk reach shortfall. Repeat
      // the same ankle target after lowering the pelvis by only that deficit.
      if(earlyWalkWeight>.001 && weight>.98 && reachDeficit>.0005*scale && pelvis) {
        const correction=Math.min(reachDeficit,.010*scale)*earlyWalkWeight;
        const p=pelvis.getWorldPosition(V());p.y-=correction;pelvis.position.copy(pelvis.parent.worldToLocal(p));root.updateMatrixWorld(true);
        solveLeg(thigh,calf,foot,desiredAnkle,pole);root.updateMatrixWorld(true);corrected=sample(marker);
        diagnostics.pelvisLoweringM+=correction;
      }
      // A second small solve removes skin-weight error at the material marker.
      if(weight>.98) {
        const residual=state.anchor.clone().sub(corrected[state.contact]); residual.y=groundHeight(corrected.toe.x,corrected.toe.z)+.002*scale-corrected.minY;
        residual.clampLength(0,.025*scale);
        solveLeg(thigh,calf,foot,foot.getWorldPosition(V()).add(residual),getKneePole?.(side)); root.updateMatrixWorld(true);
      }
      const final=sample(marker); state.weight=weight;
      // Preserve heel strike, then transfer support at flat foot. Capture the
      // already-corrected toe so the change of pivot cannot jump the ankle.
      if(state.contact==='heel'&&final.toe.y<=final.heel.y+.006*scale&&weight>.5){state.contact='toe';state.anchor.copy(final.toe);}
      diagnostics.feet[side]={weight,contact:state.contact,anchor:state.anchor.toArray(),toe:final.toe.toArray(),heel:final.heel.toArray(),minY:final.minY,correctionM:shift.length()};
    }
    // Optional anti-sink clamp (preset `groundClamp`): the support windows leave heel strike and toe-off to the captured foot, whose shoe soles then
    // sink up to ~18mm. Lift only the missing height, never push down, keeping ankle plane and foot orientation (same two-bone solve).
    if(groundClamp) {
      const gate=smooth((movingWeight-.2)/.5)*(1-actionBlend);
      if(gate>.001) for(const side of ['l','r']) {
        const marker=markers[side], thigh=bones.get(`thigh_${side}`), calf=bones.get(`calf_${side}`), foot=bones.get(`foot_${side}`);
        if(!marker||!thigh||!calf||!foot) continue;
        const raw=sample(marker), vertex=V(); let lowest=raw.minY;
        marker.mesh.skeleton?.update();
        for(const i of marker.all){marker.mesh.getVertexPosition(i,vertex);marker.mesh.localToWorld(vertex);if(vertex.y<lowest)lowest=vertex.y;}
        const deficit=groundHeight(raw.toe.x,raw.toe.z)+.001*scale-lowest;
        if(deficit<=.0005*scale) continue;
        const lift=Math.min(deficit,.035*scale)*gate;
        solveLeg(thigh,calf,foot,foot.getWorldPosition(V()).add(new THREE.Vector3(0,lift,0)),getKneePole?.(side)); root.updateMatrixWorld(true);
        diagnostics.feet[side]={...(diagnostics.feet[side]||{}),clampLiftM:lift,minY:sample(marker).minY};
      }
    }
  }
  return {setFootwear,update,reset,snapshot:()=>structuredClone(diagnostics)};
}
