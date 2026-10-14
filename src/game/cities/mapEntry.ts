/**
 * World-map entries that are not ISO countries but have a city module of their own: Somaliland is the map entry `sol`, Northern
 * Cyprus is `cyn`, the Siachen Glacier (a Karakoram glacier whose control is disputed between India and Pakistan) is `kas`, and
 * the Ashmore and Cartier Islands are `atc`. The city generator's contract is a two-letter country code (`country.id`), so a
 * module for one of them carries a user-assigned code (`xs`, `xn`, `xg`, `xa`, like Kosovo's `xk`) and every catalogue reader
 * turns it into the map entry's id here, once. Without a city module the map entries stay as they are; nothing here opens an entry by itself.
 */
const MAP_ENTRY_OF_CODE: Readonly<Record<string, string>> = Object.freeze({ xs: 'sol', xn: 'cyn', cx: 'ioa', cc: 'ioa', xg: 'kas', xa: 'atc' })
export const mapEntryOf = (code: string): string => Object.hasOwn(MAP_ENTRY_OF_CODE, code) ? MAP_ENTRY_OF_CODE[code]! : code
export const MAP_ENTRY_CODES: readonly string[] = Object.freeze(Object.keys(MAP_ENTRY_OF_CODE))
