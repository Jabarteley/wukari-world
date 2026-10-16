// @ts-nocheck -- Vendored lab runtime; typed integration boundary is foreground-characters.d.mts.
import * as THREE from 'three';
import { solveLeg } from './foot-planting.js';

const V = () => new THREE.Vector3();
const Q = () => new THREE.Quaternion();
const smooth = value => {
  value = THREE.MathUtils.clamp(value, 0, 1);
  return value * value * (3 - 2 * value);
};

function project(direction, axis) {
  return direction.clone().addScaledVector(axis, -direction.dot(axis));
}

function normalizedBlend(from, to, amount) {
  const result = from.clone().lerp(to, THREE.MathUtils.clamp(amount, 0, 1));
  return result.lengthSq() > 1e-10 ? result.normalize() : to.clone().normalize();
}

function signedAngle(from, to, axis) {
  return Math.atan2(axis.dot(V().crossVectors(from, to)), THREE.MathUtils.clamp(from.dot(to), -1, 1));
}

function clampAroundForward(direction, forward, axis, limit) {
  const angle = THREE.MathUtils.clamp(signedAngle(forward, direction, axis), -limit, limit);
  return forward.clone().applyQuaternion(Q().setFromAxisAngle(axis, angle)).normalize();
}

function rotationDifference(left, right) {
  const direct = Math.max(Math.abs(left.x-right.x), Math.abs(left.y-right.y), Math.abs(left.z-right.z), Math.abs(left.w-right.w));
  const negated = Math.max(Math.abs(left.x+right.x), Math.abs(left.y+right.y), Math.abs(left.z+right.z), Math.abs(left.w+right.w));
  if (Math.min(direct, negated) < 1e-12) return 0;
  return 2 * Math.acos(THREE.MathUtils.clamp(Math.abs(left.clone().normalize().dot(right.clone().normalize())), 0, 1));
}

