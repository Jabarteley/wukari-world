// @ts-nocheck -- Vendored lab runtime; typed integration boundary is foreground-characters.d.mts.
import * as THREE from 'three';

// The garment corrective follows the rendered pose, including interrupted sit
// transitions. The action gate keeps other bent-leg activities independent.
export function createSeatedDrape(root, bones) {
  const thighs = ['l', 'r'].map(side => [bones.get(`thigh_${side}`), bones.get(`calf_${side}`)]);
  const direction = ([thigh, calf]) => {
    if (!thigh || !calf) return null;
    return calf.getWorldPosition(new THREE.Vector3()).sub(thigh.getWorldPosition(new THREE.Vector3()))
      .normalize().applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion()).invert());
  };
  root.updateMatrixWorld(true);
  const rest = thighs.map(direction);
  let last = { influence: 0, flexionDegrees: 0 };
  return {
    influence(active) {
      if (!active || rest.some(value => !value)) { last = { influence: 0, flexionDegrees: 0 }; return 0; }
      root.updateMatrixWorld(true);
      const flexionDegrees = thighs.reduce((sum, pair, index) => sum + direction(pair).angleTo(rest[index]), 0) * 90 / Math.PI;
      const influence = THREE.MathUtils.smoothstep(flexionDegrees, 40, 72);
      last = { influence, flexionDegrees };
      return influence;
    },
    snapshot: () => ({ ...last })
  };
}

// Cache bindings when clothing or appearance changes. Body-pose combinations
// reuse the fitted body influence, including the muscle driver's contributions.
export function bindSeatedCorrectives(meshes) {
  const bindings = [];
  for (const mesh of meshes) {
    const dictionary = mesh.morphTargetDictionary || {};
    const values = mesh.morphTargetInfluences;
    for (const [name, index] of Object.entries(dictionary)) {
      if (name === 'Pose_Sit') bindings.push({ values, index, bodyIndex: null });
      else if (name.startsWith('Pose_Sit_Body_')) {
        const bodyIndex = dictionary[name.slice('Pose_Sit_'.length)];
        if (bodyIndex !== undefined) bindings.push({ values, index, bodyIndex });
      }
    }
  }
  return influence => {
    for (const { values, index, bodyIndex } of bindings) {
      values[index] = influence * (bodyIndex === null ? 1 : values[bodyIndex]);
    }
  };
}
