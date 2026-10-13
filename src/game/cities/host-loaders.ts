import { GENERATED_CITY_CATALOGUE_ROWS } from './catalogue.generated.ts'
import { CITY_CONTENT_ASSETS } from './content-assets.generated.ts'
import { loadCityContentAsset, type CityContentAssetReader } from './content-asset.ts'
import type { CityModule } from '../../types/content.ts'
import type { CityIndexRow, CityWorldIndexLoader } from './catalogue.ts'

const manifest = new Map(CITY_CONTENT_ASSETS.map(row => [row.id, row]))
let readAsset: CityContentAssetReader | undefined

export function installCityAssetReader(reader: CityContentAssetReader): void {
  readAsset = reader
}

export function cityContentUnavailable(cause: unknown): Error {
  return Object.assign(new Error('city_content_unavailable', { cause }), {
    status: 503, code: 'city_content_unavailable', retryable: true,
    reason: 'City content could not be loaded. Please retry.',
  })
}

export async function loadHostCityModule(id: string, reader: CityContentAssetReader | undefined = readAsset): Promise<CityModule> {
  const row = manifest.get(id)
  if (!row || !reader) throw cityContentUnavailable(new Error('City asset reader or manifest is unavailable'))
  try {
    const payload = await loadCityContentAsset(row, reader)
    return Object.freeze({
      id: payload.cityId,
      rules: payload.rules,
      loadContent: async () => payload.content,
      loadMap: async () => { throw new Error('City maps are unavailable on the server') },
    })
  } catch (cause) { throw cityContentUnavailable(cause) }
}

export const GENERATED_CITY_INDEX: readonly CityIndexRow[] = Object.freeze(GENERATED_CITY_CATALOGUE_ROWS.map(([id, name]): CityIndexRow => [id, name]))
export const GENERATED_CITY_FIGURES = Object.freeze({ cities: GENERATED_CITY_CATALOGUE_ROWS.length, countries: new Set(GENERATED_CITY_CATALOGUE_ROWS.map((row) => row[7] ?? 'NG')).size })
export const GENERATED_CITY_LOADERS = Object.freeze(GENERATED_CITY_CATALOGUE_ROWS.map(([id]) => () => loadHostCityModule(id)))
export const GENERATED_CITY_WORLD_INDEX: CityWorldIndexLoader | null = null
