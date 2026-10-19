/**
 * OWNER: danfo (docs/DANFO.md)
 * THE LINES a player can drive from a city's motor park: real danfo-type routes (danfo in Lagos, trotro in Accra, matatu in Nairobi, taxi in
 * Kampala, daladala in Dar es Salaam), each a list of real stops with their distance from the first one in kilometres (rounded; a stop is
 * where the buses stop, not a survey). Pure data and a few helpers shared by the browser and the server: the server settles a run from
 * these numbers, so a change to a route is a change to `version` (a run started on the old version is still settled on it, see
 * server/danfo/service.ts).
 *
 * SCALE   a kilometre of the real road is LEG_M_PER_KM metres of the game road, with LEG_BASE_M more per leg, so a 20 km line is a run of
 *         three to five minutes. MAX_SPEED is the fastest the bus can go in the game: the server refuses a run that reached a stop sooner
 *         than that speed allows (minRunMs).
 */

export type DanfoVehicle = 'danfo' | 'trotro' | 'matatu' | 'taxi' | 'daladala' | 'bus'
export interface DanfoStop { readonly name: string; readonly km: number }
export interface DanfoRoute {
  readonly id: string
  /** Bumped when stops or distances change; stored on the run. */
  readonly version: number
  readonly city: string
  /** "Ojota – Obalende". */
  readonly name: string
  /** The road a person knows it by: "the Ikorodu Road run". */
  readonly road: string
  readonly vehicle: DanfoVehicle
  readonly stops: readonly DanfoStop[]
}

/** What the vehicle is called where it runs. */
export const VEHICLE_WORDS: Readonly<Record<DanfoVehicle, string>> = { danfo: 'danfo', trotro: 'trotro', matatu: 'matatu', taxi: 'taxi', daladala: 'daladala', bus: 'bus' }
/** Seats a passenger may take (the conductor stands at the door). */
export const SEATS = 14
/** Game metres per kilometre of real road, and metres added to every leg. */
export const LEG_M_PER_KM = 60, LEG_BASE_M = 180
/** The bus's top speed in the game, metres per second (about 80 km/h). */
export const MAX_SPEED = 22
/** The fastest a stop can be served: the bus stands still this long while people get on and off. */
export const DWELL_MS = 1500
/** A run that took longer than this from the park has been left: the server closes it. */
export const RUN_MAX_MS = 20 * 60_000
/** The fare: a flat part and a part per stop ridden, in game naira; never more than FARE_MAX for one passenger. */
export const FARE = Object.freeze({ base: 150, perStop: 80, max: 800 })

const route = (id: string, city: string, name: string, road: string, vehicle: DanfoVehicle, stops: [string, number][]): DanfoRoute =>
  Object.freeze({ id, version: 1, city, name, road, vehicle, stops: Object.freeze(stops.map(([stop, km]) => Object.freeze({ name: stop, km }))) })

