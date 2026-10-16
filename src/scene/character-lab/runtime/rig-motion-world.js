// @ts-nocheck -- Vendored lab runtime; typed integration boundary is foreground-characters.d.mts.
import * as THREE from 'three';
import { retargetBodyMotion } from './rig-motion.js';

const gaitNames = new Set(['Walk_InPlace', 'Run_InPlace']);
const Q = () => new THREE.Quaternion();

// Experimental gait transfer. Work in rig space, excluding actor heading and
// scale, then convert each desired world orientation through its posed parent.
export function retargetBodyMotionWorld(clips, sourceScene, targetBones) {
  const started = performance.now();
  const fallback = retargetBodyMotion(clips, sourceScene, targetBones);
  const sourceBones = new Map();
  sourceScene.traverse(node => { if (node.isBone) sourceBones.set(node.name, node); });
  if (sourceBones.size !== targetBones.size || [...targetBones].some(([name, bone]) =>
    !sourceBones.has(name) || (bone.parent?.isBone && sourceBones.get(name).parent?.name !== bone.parent.name)
  )) throw new Error('World gait transfer requires the same named bone hierarchy.');
  function bindWorld(bones) {
    const world = new Map();
    for (const [name, bone] of bones) {
      const parent = world.get(bone.parent?.name) || Q();
      world.set(name, parent.clone().multiply(bone.quaternion).normalize());
    }
    return world;
  }
  const sourceBind = bindWorld(sourceBones), targetBind = bindWorld(targetBones);
  const offsets = new Map([...targetBones].filter(([name]) => sourceBind.has(name)).map(([name]) => [
    name, sourceBind.get(name).clone().invert().multiply(targetBind.get(name))
  ]));
  if ([...offsets.values()].every(offset => offset.angleTo(Q()) < 1e-7)) {
    return {...fallback, method:'world-identical-bind', bakeMs:performance.now() - started};
  }
  const output = clips.map((clip, index) => {
    if (!gaitNames.has(clip.name)) return fallback.clips[index];
    // Desired world orientation is S_anim * inverse(S_bind) * T_bind.
    // Expanding its posed parent cancels S_parent_anim, leaving two constant
    // bind-frame factors around the source LOCAL quaternion. Quaternion slerp
    // commutes with those factors, so the original times/interpolation remain.
    const tracks = fallback.clips[index].tracks.map((baseline, trackIndex) => {
      const track = clip.tracks[trackIndex];
      const binding = THREE.PropertyBinding.parseTrackName(track.name);
      if (binding.propertyName !== 'quaternion' || !offsets.has(binding.nodeName)) return baseline;
      const bone = targetBones.get(binding.nodeName), parent = bone.parent?.name;
      const left = targetBind.has(parent)
        ? targetBind.get(parent).clone().invert().multiply(sourceBind.get(parent)) : Q();
      const right = offsets.get(binding.nodeName), result = track.clone(), q = Q();
      for (let i=0; i<result.values.length; i+=4) {
        q.fromArray(track.values,i).premultiply(left).multiply(right).normalize().toArray(result.values,i);
      }
      return result;
    });
    return new THREE.AnimationClip(clip.name, clip.duration, tracks, clip.blendMode);
  });
  return {...fallback, clips:output, method:'world-gaits-analytic', bakeMs:performance.now() - started};
}
