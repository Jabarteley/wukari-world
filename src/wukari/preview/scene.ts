import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { contains, fromWorld, rings, toWorld, wayPositions, indexNodes } from '../geography.ts';
import type { Dataset, Position } from '../geography.ts';

/** Flat linework only: no guessed road width, building height, elevation, gates or player spawn. */
export interface Readout { lon: number; lat: number; bearing: number }
export function createPreview(host: HTMLElement, data: Dataset, report?: (value: Readout) => void, select?: () => void): () => void {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  host.append(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#17242e');
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1e7);
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  const all = new THREE.Group(); scene.add(all);
  const area = data.extents.lga.feature.geometry;
  for (const polygon of area.type === 'Polygon' ? [area.coordinates] : area.coordinates) {
    const paths = polygon.map(ring => ring.map(p => { const v = toWorld(data.origin, p); return new THREE.Vector2(v.x, -v.z); }));
    const shape = new THREE.Shape(paths[0]!);
    for (const hole of paths.slice(1)) shape.holes.push(new THREE.Path(hole));
    const plate = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: 0x24473d, side: THREE.DoubleSide }));
    plate.rotation.x = -Math.PI / 2; plate.position.y = -0.1; all.add(plate);
  }
  const draw = (points: Position[], color: number, y: number): void => {
    const vertices = points.map(p => { const v = toWorld(data.origin, p); return new THREE.Vector3(v.x, y, v.z); });
    const geometry = new THREE.BufferGeometry().setFromPoints(vertices);
    all.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color })));
  };
  for (const ring of rings(data.extents.lga.feature.geometry)) draw(ring, 0x5fba88, 0);
  const nodes = indexNodes(data.osm.elements);
  for (const way of data.osm.elements) {
    if (way.type !== 'way' || (!way.tags?.highway && !way.tags?.building)) continue;
    const points = wayPositions(way, data.osm.elements, nodes);
    if (points && points.length >= 2) draw(points, way.tags?.highway ? 0x77c7ff : 0xc5cbd1, 0.01);
  }
  if (data.extents.campus.geometry) for (const ring of rings(data.extents.campus.geometry)) draw(ring, 0xffc56e, 0.02);
  // Start with campus when available. LGA context remains in the scene, outside the initial framing.
  const focus = data.extents.campus.geometry ?? data.extents.lga.feature.geometry;
  const box = new THREE.Box3();
  for (const ring of rings(focus)) for (const p of ring) { const v = toWorld(data.origin, p); box.expandByPoint(new THREE.Vector3(v.x, 0, v.z)); }
  const center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const distance = Math.max(size.x, size.z, 50) * 1.8;
  controls.target.copy(center); camera.position.copy(center).add(new THREE.Vector3(0, distance, distance * 0.5)); controls.update();
  const resize = (): void => { const { width, height } = host.getBoundingClientRect(); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix(); renderer.setSize(width, height, false); };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  const cursor = new THREE.Vector2(), ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  let coordinates = data.origin, lastReport = 0, downX = 0, downY = 0;
  const pointer = (event: PointerEvent): void => {
    const rect = renderer.domElement.getBoundingClientRect();
    cursor.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
    ray.setFromCamera(cursor, camera);
    if (ray.ray.intersectPlane(plane, hit)) coordinates = fromWorld(data.origin, hit.x, hit.z);
  };
  const down = (event: PointerEvent): void => { downX = event.clientX; downY = event.clientY; };
  const up = (event: PointerEvent): void => {
    if (Math.hypot(event.clientX - downX, event.clientY - downY) > 5) return;
    pointer(event); if (contains(area, coordinates)) select?.();
  };
  renderer.domElement.addEventListener('pointermove', pointer); renderer.domElement.addEventListener('pointerdown', down); renderer.domElement.addEventListener('pointerup', up);
  renderer.setAnimationLoop(time => {
    controls.update(); renderer.render(scene, camera);
    if (time - lastReport > 200) {
      lastReport = time;
      const dx = controls.target.x - camera.position.x, dz = controls.target.z - camera.position.z;
      report?.({ lon: coordinates[0], lat: coordinates[1], bearing: (Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360 });
    }
  });
  return () => {
    renderer.setAnimationLoop(null); observer.disconnect(); controls.dispose();
    renderer.domElement.removeEventListener('pointermove', pointer); renderer.domElement.removeEventListener('pointerdown', down); renderer.domElement.removeEventListener('pointerup', up);
    all.traverse(object => { if (object instanceof THREE.Line || object instanceof THREE.Mesh) { object.geometry.dispose(); (object.material as THREE.Material).dispose(); } });
    renderer.dispose(); renderer.domElement.remove();
  };
}
