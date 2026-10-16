// @ts-nocheck -- Vendored lab runtime; typed integration boundary is foreground-characters.d.mts.
const unit = value => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

// Correctives are sampled around the same normalized cycle as the animation.
// Assets without a complete cycle retain their existing deformation.
export function bindGaitCorrectives(meshes) {
  const bindings = [];
  for (const mesh of meshes) {
    if (!mesh.morphTargetInfluences) continue;
    for (const gait of ['Walk', 'Run']) {
      const prefix = `Pose_Gait_${gait}_`;
      const entries = Object.entries(mesh.morphTargetDictionary || {})
        .filter(([name]) => name.startsWith(prefix) && /^\d+$/.test(name.slice(prefix.length)))
        .map(([name, index]) => ({ key: Number(name.slice(prefix.length)), index }))
        .sort((a, b) => a.key - b.key);
      if (entries.length < 2 || entries.some((entry, index) => entry.key !== index)) continue;
      bindings.push({ values: mesh.morphTargetInfluences, indices: entries.map(entry => entry.index), gait });
    }
  }
  return ({ phase = 0, walkWeight = 0, runWeight = 0 } = {}) => {
    const cycle = Number.isFinite(phase) ? ((phase % 1) + 1) % 1 : 0;
    for (const { values, indices, gait } of bindings) {
      for (const index of indices) values[index] = 0;
      const weight = unit(gait === 'Walk' ? walkWeight : runWeight);
      if (!weight) continue;
      const sample = cycle * indices.length;
      const lower = Math.floor(sample), blend = sample - lower;
      values[indices[lower]] = weight * (1 - blend);
      values[indices[(lower + 1) % indices.length]] = weight * blend;
    }
  };
}
