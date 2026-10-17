let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const attr = (arr) => ({ count: arr.length, getX: i => arr[i] });
let bad = 0;
for (let t = 0; t < 200; t++) {
  const V = 50 + Math.floor(rnd() * 3000), src = Float32Array.from({ length: V }, () => Math.floor(rnd() * 800) + (rnd() < .2 ? .4 : 0));
  const I = 3 * Math.floor(rnd() * 5000), idx = Uint32Array.from({ length: I }, () => Math.floor(rnd() * V));
  const hidden = new Set(Array.from({ length: Math.floor(rnd() * 300) }, () => Math.floor(rnd() * 800)));
  const attribute = attr(src), original = attr(idx); original.count = I;
  const a = []; for (let i = 0; i < original.count; i += 3) { const triangle = [original.getX(i), original.getX(i + 1), original.getX(i + 2)]; if (!triangle.some(index => hidden.has(Math.round(attribute.getX(index))))) a.push(...triangle); }
  const hiddenAt = new Uint8Array(attribute.count); for (let v = 0; v < attribute.count; v++) if (hidden.has(Math.round(attribute.getX(v)))) hiddenAt[v] = 1;
  const b = []; for (let i = 0; i < original.count; i += 3) { const x = original.getX(i), y = original.getX(i + 1), z = original.getX(i + 2); if (!hiddenAt[x] && !hiddenAt[y] && !hiddenAt[z]) b.push(x, y, z); }
  if (a.length !== b.length || a.some((v, i) => v !== b[i])) bad++;
}
console.log('bodyMask index lists differing:', bad, 'of 200');