export const DANFO_ROUTES: readonly DanfoRoute[] = Object.freeze([
  route('lagos-ikorodu-road', 'lagos', 'Ojota – Obalende', 'Ikorodu Road', 'danfo',
    [['Ojota', 0], ['Maryland', 2.5], ['Anthony', 4], ['Palmgrove', 6], ['Onipanu', 7], ['Fadeyi', 8], ['Jibowu', 9], ['Obalende', 17]]),
  route('lagos-oshodi-mile2', 'lagos', 'Oshodi – Mile 2', 'Oshodi–Apapa Expressway', 'danfo',
    [['Oshodi', 0], ['Charity', 1.5], ['Ilasamaja', 3], ['Cele', 5], ['Ijesha', 6.5], ['Second Rainbow', 9], ['Mile 2', 12]]),
  route('lagos-cms-ajah', 'lagos', 'CMS – Ajah', 'Lekki–Epe Expressway', 'danfo',
    [['CMS', 0], ['Obalende', 2], ['Falomo', 4.5], ['Lekki Toll Gate', 9], ['Chevron', 15], ['Jakande', 17], ['Abraham Adesanya', 20], ['Ajah', 22]]),
  route('abuja-wuse-mararaba', 'abuja', 'Wuse – Mararaba', 'Nyanya Road', 'bus',
    [['Wuse Market', 0], ['Berger', 2], ['Area 1', 4], ['Federal Secretariat', 7], ['AYA', 10], ['Kugbo', 15], ['Nyanya', 19], ['Mararaba', 23]]),
  route('ibadan-iwo-road-challenge', 'ibadan', 'Iwo Road – Challenge', 'the Ring Road', 'danfo',
    [['Iwo Road', 0], ['Gate', 4], ['Beere', 6], ['Oke-Ado', 8], ['Challenge', 10]]),
  route('port-harcourt-ikwerre-road', 'port-harcourt', 'Rumuokoro – Mile 1', 'Ikwerre Road', 'bus',
    [['Rumuokoro', 0], ['Rumuokwuta', 3], ['Rumuola', 5], ['Mile 3', 8], ['Mile 2', 9], ['Mile 1', 10]]),
  route('accra-circle-madina', 'accra', 'Circle – Madina', 'the Legon Road', 'trotro',
    [['Circle', 0], ['37', 4], ['Shiashie', 6.5], ['Okponglo', 7.5], ['Legon', 9], ['Atomic Junction', 11], ['Madina', 13]]),
  route('accra-circle-kasoa', 'accra', 'Circle – Kasoa', 'the Winneba Road', 'trotro',
    [['Circle', 0], ['Kaneshie', 4], ['Odorkor', 8], ['Mallam', 12], ['Weija', 17], ['Kasoa', 28]]),
  route('nairobi-ngong-road', 'nairobi', 'Kencom – Karen', 'Ngong Road', 'matatu',
    [['Kencom', 0], ['KNH', 3], ['Prestige', 4.5], ['Adams Arcade', 5.5], ['Dagoretti Corner', 7.5], ['Junction', 8.5], ['Karen', 13]]),
  route('nairobi-thika-road', 'nairobi', 'Odeon – Githurai 45', 'Thika Road', 'matatu',
    [['Odeon', 0], ['Ngara', 1.5], ['Pangani', 3], ['Allsops', 6], ['Roysambu', 10], ['Githurai 45', 16]]),
  route('kampala-ntinda', 'kampala', 'Old Taxi Park – Kiwatule', 'the Kira Road', 'taxi',
    [['Old Taxi Park', 0], ['Wandegeya', 2.5], ['Kamwokya', 4], ['Bukoto', 5.5], ['Ntinda', 7.5], ['Kiwatule', 9.5]]),
  route('dar-morogoro-road', 'dar-es-salaam', 'Posta – Ubungo', 'Morogoro Road', 'daladala',
    [['Posta', 0], ['Kariakoo', 2], ['Magomeni', 5], ['Manzese', 8], ['Ubungo', 10]]),
])

const BY_ID = new Map(DANFO_ROUTES.map((item) => [item.id, item]))
export const routeById = (id: unknown): DanfoRoute | undefined => (typeof id === 'string' ? BY_ID.get(id) : undefined)
export const routesFor = (city: string): DanfoRoute[] => DANFO_ROUTES.filter((item) => item.city === city)
/** The cities with at least one line. */
export const DANFO_CITIES: readonly string[] = Object.freeze([...new Set(DANFO_ROUTES.map((item) => item.city))])

/** Game metres from stop `i - 1` to stop `i` (i ≥ 1). */
export function legMetres(line: DanfoRoute, i: number): number {
  const a = line.stops[i - 1], b = line.stops[i]
  return a && b ? Math.round(LEG_BASE_M + Math.max(0, b.km - a.km) * LEG_M_PER_KM) : 0
}
/** Where each stop is on the game road, in metres from the park (stop 0 is at 0). */
export function stopMetres(line: DanfoRoute): number[] {
  const out = [0]
  for (let i = 1; i < line.stops.length; i++) out.push(out[i - 1]! + legMetres(line, i))
  return out
}
/** The whole game road, metres. */
export const routeMetres = (line: DanfoRoute): number => stopMetres(line).at(-1) ?? 0

/**
 * The least time, in ms from the start, in which stop `i` can be reached at the top speed (with 15% to spare for clocks), plus the dwell at
 * every stop served before it. The server compares a stop's report with this; a browser cannot be faster without being changed.
 */
export function minRunMs(line: DanfoRoute, i: number, servedBefore: number): number {
  const metres = stopMetres(line)[Math.min(Math.max(0, i), line.stops.length - 1)] ?? 0
  return Math.floor((metres / MAX_SPEED) * 1000 * 0.85 + Math.max(0, servedBefore) * DWELL_MS)
}
/** A good time for the whole line: driving at about 13 m/s and four seconds at every stop. Beating it earns the time bonus. */
export const targetMs = (line: DanfoRoute): number => Math.round((routeMetres(line) / 13) * 1000 + (line.stops.length - 1) * 4000)

/** One passenger's fare for riding from stop `from` to stop `to`. */
export const fareFor = (from: number, to: number): number => Math.min(FARE.max, FARE.base + FARE.perStop * Math.max(1, to - from))
