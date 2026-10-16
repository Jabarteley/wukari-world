// @ts-nocheck -- Vendored lab runtime; typed integration boundary is foreground-characters.d.mts.
import * as THREE from 'three';
import { soleMarkers, solveLeg } from './foot-planting.js';

const V = () => new THREE.Vector3();
const smooth = value => {
  const x = THREE.MathUtils.clamp(value, 0, 1);
  return x * x * (3 - 2 * x);
};

function markerSample(marker) {
  const vertex = V(), toe = V(), heel = V();
  let minY = Infinity;
  marker.mesh.skeleton?.update();
  for (const index of marker.sole) {
    marker.mesh.getVertexPosition(index, vertex);
    marker.mesh.localToWorld(vertex);
    minY = Math.min(minY, vertex.y);
    if (marker.toeIds.has(index)) toe.add(vertex);
    if (marker.heelIds.has(index)) heel.add(vertex);
  }
  toe.multiplyScalar(1 / marker.toe.length);
  heel.multiplyScalar(1 / marker.heel.length);
  return { toe, heel, center: toe.clone().add(heel).multiplyScalar(.5), minY };
}

function getBone(bones, name) {
  return bones?.get?.(name) || bones?.[name];
}

function sideWindows(supportWindows, side) {
  return supportWindows?.[side] || supportWindows?.[side === 'l' ? 'left' : 'right'] || [];
}

function resolvedWindows(supportWindows, side, duration) {
  const windows = sideWindows(supportWindows, side).map(window => [...window]);
  const maximum = Math.max(0, ...windows.flat());
  const scale = maximum > duration + 1e-5 ? duration / maximum : 1;
  return windows.map(([start, end]) => [start * scale, end * scale]);
}

function activeWindow(windows, time) {
  return windows.findIndex(([start, end]) => time >= start - 1e-7 && time <= end + 1e-7);
}

function envelope(time, [start, end], duration, holdUntilStep = false) {
  const feather = Math.min(.09, Math.max(.035, (end - start) * .18));
  // First and last clip boundaries must remain the exact authored endpoint.
  // The captured anchor makes the correction zero at entry in the ordinary
  // case; this ramp also prevents a penetrating or unreachable pose jumping.
  const enter = smooth((time - start) / feather);
  const leave = holdUntilStep ? 1 : smooth((end - time) / feather);
  return enter * leave * (start <= 1e-7 ? smooth(time / feather) : 1)
    * (end >= duration - 1e-7 ? smooth((duration - time) / feather) : 1);
}

/**
 * Post-mixer support for one-shot actions with authored per-foot windows.
 * Call begin() while the held source pose is still visible, then update()
 * immediately after AnimationMixer.update() on each StandUp frame.
 */
