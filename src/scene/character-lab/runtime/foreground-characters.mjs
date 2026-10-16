// @ts-nocheck -- Vendored lab runtime; typed integration boundary is foreground-characters.d.mts.
import { createCharacterSystem } from './characters.js';
import { profile } from './selected-profile.mjs';
import { lookToRecipe } from './look-recipe-adapter.mjs';

// This service uses native metres and +Z heading. The host owns movement, frames and disposal.
// Keep dense ambient NPCs on the existing game LOD renderer until a separate LOD exists here.
export async function createForegroundCharacters({ scene, groundHeight, maxActors = 1 }) {
  const limit = Math.max(1, Math.min(2, Math.floor(Number(maxActors) || 1)));
  const system = await createCharacterSystem({
    scene, groundHeight, ...profile,
    footPlantingEnabled: profile.footPlanting,
    kneeAlignmentEnabled: profile.kneeAlignment,
    seatedContactEnabled: true,
  });
  const actors = new Map(), reservations = new Set();
  let pending = 0, disposed = false;
  return {
    catalog: system.catalog,
    async spawn({ id, look, appearance, position = [0, 0, 0] }) {
      if (disposed) throw new Error('Foreground character service is disposed.');
      if (actors.has(id) || reservations.has(id)) throw new Error('Character id already exists: ' + id);
      if (actors.size + pending >= limit) throw new Error('Foreground character capacity reached.');
      reservations.add(id);
      pending++;
      try {
        const mapped = lookToRecipe(look);
        const actor = await system.spawn({ id, appearance: appearance ?? mapped.recipe.appearance, position });
        if (disposed) { actor.dispose(); throw new Error('Foreground character service was disposed during loading.'); }
        actor.setEmotion(mapped.recipe.emotion, mapped.recipe.emotionStrength);
        let originalLook = structuredClone(look ?? {}), fidelity = mapped.fidelity;
        let change = 0, actorDisposed = false;
        const result = {
          actor,
          get originalLook() { return structuredClone(originalLook); },
          get fidelity() { return { ...fidelity }; },
          async setLook(next) {
            const revision = ++change;
            const converted = lookToRecipe(next);
            const applied = await actor.setAppearance(converted.recipe.appearance);
            if (applied.ok && revision === change) {
              originalLook = structuredClone(next);
              fidelity = converted.fidelity;
              actor.setEmotion(converted.recipe.emotion, converted.recipe.emotionStrength);
            }
            return { ...applied, fidelity: converted.fidelity };
          },
          // Advance only from the host's active frame, after collision/navigation.
          move({ position: next, heading, speed = 0, gait = 'walk' }) {
            if (next) actor.root.position.fromArray(next);
            if (Number.isFinite(heading)) actor.root.rotation.y = heading;
            actor.setMotion({ speed, gait });
          },
          dispose() {
            if (actorDisposed) return;
            actorDisposed = true;
            change++; actor.dispose();
            if (actors.get(id) === result) actors.delete(id);
          },
        };
        actors.set(id, result);
        return result;
      } finally { pending--; reservations.delete(id); }
    },
    update(dt) { if (!disposed) system.update(Math.min(.1, Math.max(0, Number(dt) || 0))); },
    stats: () => system.stats(),
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const actor of actors.values()) actor.dispose();
      system.dispose();
    },
  };
}
