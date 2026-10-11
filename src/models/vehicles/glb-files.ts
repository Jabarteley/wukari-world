// Where the vehicle models are served from. Each `?url` import makes the build copy the file to dist/assets/ under a content hash (so the
// server caches it for a year and a new build is a new address). Imported only by glb.ts, which is fetched with the scene that draws a
// vehicle: these addresses are never in the first download.
import bus from './assets/bus.glb?url';
import busFar from './assets/bus-far.glb?url';
import danfo from './assets/danfo.glb?url';
import danfoFar from './assets/danfo-far.glb?url';
import danfoBlueWhite from './assets/danfo-blue-white.glb?url';
import danfoBlueWhiteFar from './assets/danfo-blue-white-far.glb?url';
import danfoWhiteGreen from './assets/danfo-white-green.glb?url';
import danfoWhiteGreenFar from './assets/danfo-white-green-far.glb?url';
import keke from './assets/keke.glb?url';
import kekeFar from './assets/keke-far.glb?url';
import okada from './assets/okada.glb?url';
import okadaFar from './assets/okada-far.glb?url';
import pickupBlue from './assets/pickup-blue.glb?url';
import pickupBlueFar from './assets/pickup-blue-far.glb?url';
import pickupWhite from './assets/pickup-white.glb?url';
import pickupWhiteFar from './assets/pickup-white-far.glb?url';
import saloon from './assets/saloon.glb?url';
import saloonFar from './assets/saloon-far.glb?url';
import saloonBlack from './assets/saloon-black.glb?url';
import saloonBlackFar from './assets/saloon-black-far.glb?url';
import saloonBlue from './assets/saloon-blue.glb?url';
import saloonBlueFar from './assets/saloon-blue-far.glb?url';
import saloonGreen from './assets/saloon-green.glb?url';
import saloonGreenFar from './assets/saloon-green-far.glb?url';
import saloonRed from './assets/saloon-red.glb?url';
import saloonRedFar from './assets/saloon-red-far.glb?url';
import suv from './assets/suv.glb?url';
import suvFar from './assets/suv-far.glb?url';
import suvBlack from './assets/suv-black.glb?url';
import suvBlackFar from './assets/suv-black-far.glb?url';
import suvRed from './assets/suv-red.glb?url';
import suvRedFar from './assets/suv-red-far.glb?url';
import suvWhite from './assets/suv-white.glb?url';
import suvWhiteFar from './assets/suv-white-far.glb?url';
import vanBlue from './assets/van-blue.glb?url';
import vanBlueFar from './assets/van-blue-far.glb?url';
import vanWhite from './assets/van-white.glb?url';
import vanWhiteFar from './assets/van-white-far.glb?url';

/** The file address for a glbKey() name. */
export const GLB_FILES: Readonly<Record<string, string>> = Object.freeze({
  bus, 'bus-far': busFar,
  danfo, 'danfo-far': danfoFar, 'danfo-blue-white': danfoBlueWhite, 'danfo-blue-white-far': danfoBlueWhiteFar,
  'danfo-white-green': danfoWhiteGreen, 'danfo-white-green-far': danfoWhiteGreenFar,
  keke, 'keke-far': kekeFar, okada, 'okada-far': okadaFar,
  'pickup-blue': pickupBlue, 'pickup-blue-far': pickupBlueFar, 'pickup-white': pickupWhite, 'pickup-white-far': pickupWhiteFar,
  saloon, 'saloon-far': saloonFar, 'saloon-black': saloonBlack, 'saloon-black-far': saloonBlackFar, 'saloon-blue': saloonBlue, 'saloon-blue-far': saloonBlueFar,
  'saloon-green': saloonGreen, 'saloon-green-far': saloonGreenFar, 'saloon-red': saloonRed, 'saloon-red-far': saloonRedFar,
  suv, 'suv-far': suvFar, 'suv-black': suvBlack, 'suv-black-far': suvBlackFar, 'suv-red': suvRed, 'suv-red-far': suvRedFar, 'suv-white': suvWhite, 'suv-white-far': suvWhiteFar,
  'van-blue': vanBlue, 'van-blue-far': vanBlueFar, 'van-white': vanWhite, 'van-white-far': vanWhiteFar,
});
