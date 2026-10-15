import { Mesh, Vector3 } from 'three';
import type { HostScene } from '../venue-world.ts';

export interface HousingFrontDoorState { open: boolean }

/** Persistent manual door position, yielding to the host's existing entry/exit animation. */
export function withHousingFrontDoor<T extends HostScene>(scene: T, state: HousingFrontDoorState, visible: () => boolean = () => true) {
  let transitioning = false;
  const actor = new Vector3(), hinge = new Vector3();
  function clearToClose() {
    const leaf = scene.group.getObjectByName('home-door-leaf'), avatar = scene.walk?.avatar;
    if (!leaf || !avatar) return true;
    leaf.updateWorldMatrix(true, true);
    avatar.getWorldPosition(actor); leaf.getWorldPosition(hinge);
    let width = 0;
    leaf.traverse(object => {
      if (!(object instanceof Mesh)) return;
      object.geometry.computeBoundingBox();
      width = Math.max(width, object.geometry.boundingBox?.max.z ?? 0);
    });
    return !(Math.abs(actor.x - hinge.x) < 0.32 && actor.z > hinge.z - 0.32 && actor.z < hinge.z + width + 0.32
      && actor.y < hinge.y + 2.3 && actor.y + 1.6 > hinge.y);
  }
  function apply() {
    const leaf = scene.group.getObjectByName('home-door-leaf');
    if (!leaf || transitioning) return false;
    const rotation = state.open ? -Math.PI / 2 : 0, shown = visible();
    const changed = leaf.rotation.y !== rotation || leaf.visible !== shown;
    leaf.rotation.y = rotation;
    leaf.visible = shown;
    return changed;
  }
  const frontDoor = {
    get open() { return state.open; },
    get busy() { return transitioning; },
    toggle() {
      if (transitioning || state.open && !clearToClose()) return false;
      state.open = !state.open;
      apply();
      return true;
    },
  };
  const wrapper = Object.assign(Object.create(scene) as T, { frontDoor });
  wrapper.update = value => { const changed = scene.update?.(value) ?? false; return apply() || changed; };
  wrapper.look = (x, z) => { const changed = scene.look?.(x, z) ?? false; return apply() || changed; };
  wrapper.stepCrowd = dt => { const more = scene.stepCrowd?.(dt) ?? false; apply(); return more; };
  wrapper.settleCrowd = () => { scene.settleCrowd?.(); apply(); };
  wrapper.beginDoor = done => {
    transitioning = true;
    const complete = () => { transitioning = false; state.open = false; apply(); done(); };
    if (scene.beginDoor) scene.beginDoor(complete); else complete();
  };
  return wrapper;
}
