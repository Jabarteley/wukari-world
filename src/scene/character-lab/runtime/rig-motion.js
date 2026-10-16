// @ts-nocheck -- Vendored lab runtime; typed integration boundary is foreground-characters.d.mts.
import * as THREE from 'three';

// Transfer captured local motion deltas onto each body's anatomical bind pose.
// Bone names/hierarchy stay compatible; bone positions need not be identical.
export function retargetBodyMotion(clips, sourceScene, targetBones) {
  const sourceBones=new Map();sourceScene.traverse(node=>{if(node.isBone)sourceBones.set(node.name,node);});
  const length=bones=>['calf_l','foot_l'].reduce((sum,name)=>sum+(bones.get(name)?.position.length()||0),0);
  const strideScale=length(targetBones)/Math.max(.001,length(sourceBones));
  const differs=[...targetBones].some(([name,bone])=>{
    const source=sourceBones.get(name);return source&&(source.position.distanceTo(bone.position)>1e-6||source.quaternion.angleTo(bone.quaternion)>1e-5);
  });
  if(!differs)return {clips,strideScale:1};
  const output=clips.map(clip=>{
    const tracks=clip.tracks.map(track=>{
      const binding=THREE.PropertyBinding.parseTrackName(track.name),source=sourceBones.get(binding.nodeName),target=targetBones.get(binding.nodeName);
      if(!source||!target)return track.clone();
      const result=track.clone(), values=result.values;
      if(binding.propertyName==='quaternion') {
        const correction=target.quaternion.clone().multiply(source.quaternion.clone().invert()), q=new THREE.Quaternion();
        for(let i=0;i<values.length;i+=4)q.fromArray(values,i).premultiply(correction).normalize().toArray(values,i);
      } else if(binding.propertyName==='position') {
        const v=new THREE.Vector3();
        for(let i=0;i<values.length;i+=3)v.fromArray(values,i).sub(source.position).multiplyScalar(strideScale).add(target.position).toArray(values,i);
      }
      return result;
    });
    return new THREE.AnimationClip(clip.name,clip.duration,tracks,clip.blendMode);
  });
  return {clips:output,strideScale};
}