export function createKneeAlignment({ root, bones, footRelative = false, limitDegrees = 8, footHeadingLimitDegrees = 20 }) {
  root.updateMatrixWorld(true);
  const footAxes = new Map(['l', 'r'].map(side => [side, new THREE.Vector3(0, 0, 1).applyQuaternion(root.getWorldQuaternion(Q())).applyQuaternion(bones.get(`foot_${side}`).getWorldQuaternion(Q()).invert())]));
  const limit = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(limitDegrees, 0, 30));
  const headingLimit = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(footHeadingLimitDegrees, 0, 30));
  const states = { l: { pole: null, axis: null }, r: { pole: null, axis: null } };
  let activeWeight = 0;
  let diagnostics = { activeWeight: 0, sides: {} };

  function leg(side) {
    return {
      thigh: bones.get(`thigh_${side}`),
      calf: bones.get(`calf_${side}`),
      foot: bones.get(`foot_${side}`)
    };
  }

  function measured(side) {
    const { thigh, calf, foot } = leg(side);
    if (!thigh || !calf || !foot) return null;
    const hip = thigh.getWorldPosition(V()), knee = calf.getWorldPosition(V()), ankle = foot.getWorldPosition(V());
    const axisVector = ankle.clone().sub(hip), upper = hip.distanceTo(knee);
    if (axisVector.lengthSq() < 1e-10 || upper < 1e-5) return null;
    const axis = axisVector.normalize();
    const captured = project(knee.clone().sub(hip), axis);
    const kneeAngle = Math.acos(THREE.MathUtils.clamp(
      hip.clone().sub(knee).normalize().dot(ankle.clone().sub(knee).normalize()), -1, 1
    ));
    return {
      hip, knee, ankle, axis, upper, captured,
      flexion: Math.PI - kneeAngle,
      poleRatio: captured.length() / upper
    };
  }

  function desiredPole(side, sample) {
    const state = states[side];
    const rootForward = new THREE.Vector3(0, 0, 1).applyQuaternion(root.getWorldQuaternion(Q()));
    let bendForward = rootForward;
    if (footRelative) {
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(root.getWorldQuaternion(Q()));
      const footForward = footAxes.get(side).clone().applyQuaternion(bones.get(`foot_${side}`).getWorldQuaternion(Q()));
      const horizontal = project(footForward, up), length = horizontal.length();
      if (length > 1e-6) {
        horizontal.normalize();
        const confidence = smooth((footForward.dot(rootForward) - .1) / .5) * smooth((length - .25) / .4);
        const yaw = THREE.MathUtils.clamp(signedAngle(rootForward, horizontal, up), -headingLimit, headingLimit);
        bendForward = rootForward.clone().applyQuaternion(Q().setFromAxisAngle(up, yaw * confidence));
      }
    }
    let forward = project(bendForward, sample.axis);
    if (forward.lengthSq() < 1e-8) {
      const rootRight = new THREE.Vector3(1, 0, 0).applyQuaternion(root.getWorldQuaternion(Q()));
      forward = project(rootRight, sample.axis);
    }
    forward.normalize();

    let captured = sample.captured.lengthSq() > 1e-10 ? sample.captured.clone().normalize() : null;
    const capturedClamped = captured ? clampAroundForward(captured, forward, sample.axis, limit) : forward.clone();
    let transported = null;
    if (state.pole && state.axis) {
      transported = state.pole.clone().applyQuaternion(Q().setFromUnitVectors(state.axis, sample.axis));
      transported = project(transported, sample.axis);
      if (transported.lengthSq() > 1e-10) transported = clampAroundForward(transported.normalize(), forward, sample.axis, limit);
      else transported = null;
    }

    const flexReliability = smooth((THREE.MathUtils.radToDeg(sample.flexion) - 4) / 8);
    const poleReliability = smooth((sample.poleRatio - .015) / .035);
    const reliability = flexReliability * poleReliability;
    const fallback = transported ? normalizedBlend(transported, forward, .2) : forward;
    return {
      pole: normalizedBlend(fallback, capturedClamped, reliability),
      captured,
      forward,
      reliability,
      usedFallback: reliability < .999
    };
  }

  function getPole(side) {
    if (activeWeight < .001 || !states[side]) return null;
    root.updateMatrixWorld(true);
    const sample = measured(side);
    if (!sample) return null;
    const desired = desiredPole(side, sample);
    const captured = desired.captured || desired.pole;
    const pole = normalizedBlend(captured, desired.pole, activeWeight);
    states[side].pole = pole.clone();
    states[side].axis = sample.axis.clone();
    return pole;
  }

  function update({ movingWeight = 0, actionBlend = 0 } = {}) {
    activeWeight = smooth(movingWeight) * (1 - smooth(actionBlend));
    diagnostics = { activeWeight, sides: {} };
    if (activeWeight < .001) {
      if (actionBlend > .999 || movingWeight < .001) reset();
      return;
    }
    root.updateMatrixWorld(true);
    for (const side of ['l', 'r']) {
      const sample = measured(side), bonesForLeg = leg(side);
      if (!sample || !bonesForLeg.thigh || !bonesForLeg.calf || !bonesForLeg.foot) continue;
      const desired = desiredPole(side, sample), captured = desired.captured || desired.pole;
      const pole = normalizedBlend(captured, desired.pole, activeWeight);
      const ankleBefore = sample.ankle.clone();
      const rotationBefore = bonesForLeg.foot.getWorldQuaternion(Q());
      solveLeg(bonesForLeg.thigh, bonesForLeg.calf, bonesForLeg.foot, ankleBefore, pole);
      root.updateMatrixWorld(true);
      const after = measured(side), rotationAfter = bonesForLeg.foot.getWorldQuaternion(Q());
      const actualPole = after?.captured.lengthSq() > 1e-10 ? after.captured.clone().normalize() : pole;
      states[side].pole = actualPole;
      states[side].axis = after?.axis.clone() || sample.axis.clone();
      diagnostics.sides[side] = {
        flexionDeg: THREE.MathUtils.radToDeg(sample.flexion),
        poleRatio: sample.poleRatio,
        capturedAngleDeg: THREE.MathUtils.radToDeg(signedAngle(desired.forward, captured, sample.axis)),
        appliedAngleDeg: THREE.MathUtils.radToDeg(signedAngle(desired.forward, actualPole, states[side].axis)),
        reliability: desired.reliability,
        usedFallback: desired.usedFallback,
        ankleDriftM: after ? after.ankle.distanceTo(ankleBefore) : 0,
        footRotationDriftDeg: THREE.MathUtils.radToDeg(rotationDifference(rotationBefore, rotationAfter))
      };
    }
  }

  function reset() {
    activeWeight = 0;
    for (const state of Object.values(states)) { state.pole = null; state.axis = null; }
    diagnostics = { activeWeight: 0, sides: {} };
  }

  return { update, getPole, reset, snapshot: () => structuredClone(diagnostics) };
}
