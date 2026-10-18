import * as THREE from 'three';

/**
 * Trees where the imagery saw crowns (public/realworld/<area>/canopy.json: x, z, height, crown radius). Two species shapes, each
 * one InstancedMesh pair (trunk + foliage): broadleaf (almond, neem, umbrella trees) with crowns of leaf-cluster cards made from
 * ambientCG LeafSet024 leaves, and coconut palms with drooping fronds drawn from leaflets. Card normals point out of the crown so it
 * shades like a volume; alpha-tested leaves also cut their shadows.
 */
export interface Trees { group: THREE.Group; count: number }

const rand = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

async function image(url: string): Promise<HTMLImageElement> { const img = new Image(); img.src = url; await img.decode(); return img; }

/** A 1024² RGBA texture of ~200 leaves scattered from the 3 x 3 leaf atlas. */
async function leafCluster(): Promise<THREE.Texture> {
  const [colour, alpha] = await Promise.all([image('/realworld/textures/LeafSet024/color.jpg'), image('/realworld/textures/LeafSet024/opacity.jpg')]);
  const cell = colour.width / 3, leaf = document.createElement('canvas'); leaf.width = leaf.height = cell;
  const lg = leaf.getContext('2d')!;
  const leaves: HTMLCanvasElement[] = [];
  for (let i = 0; i < 9; i++) {
    const sx = (i % 3) * cell, sy = Math.floor(i / 3) * cell;
    const c = document.createElement('canvas'); c.width = c.height = cell; const g = c.getContext('2d')!;
    g.drawImage(alpha, sx, sy, cell, cell, 0, 0, cell, cell);
    const a = g.getImageData(0, 0, cell, cell);
    lg.clearRect(0, 0, cell, cell); lg.drawImage(colour, sx, sy, cell, cell, 0, 0, cell, cell);
    const col = lg.getImageData(0, 0, cell, cell);
    for (let k = 0; k < a.data.length; k += 4) col.data[k + 3] = a.data[k]!;
    g.putImageData(col, 0, 0); leaves.push(c);
  }
  const size = 1024, canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!, r = rand(7);
  // A rough disc of leaves, denser in the middle, darker underneath.
  for (let i = 0; i < 260; i++) {
    const ang = r() * Math.PI * 2, rad = Math.sqrt(r()) * size * 0.42, x = size / 2 + Math.cos(ang) * rad, y = size / 2 + Math.sin(ang) * rad;
    const s = size * (0.09 + r() * 0.07);
    g.save(); g.translate(x, y); g.rotate(r() * Math.PI * 2);
    g.filter = `brightness(${0.62 + r() * 0.5 - (y / size) * 0.18}) saturate(${0.85 + r() * 0.35}) hue-rotate(${(r() - 0.5) * 18}deg)`;
    g.drawImage(leaves[Math.floor(r() * 9)]!, -s / 2, -s / 2, s, s); g.restore();
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
  return texture;
}

/** Palm frond texture: a rachis with leaflets either side, alpha cut. */
function frondTexture(): THREE.Texture {
  const w = 512, h = 128, canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const g = canvas.getContext('2d')!, r = rand(3);
  g.strokeStyle = '#6f6a3a'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
  for (let x = 6; x < w - 4; x += 5) {
    const len = (h / 2 - 4) * Math.sin((x / w) * Math.PI * 0.95 + 0.15) * (0.8 + r() * 0.2);
    for (const side of [-1, 1]) {
      const shade = 70 + r() * 50;
      g.strokeStyle = `rgb(${shade * 0.55}, ${shade * 1.05 + 30}, ${shade * 0.35})`; g.lineWidth = 2.2;
      g.beginPath(); g.moveTo(x, h / 2); g.quadraticCurveTo(x + 10, h / 2 + side * len * 0.5, x + 16 + r() * 6, h / 2 + side * len); g.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
  return texture;
}

/** Unit broadleaf: height 1, crown about 1 across at the top. */
function broadleafGeometry(): { trunk: THREE.BufferGeometry; crown: THREE.BufferGeometry } {
  const trunk = new THREE.CylinderGeometry(0.035, 0.06, 0.62, 7, 1).translate(0, 0.31, 0);
  const limbs = [0, 2.1, 4.2].map((a) => new THREE.CylinderGeometry(0.014, 0.028, 0.32, 5).translate(0, 0.16, 0).rotateZ(0.7).rotateY(a).translate(0, 0.52, 0));
  const r = rand(11), cards: THREE.BufferGeometry[] = [];
  const centre = new THREE.Vector3(0, 0.7, 0);
  for (let i = 0; i < 34; i++) {
    const p = new THREE.Vector3((r() - 0.5) * 2, (r() - 0.5) * 2, (r() - 0.5) * 2); if (p.length() > 1) { i--; continue; }
    p.multiply(new THREE.Vector3(0.42, 0.2, 0.42)).add(centre);
    const q = new THREE.PlaneGeometry(0.42 + r() * 0.2, 0.42 + r() * 0.2);
    q.rotateX(-Math.PI / 2 + (r() - 0.5) * 1.6); q.rotateY(r() * Math.PI * 2); q.translate(p.x, p.y, p.z);
    // Normals out of the crown's centre: soft, volume-like light.
    const pos = q.attributes.position!, nrm = q.attributes.normal!;
    for (let k = 0; k < pos.count; k++) { const n = new THREE.Vector3(pos.getX(k), pos.getY(k) - 0.62, pos.getZ(k)).normalize(); nrm.setXYZ(k, n.x, n.y, n.z); }
    cards.push(q);
  }
  return { trunk: merge([trunk, ...limbs]), crown: merge(cards) };
}

/** Unit coconut palm: height 1 to the crown, a slight lean and curve, 12 drooping fronds of length 0.38. */
function palmGeometry(): { trunk: THREE.BufferGeometry; crown: THREE.BufferGeometry } {
  const path = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.03, 0.35, 0), new THREE.Vector3(0.08, 0.7, 0), new THREE.Vector3(0.14, 1, 0)]);
  const trunk = new THREE.TubeGeometry(path, 10, 0.022, 6, false);
  const top = path.getPoint(1), fronds: THREE.BufferGeometry[] = [], r = rand(5);
  for (let i = 0; i < 12; i++) {
    const segs = 6, len = 0.36 + r() * 0.06, width = 0.09, yaw = (i / 12) * Math.PI * 2 + r() * 0.3, rise = 0.5 - r() * 0.5;
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    for (let s = 0; s <= segs; s++) {
      const t = s / segs, x = t * len, y = Math.sin(rise) * x - 0.9 * x * x; // up then drooping
      for (const side of [-1, 1]) { pos.push(x, y, side * width / 2); uv.push(t, side < 0 ? 0 : 1); }
      if (s < segs) { const a = s * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    g.computeVertexNormals(); g.rotateX((r() - 0.5) * 0.6); g.rotateY(yaw); g.translate(top.x, top.y, top.z);
    const n = g.attributes.normal!; for (let k = 0; k < n.count; k++) n.setXYZ(k, 0, 1, 0);
    fronds.push(g);
  }
  return { trunk, crown: merge(fronds) };
}

function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const clean = parts.map((p) => { const g = p.index ? p.toNonIndexed() : p; for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); return g; });
  const count = clean.reduce((n, g) => n + g.attributes.position!.count, 0), out = new THREE.BufferGeometry();
  for (const [name, size] of [['position', 3], ['normal', 3], ['uv', 2]] as const) {
    const data = new Float32Array(count * size); let o = 0;
    for (const g of clean) { data.set(g.attributes[name]!.array as Float32Array, o); o += g.attributes[name]!.count * size; }
    out.setAttribute(name, new THREE.BufferAttribute(data, size));
  }
  out.computeBoundingSphere();
  return out;
}

