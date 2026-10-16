/**
 * OWNER: games (real-time)
 * RACE UNITS — how the rules' numbers become metres, so the 3D view and the HUD agree. Pure numbers, no three.js.
 *
 * The rules draw a car as a circle of radius CAR_R (race.ts: 13), the 2D view paints a saloon about 54 units long, and the road is 180 wide.
 * A car's body is taken as BODY_UNITS long (between the two) and the 3D car model (Kenney raceCar*.glb, 4.04 m long measured after
 * `updateMatrixWorld(true)`) is scaled to CAR_LENGTH_M, so a unit is 0.1 m: the road is 18 m between its kerbs, a lap about 500 m, and the
 * quickest cars about 18 m a second (67 km/h): enough to feel quick from a chase camera on a phone.
 */
export const BODY_UNITS = 40
export const UNIT = 0.1
/** The car model's length in the scene, and the length measured on the Kenney file (the model is scaled by their ratio). */
export const CAR_LENGTH_M = BODY_UNITS * UNIT
export const CAR_MODEL_LENGTH_M = 4.038
export const TICKS_PER_SECOND = 20

/** Metres a second for a rules speed in units a tick (what `DrawCar.v` holds). */
export const metresPerSecond = (unitsPerTick: number): number => unitsPerTick * TICKS_PER_SECOND * UNIT
/** Kilometres an hour, for the speed read-out. */
export const kmh = (unitsPerTick: number): number => Math.round(metresPerSecond(unitsPerTick) * 3.6)
