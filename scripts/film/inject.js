// Capture-only page script (nothing here ships with the game). Injected before any game code by film.ts.
// 1. A virtual clock: performance.now, Date, requestAnimationFrame, setTimeout/setInterval all run on one clock that
//    follows real time until __film.freeze(), then only moves when __film.step(dt) is called.
// 2. A three.js observer (three announces every renderer and scene through __THREE_DEVTOOLS__): the biggest visible
//    renderer's camera is overridden just before each draw, and one extra draw is forced if the game did not draw.
(() => {
  if (window.__film) return;
  const RN = performance.now.bind(performance), RD = Date.now.bind(Date), RAF = window.requestAnimationFrame.bind(window);
  const RST = window.setTimeout.bind(window), RCT = window.clearTimeout.bind(window);
  const RDate = Date;
  const F = window.__film = { frozen: false, vt: 0, offset: 0, dateBase: RD() - RN(), rafQ: [], timers: [], nextId: 1, renders: 0, stepRenders: 0, cams: new Map(), scenes: [], cam: null, grade: null, log: [] };
  const vnow = () => F.frozen ? F.vt : RN() - F.offset;
  F.now = vnow;
  // ---- clock
  performance.now = () => vnow();
  const dateNow = () => Math.round(F.dateBase + vnow());
  class FDate extends RDate { constructor(...a) { if (a.length === 0) super(dateNow()); else super(...a); } static now() { return dateNow(); } }
  window.Date = FDate;
  let rafId = 1;
  window.requestAnimationFrame = (cb) => { const id = rafId++; F.rafQ.push({ id, cb }); return id; };
  window.cancelAnimationFrame = (id) => { F.rafQ = F.rafQ.filter((r) => r.id !== id); };
  const addTimer = (cb, ms, args, every) => { const id = F.nextId++; F.timers.push({ id, cb, args, due: vnow() + Math.max(0, Number(ms) || 0), every: every ? Math.max(1, Number(ms) || 1) : 0 }); return id; };
  window.setTimeout = (cb, ms, ...args) => typeof cb === 'function' ? addTimer(cb, ms, args, false) : RST(cb, ms, ...args);
  window.setInterval = (cb, ms, ...args) => addTimer(cb, ms, args, true);
  window.clearTimeout = window.clearInterval = (id) => { F.timers = F.timers.filter((t) => t.id !== id); };
  const runTimers = () => {
    for (let guard = 0; guard < 5000; guard++) {
      const t = vnow(); let best = null;
      for (const x of F.timers) if (x.due <= t && (!best || x.due < best.due)) best = x;
      if (!best) return;
      if (best.every) best.due += best.every; else F.timers = F.timers.filter((x) => x !== best);
      try { best.cb(...best.args); } catch (e) { console.error('timer', e); }
    }
  };
  const flushRaf = () => {
    const q = F.rafQ; F.rafQ = []; const t = vnow();
    for (const r of q) { try { r.cb(t); } catch (e) { console.error('raf', e); } }
  };
  const pump = () => { if (!F.frozen) { runTimers(); flushRaf(); } RAF(pump); };
  RAF(pump);
  const tick = () => { if (!F.frozen) runTimers(); RST(tick, 4); }; RST(tick, 4);
  F.freeze = () => { if (F.frozen) return; F.vt = RN() - F.offset; F.frozen = true; };
  F.unfreeze = () => { if (!F.frozen) return; F.offset = RN() - F.vt; F.frozen = false; };
  // ---- the game's own draw
  const isBig = (r) => { const c = r.domElement; return c && c.isConnected && c.width >= 300 && c.height >= 300 && c.offsetParent !== null; };
  F.primary = () => { let best = null, area = 0; for (const [r] of F.cams) { if (!isBig(r)) continue; const a = r.domElement.width * r.domElement.height; if (a >= area) { area = a; best = r; } } return best; };
  const hook = new EventTarget();
  hook.addEventListener('observe', (e) => {
    const o = e.detail;
    if (o && o.isWebGLRenderer && !o.__filmPatched) {
      o.__filmPatched = true; const orig = o.render.bind(o); o.__origRender = orig;
      o.render = (scene, camera) => {
        F.cams.set(o, { scene, camera });
        const primary = F.primary() === o;
        if (primary && F.deferring) return;
        if (primary && F.cam && camera.isPerspectiveCamera) F.applyCam(camera, scene, o);
        F.renders++; F.stepRenders++;
        return orig(scene, camera);
      };
    } else if (o && o.isScene) F.scenes.push(new WeakRef(o));
  });
  window.__THREE_DEVTOOLS__ = hook;
  F.applyCam = (camera, scene, renderer) => {
    const c = F.cam; if (!c) return;
    if (typeof c === 'function') { c(camera, scene, renderer); return; }
    camera.clearViewOffset?.(); camera.zoom = 1;
    if (c.fov) camera.fov = c.fov;
    camera.position.set(c.pos[0], c.pos[1], c.pos[2]); camera.up.set(0, 1, 0); camera.lookAt(c.look[0], c.look[1], c.look[2]);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  };
  F.drawNow = () => { const r = F.primary(); if (!r) return false; const e = F.cams.get(r); r.render(e.scene, e.camera); return true; };
  // One 1/30 s frame, as `sub` equal slices of the virtual clock; guarantees exactly >= 1 draw with the current camera.
  F.step = (dt, sub = 1) => {
    F.stepRenders = 0; F.deferring = true;
    try { for (let i = 0; i < sub; i++) { F.vt += (dt * 1000) / sub; runTimers(); flushRaf(); } } finally { F.deferring = false; }
    F.updateRig(dt);
    F.drawNow();
    return F.avatarInfo();
  };
  // ---- the player's figure: the procedural group (hidden when the skinned body stands in) keeps the true place and heading
  F.findAvatar = () => {
    if (F._av && F._av.parent) return F._av;
    const r = F.primary(); const e = r && F.cams.get(r); if (!e) return null;
    let found = null; e.scene.traverse((o) => { if (!found && o.userData && o.userData.parts && o.userData.bends) found = o; });
    F._av = found; return found;
  };
  const V = () => ({ x: 0, y: 0, z: 0 });
  F.avatarInfo = () => {
    const a = F.findAvatar(); if (!a) return null;
    const p = a.getWorldPosition(new (a.position.constructor)()); const q = a.getWorldQuaternion(new (a.quaternion.constructor)());
    const f = new (a.position.constructor)(0, 0, 1).applyQuaternion(q);
    return { x: p.x, y: p.y, z: p.z, ry: Math.atan2(f.x, f.z) };
  };
  // ---- the rig: a camera defined relative to a subject (the figure, or a fixed point), with smoothing.
  //  spec: { anchor: 'avatar' | [x,y,z], yaw (deg, 0 = straight behind the heading), pitch (deg above horizon), dist, look: [dx,dy,dz] (subject-relative,
  //          in heading frame), lat (sideways shift, metres), fov, headingSmooth (1/s, 0 = locked to world), lag (s, anchor smoothing), world: true (yaw is absolute) }
  F.rig = null; F.rs = { init: false, hd: 0, ax: 0, ay: 0, az: 0 };
  F.setRig = (spec) => { F.rig = spec; if (!spec) F.cam = null; };
  const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  F.updateRig = (dt) => {
    const sp = F.rig; if (!sp) return;
    const st = F.rs; let ax, ay, az, hd;
    if (sp.anchor === 'avatar' || !sp.anchor) { const a = F.avatarInfo(); if (!a) return; ax = a.x; ay = a.y; az = a.z; hd = a.ry; }
    else { [ax, ay, az] = sp.anchor; hd = 0; }
    if (!st.init) { st.hd = hd; st.ax = ax; st.ay = ay; st.az = az; st.init = true; }
    const k = (rate) => rate > 0 ? 1 - Math.exp(-rate * dt) : 1;
    if (sp.world) st.hd = 0; else if (sp.headingSmooth === 0) st.hd = hd; else st.hd += wrap(hd - st.hd) * k(sp.headingSmooth ?? 3);
    const lagRate = sp.lag > 0 ? 1 / sp.lag : 0, ka = lagRate ? k(lagRate) : 1;
    st.ax += (ax - st.ax) * ka; st.ay += (ay - st.ay) * ka; st.az += (az - st.az) * ka;
    const yaw = (sp.yaw || 0) * Math.PI / 180, pitch = (sp.pitch || 0) * Math.PI / 180, d = sp.dist || 6;
    const ang = st.hd + Math.PI + yaw;                      // direction from subject to camera, in the ground plane
    const flat = Math.cos(pitch) * d, sx = Math.sin(ang), sz = Math.cos(ang);
    const rx = -Math.cos(st.hd), rz = Math.sin(st.hd), fx = Math.sin(st.hd), fz = Math.cos(st.hd);
    const L = sp.look || [0, 1.3, 0], lat = sp.lat || 0;
    const lx = st.ax + rx * L[0] + fx * L[2], ly = st.ay + L[1], lz = st.az + rz * L[0] + fz * L[2];
    F.cam = { pos: [st.ax + sx * flat + rx * lat, st.ay + L[1] + Math.sin(pitch) * d, st.az + sz * flat + rz * lat], look: [lx, ly, lz], fov: sp.fov || 48 };
  };
  // ---- avatar position (presence units), from the game's own move event
  window.addEventListener('jaw:avatar-move', (e) => { F.avatar = e.detail; });
})();