export async function buildTrees(trees: [number, number, number, number][], ground: (x: number, z: number) => number): Promise<Trees> {
  const [cluster, frond] = [await leafCluster(), frondTexture()];
  const bark = new THREE.MeshStandardMaterial({ color: '#5b5046', roughness: 0.95 });
  const palmBark = new THREE.MeshStandardMaterial({ color: '#8a7c68', roughness: 0.9 });
  const leaves = new THREE.MeshStandardMaterial({ map: cluster, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75 });
  const fronds = new THREE.MeshStandardMaterial({ map: frond, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.7 });
  const broad = broadleafGeometry(), palm = palmGeometry();
  const r = rand(23);
  const kinds = trees.map(([, , , radius]) => (radius < 2.4 && r() < 0.45 ? 'palm' : 'broad'));
  const counts = { broad: kinds.filter((k) => k === 'broad').length, palm: kinds.filter((k) => k === 'palm').length };
  const meshes = {
    broadTrunk: new THREE.InstancedMesh(broad.trunk, bark, counts.broad), broadCrown: new THREE.InstancedMesh(broad.crown, leaves, counts.broad),
    palmTrunk: new THREE.InstancedMesh(palm.trunk, palmBark, counts.palm), palmCrown: new THREE.InstancedMesh(palm.crown, fronds, counts.palm),
  };
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
  let ib = 0, ip = 0;
  trees.forEach(([x, z, height, radius], i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI * 2); p.set(x, ground(x, z), z);
    if (kinds[i] === 'palm') {
      const h = Math.max(6, Math.min(16, height * 1.3 + r() * 4)); s.set(h, h, h); m.compose(p, q, s);
      meshes.palmTrunk.setMatrixAt(ip, m); meshes.palmCrown.setMatrixAt(ip, m);
      c.setHSL(0.22 + r() * 0.05, 0.45 + r() * 0.2, 0.55 + r() * 0.2); meshes.palmCrown.setColorAt(ip, c); ip++;
    } else {
      const h = Math.max(4, height), w = Math.max(2.4, radius * 2.1); s.set(w, h, w); m.compose(p, q, s);
      meshes.broadTrunk.setMatrixAt(ib, m); meshes.broadCrown.setMatrixAt(ib, m);
      c.setHSL(0.24 + r() * 0.06, 0.35 + r() * 0.25, 0.42 + r() * 0.25); meshes.broadCrown.setColorAt(ib, c); ib++;
    }
  });
  const group = new THREE.Group();
  for (const mesh of Object.values(meshes)) { mesh.castShadow = true; mesh.receiveShadow = true; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; mesh.computeBoundingSphere(); group.add(mesh); }
  return { group, count: trees.length };
}
