/** Native release exception approved by Anthony on 16 October 2026.
 * App startup/first-paint and 60 scene draw calls remain separate unchanged gates.
 * These bounds cover selected native assets, not retired canonical asset names.
 */
export const NATIVE_ASSET_LIMITS = Object.freeze({
  bodyBrotli: 1_700_000,
  itemBrotli: 2_600_000,
  motionBrotli: 210_000,
  defaultCharacterBrotli: 5_000_000,
  optionalCatalogueBrotli: 38_000_000,
});
