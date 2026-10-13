// Stable names for this isolated proposal; no production asset identity claim.
const freeze = (value) => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
export const MAX_SAVE_BYTES = 16384;
export const SKELETON_ID = 'allworld-body-23@1';
export const CONTROL_GROUPS = freeze({
  earLeft: ['height', 'width', 'protrusion', 'rotation', 'lobeLength'],
  earRight: ['height', 'width', 'protrusion', 'rotation', 'lobeLength'],
  nose: ['bridgeWidth', 'bridgeHeight', 'projection', 'tipRotation', 'alarWidth'],
  face: ['width', 'length', 'headDepth', 'jawWidth', 'chinProjection', 'cheekFullness', 'browHeight', 'browAngle', 'eyeSpacing', 'eyeAperture', 'eyelidFold', 'lipFullness'],
  body: ['height', 'shoulderWidth', 'torsoLength', 'armLength', 'legLength', 'waistWidth', 'hipWidth', 'handSize', 'footSize', 'abdominalFullness', 'muscleDefinition'],
});
export const EXPRESSION_PRESETS = freeze({
  neutral: {},
  'soft-smile': { smileLeft: 0.58, smileRight: 0.58 },
  grin: { smileLeft: 1, smileRight: 1, jawOpen: 0.12 },
  focus: { browLowerLeft: 0.3, browLowerRight: 0.3 },
  concern: { browRaiseLeft: 0.4, browRaiseRight: 0.4, frownLeft: 0.35, frownRight: 0.35 },
  surprise: { browRaiseLeft: 0.7, browRaiseRight: 0.7, jawOpen: 0.45 },
});
export const CHANNELS = freeze([
  'smileLeft', 'smileRight', 'frownLeft', 'frownRight', 'browRaiseLeft', 'browRaiseRight',
  'browLowerLeft', 'browLowerRight', 'jawOpen', 'lipSeal', 'lipPucker', 'lipWide', 'blinkLeft', 'blinkRight', 'gazeYaw', 'gazePitch',
]);
export const ANCHORS = freeze({
  'scalp.crown': { joint: 'Head', slots: ['hair', 'head'], affectedBy: ['face'] },
  'scalp.templeLeft': { joint: 'Head', slots: ['hair', 'head'], affectedBy: ['face', 'earLeft'] },
  'scalp.templeRight': { joint: 'Head', slots: ['hair', 'head'], affectedBy: ['face', 'earRight'] },
  'ear.lobeLeft': { joint: 'Head', slots: ['ears'], affectedBy: ['earLeft', 'face'] },
  'ear.lobeRight': { joint: 'Head', slots: ['ears'], affectedBy: ['earRight', 'face'] },
  'nose.bridge': { joint: 'Head', slots: ['face'], affectedBy: ['nose', 'face'] },
  'neck.collar': { joint: 'neck_01', slots: ['neck', 'top', 'full'], affectedBy: ['body'] },
  'shoulder.left': { joint: 'clavicle_l', slots: ['top', 'full', 'carry'], affectedBy: ['body'] },
  'shoulder.right': { joint: 'clavicle_r', slots: ['top', 'full', 'carry'], affectedBy: ['body'] },
  'waist.center': { joint: 'pelvis', slots: ['bottom', 'full', 'carry'], affectedBy: ['body'] },
  'wrist.left': { joint: 'hand_l', slots: ['wrist'], affectedBy: ['body'] },
  'wrist.right': { joint: 'hand_r', slots: ['wrist'], affectedBy: ['body'] },
  'foot.left': { joint: 'foot_l', slots: ['shoes'], affectedBy: ['body'] },
  'foot.right': { joint: 'foot_r', slots: ['shoes'], affectedBy: ['body'] },
});
export const REQUIRED_ANCHORS = freeze({
  hair: ['scalp.crown', 'scalp.templeLeft', 'scalp.templeRight'],
  head: ['scalp.crown', 'scalp.templeLeft', 'scalp.templeRight'],
  ears: ['ear.lobeLeft', 'ear.lobeRight'], face: ['nose.bridge'], neck: ['neck.collar'],
  top: ['neck.collar', 'shoulder.left', 'shoulder.right'], bottom: ['waist.center'],
  full: ['neck.collar', 'shoulder.left', 'shoulder.right', 'waist.center'],
  wrist: ['wrist.left', 'wrist.right'], carry: ['shoulder.left', 'shoulder.right', 'waist.center'],
  shoes: ['foot.left', 'foot.right'],
});

