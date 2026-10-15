import type { CityModuleLoader, CityIndexRow } from '../../src/game/cities/catalogue.ts';
// Preview-only catalogue: prevents the standalone housing build from emitting every world's city pack.
export const GENERATED_CITY_INDEX: readonly CityIndexRow[] = [['lagos','Lagos'],['abuja','Abuja']];
export const GENERATED_CITY_FIGURES={cities:2,countries:1};
export const GENERATED_CITY_LOADERS: readonly CityModuleLoader[]=[()=>import('../../src/game/cities/lagos/index.ts').then(m=>m.lagosCity),()=>import('../../src/game/cities/abuja/index.ts').then(m=>m.abujaCity)];
export const GENERATED_CITY_WORLD_INDEX=null;