export function createActionSupport({ root, bones, groundHeight = () => root.position.y, supportWindows = {}, stepWindows = {} }) {
  let markers = {}, started = false, lastTime = null, activeDuration = null;
  let diagnostics = { enabled: false, reason: 'not_started', feet: {} };
  const feet = {
    l: { window: -1, anchor: null, contact: null, clearance: 0, rotation: null },
    r: { window: -1, anchor: null, contact: null, clearance: 0, rotation: null },
  };

  function clearFeet() {
    for (const state of Object.values(feet)) {
      state.window = -1;
      state.anchor = null;
      state.contact = null;
      state.clearance = 0;
      state.rotation = null;
      state.swing = state.lastRaw = state.lastSolved = state.lastRawRotation = state.lastSolvedRotation = null;
    }
  }

  function reset() {
    started = false;
    lastTime = null;
    activeDuration = null;
    clearFeet();
    diagnostics = { enabled: false, reason: 'reset', feet: {} };
  }

  function setFootwear(meshes) {
    markers = {};
    for (const mesh of meshes || []) {
      if (mesh.isSkinnedMesh) Object.assign(markers, soleMarkers(mesh));
    }
    reset();
  }

  function capture(side, window, raw, foot) {
    const state = feet[side];
    const scale = Math.abs(root.getWorldScale(new THREE.Vector3()).y) || 1;
    const ground = groundHeight(raw.center.x, raw.center.z);
    const toeDelta = raw.toe.y - raw.minY;
    const heelDelta = raw.heel.y - raw.minY;
    state.contact = Math.abs(toeDelta - heelDelta) <= .004 * scale
      ? 'center' : toeDelta < heelDelta ? 'toe' : 'heel';
    state.clearance = Math.max(0, raw.minY - ground);
    state.anchor = raw[state.contact].clone();
    // Retain an existing elevated pose, while asking a penetrating sole to
    // approach the surface through the normal entry envelope.
    state.anchor.y += ground + state.clearance - raw.minY;
    state.rotation = foot.getWorldQuaternion(new THREE.Quaternion());
    state.window = window;
  }

  function begin() {
    root.updateMatrixWorld(true);
    clearFeet();
    const captured = {};
    for (const side of ['l', 'r']) {
      const marker = markers[side];
      if (!marker) continue;
      const raw = markerSample(marker), foot = getBone(bones, `foot_${side}`);
      if (foot && Math.abs(sideWindows(supportWindows, side)[0]?.[0] || 0) < 1e-7) capture(side, 0, raw, foot);
      captured[side] = {
        toe: raw.toe.toArray(), heel: raw.heel.toArray(), minY: raw.minY,
        groundY: groundHeight(raw.center.x, raw.center.z),
        contact: feet[side].contact,
        anchor: feet[side].anchor?.toArray(),
      };
    }
    started = true;
    lastTime = null;
    activeDuration = null;
    diagnostics = { enabled: true, phase: 'captured', captured, feet: {} };
    return structuredClone(diagnostics);
  }

  function update({ time, duration, weight = 1 }) {
    const clipTime = THREE.MathUtils.clamp(Number(time) || 0, 0, Math.max(0, Number(duration) || 0));
    const clipDuration = Math.max(1e-6, Number(duration) || 0);
    root.updateMatrixWorld(true);
    if (!started) {
      diagnostics = { enabled: false, reason: 'begin_required', time: clipTime, feet: {} };
      return structuredClone(diagnostics);
    }
    if ((lastTime !== null && clipTime + 1e-6 < lastTime)
      || (activeDuration !== null && Math.abs(activeDuration - clipDuration) > 1e-6)) {
      reset();
      diagnostics = { enabled: false, reason: 'timeline_changed', time: clipTime, feet: {} };
      return structuredClone(diagnostics);
    }
    lastTime = clipTime;
    activeDuration = clipDuration;
    const actionWeight = THREE.MathUtils.clamp(Number(weight) || 0, 0, 1);
    diagnostics = { enabled: true, time: clipTime, duration: clipDuration, weight: actionWeight, feet: {} };

    for (const side of ['l', 'r']) {
      const marker = markers[side], thigh = getBone(bones, `thigh_${side}`);
      const calf = getBone(bones, `calf_${side}`), foot = getBone(bones, `foot_${side}`);
      if (!marker || !thigh || !calf || !foot) {
        diagnostics.feet[side] = { supported: false, reason: 'missing_marker_or_bone' };
        continue;
      }
      const windows = resolvedWindows(supportWindows, side, clipDuration);
      const window = activeWindow(windows, clipTime);
      let raw = markerSample(marker);
      const state = feet[side];
      const rawAnkle = foot.getWorldPosition(V()), rawRotation = foot.getWorldQuaternion(new THREE.Quaternion());
      const steps = sideWindows(stepWindows, side), step = activeWindow(steps, clipTime);
      const remember = () => { state.lastRaw = rawAnkle; state.lastSolved = foot.getWorldPosition(V()); state.lastRawRotation = rawRotation; state.lastSolvedRotation = foot.getWorldQuaternion(new THREE.Quaternion()); };
      if (window < 0 && step >= 0 && actionWeight > 0) {
        if (state.swing?.index !== step) state.swing = {
          index: step,
          offset: state.lastSolved && state.lastRaw ? state.lastSolved.clone().sub(state.lastRaw) : V(),
          rotation: state.lastSolvedRotation && state.lastRawRotation ? state.lastSolvedRotation.clone().multiply(state.lastRawRotation.clone().invert()) : new THREE.Quaternion()
        };
        const [start, end] = steps[step], retained = 1 - smooth((clipTime - start) / Math.max(.001, end - start));
        const delta = new THREE.Quaternion().slerp(state.swing.rotation, retained * actionWeight);
        const orientation = rawRotation.clone().premultiply(delta);
        foot.quaternion.copy(foot.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(orientation));
        foot.updateWorldMatrix(false, true);
        const target = rawAnkle.clone().addScaledVector(state.swing.offset, retained * actionWeight);
        solveLeg(thigh, calf, foot, target, new THREE.Vector3(0, 0, 1).applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion())));
        root.updateMatrixWorld(true);
        const final = markerSample(marker); remember();
        diagnostics.feet[side] = { supported: false, stepping: true, step, retainedOffsetM: state.swing.offset.length() * retained, minY: final.minY, toe: final.toe.toArray(), heel: final.heel.toArray() };
        continue;
      }
      state.swing = null;
      if (window < 0 || actionWeight <= 0) {
        state.window = -1;
        state.anchor = null;
        diagnostics.feet[side] = { supported: false, minY: raw.minY, window };
        remember();
        continue;
      }
      if (state.window !== window || !state.anchor) capture(side, window, raw, foot);
      const holdUntilStep = steps.some(([start]) => Math.abs(start - windows[window][1]) < 1e-5);
      const supportWeight = envelope(clipTime, windows[window], clipDuration, holdUntilStep) * actionWeight;
      // Hold the captured planted-foot orientation only while support is
      // strong. This keeps a rotating toe/heel from cutting through the floor,
      // while the envelope restores the authored orientation at both ends.
      if (state.rotation && supportWeight > 0) {
        const world = foot.getWorldQuaternion(new THREE.Quaternion()).slerp(state.rotation, supportWeight);
        foot.quaternion.copy(foot.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));
        foot.updateWorldMatrix(false, true);
        raw = markerSample(marker);
      }
      const contact = raw[state.contact];
      const requested = state.anchor.clone().sub(contact).multiplyScalar(supportWeight);
      if (supportWeight < 1e-5) {
        diagnostics.feet[side] = {
          supported: true, window, supportWeight, contact: state.contact,
          anchor: state.anchor.toArray(), toe: raw.toe.toArray(), heel: raw.heel.toArray(),
          minY: raw.minY, capturedClearanceM: state.clearance,
          requestedCorrectionM: 0, appliedCorrectionM: 0,
          residualM: state.anchor.distanceTo(raw[state.contact]), reachLimited: false,
        };
        remember();
        continue;
      }
      const ankle = foot.getWorldPosition(V()), hip = thigh.getWorldPosition(V()), knee = calf.getWorldPosition(V());
      const upper = hip.distanceTo(knee), lower = knee.distanceTo(ankle);
      const maximumReach = upper + lower - .003 * (Math.abs(root.getWorldScale(new THREE.Vector3()).y) || 1);
      const desired = ankle.clone().add(requested);
      const hipToDesired = desired.clone().sub(hip);
      let reachLimited = false;
      if (hipToDesired.length() > maximumReach) {
        desired.copy(hip).add(hipToDesired.setLength(maximumReach));
        reachLimited = true;
      }
      const maximumCorrection = .12 * (Math.abs(root.getWorldScale(new THREE.Vector3()).y) || 1);
      const applied = desired.sub(ankle).clampLength(0, maximumCorrection);
      if (applied.lengthSq() > 1e-12) {
        solveLeg(thigh, calf, foot, ankle.clone().add(applied));
        root.updateMatrixWorld(true);
      }
      let final = markerSample(marker);
      if (supportWeight > .2) {
        const residualCorrection = state.anchor.clone().sub(final[state.contact]);
        residualCorrection.y = groundHeight(final.center.x, final.center.z) + state.clearance - final.minY;
        residualCorrection.clampLength(0, .025 * (Math.abs(root.getWorldScale(new THREE.Vector3()).y) || 1));
        residualCorrection.multiplyScalar(smooth((supportWeight - .2) / .8));
        const secondAnkle = foot.getWorldPosition(V());
        const secondDesired = secondAnkle.clone().add(residualCorrection);
        if (secondDesired.distanceTo(hip) <= maximumReach && residualCorrection.lengthSq() > 1e-12) {
          solveLeg(thigh, calf, foot, secondDesired);
          root.updateMatrixWorld(true);
          final = markerSample(marker);
        }
      }
      const residual = state.anchor.distanceTo(final[state.contact]);
      remember();
      diagnostics.feet[side] = {
        supported: true,
        window,
        supportWeight,
        contact: state.contact,
        anchor: state.anchor.toArray(),
        toe: final.toe.toArray(),
        heel: final.heel.toArray(),
        minY: final.minY,
        capturedClearanceM: state.clearance,
        requestedCorrectionM: requested.length(),
        appliedCorrectionM: applied.length(),
        residualM: residual,
        reachLimited,
      };
    }
    return structuredClone(diagnostics);
  }

  return { setFootwear, begin, update, reset, snapshot: () => structuredClone(diagnostics) };
}
