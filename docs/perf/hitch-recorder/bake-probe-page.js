// Evaluated in the page: bake fixed crowds/avatars with the real modules and hash every geometry byte. Returns {hash, parts, timing}.
(async () => {
  const T = await import('/node_modules/.vite/deps/three.js').catch(() => null);
  const { createKit } = await import('/src/scene/kit.ts');
  const C = await import('/src/scene/body/canonical-crowd.ts');
  const kit = createKit();
  const fnv = (h, bytes) => { for (let i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 16777619) >>> 0; } return h; };
  const hashGeom = (g) => { let h = 2166136261; const names = Object.keys(g.attributes).sort(); h = fnv(h, new TextEncoder().encode(names.join(',') + '|' + g.drawRange.start + ':' + g.drawRange.count + '|' + JSON.stringify(g.groups) + '|' + g.morphTargetsRelative + '|' + Object.keys(g.morphAttributes).join(','))); for (const n of names) { const a = g.attributes[n]; h = fnv(h, new TextEncoder().encode(n + a.itemSize + a.normalized + a.array.constructor.name + a.count)); h = fnv(h, new Uint8Array(a.array.buffer, a.array.byteOffset, a.count * a.itemSize * a.array.BYTES_PER_ELEMENT)); } if (g.index) { h = fnv(h, new TextEncoder().encode('idx' + g.index.array.constructor.name + g.index.count)); h = fnv(h, new Uint8Array(g.index.array.buffer, g.index.array.byteOffset, g.index.count * g.index.array.BYTES_PER_ELEMENT)); } const bs = g.boundingSphere; if (bs) h = fnv(h, new Uint8Array(new Float64Array([bs.center.x, bs.center.y, bs.center.z, bs.radius]).buffer)); return h.toString(16); };
  const texHash = new Map(); const texOf = (t) => { if (!t?.image) return null; if (texHash.has(t.image)) return texHash.get(t.image); const img = t.image; const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; const h = fnv(2166136261, d).toString(16) + ':' + img.constructor.name + ':' + img.width; texHash.set(t.image, h); return h; };
  const matKey = (m) => Array.isArray(m) ? m.map(matKey).join('/') : JSON.stringify([m.type, m.name, m.color?.toArray(), m.roughness, m.metalness, m.transparent, m.side, m.vertexColors, m.alphaTest, m.opacity, m.depthWrite, texOf(m.map), texOf(m.normalMap), texOf(m.roughnessMap), texOf(m.alphaMap), m.map?.flipY, m.map?.colorSpace, m.map?.wrapS, m.map?.anisotropy]);
  const dump = (root) => { const out = []; root.updateMatrixWorld(true); root.traverse(o => { if (!o.isMesh) return; out.push([o.name, o.isInstancedMesh ? 'I' + o.count : '', hashGeom(o.geometry), matKey(o.material), o.matrixWorld.elements.map(v => +v.toFixed(5)).join(','), o.isInstancedMesh ? fnv(2166136261, new Uint8Array(o.instanceMatrix.array.buffer)).toString(16) : '']); }); return out; };
  const people = [];
  const poses = ['idle', 'walk', 'sit', 'work', 'jog', 'dance', 'wave', 'idle'];
  for (let i = 0; i < 18; i++) people.push({ id: 'p' + i, seed: 'probe-' + (i % 7), pose: poses[i % poses.length], stride: (i * 0.13) % 1, x: (i % 6) * 1.5, z: Math.floor(i / 6) * 1.8, ry: i * 0.7, ...(i === 5 ? { matrix: [-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 3, 0, 4, 1] } : {}) });
  const t0 = performance.now();
  const crowd = C.buildCanonicalCrowd(kit, people, {});
  await crowd.group.userData.ready;
  const t1 = performance.now();
  const crowd2 = C.buildCanonicalCrowd(kit, people.slice(0, 6).map(p => ({ ...p, look: undefined })), { detail: 'full' });
  await crowd2.group.userData.ready;
  const t2 = performance.now();
  const avatars = [C.createCanonicalStaticAvatar(kit, null, { seed: 'probe-a', detail: 'lod', pose: 'walk', stride: 0.3 }), C.createCanonicalStaticAvatar(kit, null, { seed: 'probe-b', detail: 'full', pose: 'sit' })];
  for (const a of avatars) await a.userData.ready;
  const t3 = performance.now();
  const res = { crowd: dump(crowd.group), crowd2: dump(crowd2.group), av: avatars.map(dump), timing: { crowd: Math.round(t1 - t0), crowdFull: Math.round(t2 - t1), avatars: Math.round(t3 - t2) }, status: [crowd.group.userData.characterStatus, crowd.group.userData.characterError ?? '', crowd.triangles] };
  // Near detail: put the crowd in a scene, a camera 3 m in front of person 0's head, run the hook.
  const scene = new kit.THREE.Scene(); scene.add(crowd.group); for (const a of avatars) scene.add(a); scene.updateMatrixWorld(true);
  const heads = crowd.group.userData.nearDetailHeads?.() ?? [];
  const cam = new kit.THREE.PerspectiveCamera(43, 1.6, 0.1, 500);
  const h = heads[0];
  if (h) { cam.position.set(h.x, h.y, h.z + 3); cam.lookAt(h.x, h.y, h.z); cam.updateMatrixWorld(true); cam.updateProjectionMatrix();
    const t4 = performance.now(); const hooks = []; scene.traverse(o => { if (o.name === 'near-detail-hook') hooks.push(o); }); for (const k of hooks) k.update(cam); res.timing.nearSwap = +(performance.now() - t4).toFixed(1);
    res.near = dump(crowd.group); res.nearFlags = (crowd.group.userData.nearDetailHeads?.() ?? []).map(x => x.full ? 1 : 0).join('');
    cam.position.set(h.x + 200, h.y, h.z + 200); cam.lookAt(h.x, h.y, h.z); cam.updateMatrixWorld(true); const t5 = performance.now(); for (const k of hooks) k.update(cam); res.timing.farSwap = +(performance.now() - t5).toFixed(1); res.back = dump(crowd.group); }
  crowd.dispose(); crowd2.dispose(); for (const a of avatars) a.userData.dispose(); kit.dispose();
  res.worker = (await import(performance.getEntriesByType('resource').map(e => e.name).filter(n => /native-static-lod\.ts/.test(n)).pop())).nativeStaticLodWorkerState(); res.recolors = window.__recolorCount; res.calls = window.__recolorCalls; res.units = (window.__bakeUnits || []).filter(u => u[1] > 4 || u[0] === 'simpparts'); const all = JSON.stringify([res.crowd, res.crowd2, res.av, res.near, res.back]); res.total = fnv(2166136261, new TextEncoder().encode(all)).toString(16);
  return res;
})()
