// @ts-nocheck -- Vendored lab runtime; typed integration boundary is foreground-characters.d.mts.
import * as THREE from 'three';
import { soleMarkers, solveLeg } from './foot-planting.js';

const V = () => new THREE.Vector3();

function getBone(bones, name) {
  return bones?.get?.(name) || bones?.[name];
}

function sample(marker) {
  const point = V(), toe = V(), heel = V();
  let minY = Infinity;
  marker.mesh.skeleton?.update();
  for (const index of marker.sole) {
    marker.mesh.getVertexPosition(index, point);
    marker.mesh.localToWorld(point);
    minY = Math.min(minY, point.y);
    if (marker.toeIds.has(index)) toe.add(point);
    if (marker.heelIds.has(index)) heel.add(point);
  }
  toe.multiplyScalar(1 / marker.toe.length);
  heel.multiplyScalar(1 / marker.heel.length);
  return { toe, heel, center: toe.clone().add(heel).multiplyScalar(.5), minY };
}

/**
 * Post-skinning floor contact for seated actions. The helper only lifts a
 * penetrating foot through the existing two-bone leg solve. Its correction
 * state survives Sit -> StandUp (including a reversed Sit interruption), but
 * resets as soon as the actor leaves the seated action family.
 */
export function createSeatedContact({
  root,
  bones,
  groundHeight = () => root.position.y,
  smoothing = 24,
  maximumLiftM = .025,
}) {
  let markers = {};
  let active = false;
  let diagnostics = { enabled: false, reason: 'not_started', feet: {} };
  const feet = { l: { entryWeight: 0, engaged: false }, r: { entryWeight: 0, engaged: false } };

  function reset(reason = 'reset') {
    active = false;
    for (const state of Object.values(feet)) { state.entryWeight = 0; state.engaged = false; }
    diagnostics = { enabled: false, reason, feet: {} };
  }

  function setFootwear(meshes) {
    markers = {};
    for (const mesh of meshes || []) if (mesh.isSkinnedMesh) Object.assign(markers, soleMarkers(mesh));
    reset('footwear_changed');
  }

  function update({ dt = 0, phase, weight = 1, enabled = true }) {
    const seated = phase === 'sit' || phase === 'standup';
    if (!enabled || !seated) {
      reset(!enabled ? 'disabled' : 'not_seated');
      return structuredClone(diagnostics);
    }
    active = true;
    root.updateMatrixWorld(true);
    const scale = Math.abs(root.getWorldScale(new THREE.Vector3()).y) || 1;
    const actionWeight = THREE.MathUtils.clamp(Number(weight) || 0, 0, 1);
    const step = Math.max(0, Number(dt) || 0);
    diagnostics = { enabled: true, phase, weight: actionWeight, feet: {} };

    for (const side of ['l', 'r']) {
      const marker = markers[side];
      const thigh = getBone(bones, `thigh_${side}`);
      const calf = getBone(bones, `calf_${side}`);
      const foot = getBone(bones, `foot_${side}`);
      if (!marker || !thigh || !calf || !foot) {
        diagnostics.feet[side] = { corrected: false, reason: 'missing_marker_or_bone' };
        continue;
      }

      const before = sample(marker);
      const ground = groundHeight(before.center.x, before.center.z);
      const deficit = Math.max(0, ground - before.minY);
      const state = feet[side];
      if (deficit > 1e-7 * scale) state.engaged = true;
      if (state.engaged) state.entryWeight = step > 0
        ? THREE.MathUtils.damp(state.entryWeight, 1, smoothing, step)
        : 1;
      // Smooth only the first engagement. Once established, follow the actual
      // post-skinning deficit directly so a changing or reversed Sit pose does
      // not lag below the floor.
      const requested = Math.min(deficit, maximumLiftM * scale) * state.entryWeight * actionWeight;
      const ankleBefore = foot.getWorldPosition(V());

      if (requested > 1e-8 * scale) {
        solveLeg(thigh, calf, foot, ankleBefore.clone().add(new THREE.Vector3(0, requested, 0)));
        root.updateMatrixWorld(true);
        // Once the smooth correction is settled, absorb the small residual
        // introduced by post-skinning shoe weights without moving the pelvis.
        if (state.entryWeight * actionWeight >= .999) {
          const first = sample(marker);
          const residual = Math.max(0, groundHeight(first.center.x, first.center.z) - first.minY);
          if (residual > 1e-7 * scale) {
            const ankle = foot.getWorldPosition(V());
            solveLeg(thigh, calf, foot, ankle.add(new THREE.Vector3(0, Math.min(residual, .005 * scale), 0)));
            root.updateMatrixWorld(true);
          }
        }
      }

      const after = sample(marker);
      diagnostics.feet[side] = {
        corrected: requested > 1e-8 * scale,
        rawMinY: before.minY,
        finalMinY: after.minY,
        groundY: ground,
        rawDeficitM: deficit,
        entryWeight: state.entryWeight,
        smoothedCorrectionM: requested,
        requestedLiftM: requested,
        appliedAnkleLiftM: foot.getWorldPosition(V()).y - ankleBefore.y,
      };
    }
    return structuredClone(diagnostics);
  }

  return {
    setFootwear,
    update,
    reset,
    snapshot: () => structuredClone(diagnostics),
    isActive: () => active,
  };
}
