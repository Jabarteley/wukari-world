/**
 * Compact housing subset copied from the pinned Allworld runtime library.
 *
 * The GLBs are near LODs only. They remain separate files so Vite can keep
 * them as external URLs and the housing studio can load them lazily.
 */
export interface HousingAssetManifestEntry {
  readonly id: string;
  readonly url: string;
  readonly source: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly triangles: number;
  readonly bounds: readonly [minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number];
  readonly dimensions: readonly [width: number, height: number, depth: number];
  readonly shapeCorrespondence?: {
    readonly kind: 'box' | 'vertical' | 'flat' | 'organic' | 'wall-panel';
    readonly note: string;
  };
}

export const HOUSING_ASSET_SOURCE_REVISION = 'e810eb46dc7e6c7f4682b3b229991d60ca56b942';
export const HOUSING_ASSET_SOURCE_LICENSE = 'AGPL-3.0-or-later (owner-authorized runtime use)';

export const housingAssetManifest = [
  {
    id: 'two-seat-sofa',
    url: new URL('./assets/two-seat-sofa-near.glb', import.meta.url).href,
    source: 'src/scene/asset-library/assets/two-seat-sofa-near.glb',
    sha256: '475f142289c2eb987f8b6ad21bf631751744209346009f3b5a7b6c6e47fb541d',
    bytes: 19440,
    triangles: 890,
    bounds: [-0.94, -0.00004, -0.4325, 0.94, 1.162812, 0.432509],
    dimensions: [1.88, 1.162852, 0.865009],
    shapeCorrespondence: { kind: 'box', note: 'seating footprint and back volume' },
  },
  {
    id: 'single-bed',
    url: new URL('./assets/single-bed-near.glb', import.meta.url).href,
    source: 'src/scene/asset-library/assets/single-bed-near.glb',
    sha256: 'cd46d1f53b3102207eafefc6fb97af7a9fda186367af65e468adb58d3320258a',
    bytes: 18856,
    triangles: 888,
    bounds: [-0.565, 0, -1.04875, 0.564984, 1.20501, 1.04875],
    dimensions: [1.129984, 1.20501, 2.0975],
    shapeCorrespondence: { kind: 'box', note: 'mattress and frame occupancy' },
  },
  {
    id: 'wardrobe',
    url: new URL('./assets/wardrobe-near.glb', import.meta.url).href,
    source: 'src/scene/asset-library/assets/wardrobe-near.glb',
    sha256: '31518807c84a8cd3dead1fd06b6bfec0b484a4cf51b3cab366581adde1d7e65e',
    bytes: 15908,
    triangles: 790,
    bounds: [-0.64, 0, -0.3645, 0.64002, 2.08, 0.364509],
    dimensions: [1.28002, 2.08, 0.729009],
    shapeCorrespondence: { kind: 'vertical', note: 'tall cabinet volume' },
  },
  {
    id: 'wood-armchair',
    url: new URL('./assets/wood-armchair-near.glb', import.meta.url).href,
    source: 'src/scene/asset-library/assets/wood-armchair-near.glb',
    sha256: 'c7d55be46fc4a2e30bad49a7181ea918ab81e562ac58934d0ef07213c81968d1',
    bytes: 14344,
    triangles: 590,
    bounds: [-0.41481, 0, -0.37817, 0.414807, 1.046878, 0.378153],
    dimensions: [0.829617, 1.046878, 0.756323],
    shapeCorrespondence: { kind: 'box', note: 'seat and back occupancy' },
  },
  {
    id: 'dining-chair',
    url: new URL('./assets/dining-chair-near.glb', import.meta.url).href,
    source: 'src/scene/asset-library/assets/dining-chair-near.glb',
    sha256: '5f204669d3c8518e773d978f8996ba5fdb7f0e4a6c317895cf340e7925e09c72',
    bytes: 13740,
    triangles: 590,
    bounds: [-0.255, 0, -0.269101, 0.255011, 0.964282, 0.269127],
    dimensions: [0.510011, 0.964282, 0.538228],
    shapeCorrespondence: { kind: 'box', note: 'chair seat and back occupancy' },
  },
  {
    id: 'dining-table',
    url: new URL('./assets/dining-table-near.glb', import.meta.url).href,
    source: 'src/scene/asset-library/assets/dining-table-near.glb',
    sha256: '37d2c2578f92bbf6059531d163662450e3a8ad38a1526a06eacc5b647c4c2db4',
    bytes: 13468,
    triangles: 590,
    bounds: [-0.75, 0, -0.425, 0.75, 0.812489, 0.425027],
    dimensions: [1.5, 0.812489, 0.850027],
    shapeCorrespondence: { kind: 'box', note: 'tabletop and leg footprint' },
  },
  {
    id: 'flat-panel-television',
    url: new URL('./assets/flat-panel-television-near.glb', import.meta.url).href,
    source: 'src/scene/asset-library/assets/flat-panel-television-near.glb',
    sha256: '4074f2d13a83a89fb0215e471c867aa79520b5a893496b811a5f14c56f417ae5',
    bytes: 6684,
    triangles: 180,
    bounds: [-0.47, 0, -0.143, 0.47, 0.627986, 0.143022],
    dimensions: [0.94, 0.627986, 0.286022],
    shapeCorrespondence: { kind: 'flat', note: 'screen plane and stand' },
  },
  {
    id: 'broadleaf-planter',
    url: new URL('./assets/broadleaf-planter-near.glb', import.meta.url).href,
    source: 'src/scene/asset-library/assets/broadleaf-planter-near.glb',
    sha256: 'bb90e54c39767a5d45326d05ae27948da8da9e939e8e7d68f88a74b3b4d1139f',
    bytes: 15080,
    triangles: 590,
    bounds: [-0.578346, 0, -0.578451, 0.578382, 1.929028, 0.578478],
    dimensions: [1.156728, 1.929028, 1.156929],
    shapeCorrespondence: { kind: 'organic', note: 'planter base plus leaf envelope' },
  },
  {
    id: 'knee-clearance-public-washbasin',
    url: new URL('./assets/knee-clearance-public-washbasin-near.glb', import.meta.url).href,
    source: 'src/scene/asset-library/assets/knee-clearance-public-washbasin-near.glb',
    sha256: '59d2d712fceba05a69d61319acad1b9bccda6bc94eaa72889388d6425d1dcdb1',
    bytes: 6440,
    triangles: 200,
    bounds: [-0.33, 0, -0.36, 0.33002, 1.09367, 0.359967],
    dimensions: [0.66002, 1.09367, 0.719967],
    shapeCorrespondence: { kind: 'box', note: 'basin and pedestal occupancy' },
  },
  {
    id: 'display-fridge',
    url: new URL('./assets/display-fridge-near.glb', import.meta.url).href,
    source: 'src/scene/asset-library/assets/display-fridge-near.glb',
    sha256: '77c866fb0c06040aebf6bd8123415bf8a12d1d0fe5e7eb5fdc73fbe2c59ea204',
    bytes: 12624,
    triangles: 668,
    bounds: [-0.39, 0, -0.4185, 0.389953, 1.995, 0.418443],
    dimensions: [0.779953, 1.995, 0.836943],
    shapeCorrespondence: { kind: 'vertical', note: 'refrigerated display cabinet volume' },
  },
  {
    id: 'floor-lamp',
    url: new URL('./assets/floor-lamp-near.glb', import.meta.url).href,
    source: 'src/scene/asset-library/assets/floor-lamp-near.glb',
    sha256: '202535b0d31a2bf6ab4f3be608061efa43ceff6bd7a61bab7f9fdb965fcce476',
    bytes: 13592,
    triangles: 574,
    bounds: [-0.307523, 0, -0.307523, 0.307472, 1.6925, 0.307472],
    dimensions: [0.614995, 1.6925, 0.614995],
    shapeCorrespondence: { kind: 'vertical', note: 'standing lamp and shade envelope' },
  },
  {
    id: 'four-burner-stove',
    url: new URL('./assets/four-burner-stove-near.glb', import.meta.url).href,
    source: 'src/scene/asset-library/assets/four-burner-stove-near.glb',
    sha256: '5a69f7c0f80348dfea3e8604ca19add56cd431f5474270f306d5a501a71b8632',
    bytes: 14576,
    triangles: 790,
    bounds: [-0.325, 0, -0.3555, 0.325004, 0.993848, 0.355471],
    dimensions: [0.650004, 0.993848, 0.710971],
    shapeCorrespondence: { kind: 'box', note: 'cooker body and burner-top occupancy' },
  },
] as const satisfies readonly HousingAssetManifestEntry[];

export const HOUSING_ASSET_TOTAL_BYTES = housingAssetManifest.reduce((total, asset) => total + asset.bytes, 0);
export const HOUSING_ASSET_TOTAL_TRIANGLES = housingAssetManifest.reduce((total, asset) => total + asset.triangles, 0);
