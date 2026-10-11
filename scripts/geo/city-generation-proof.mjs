#!/usr/bin/env node
/**
 * Offline proof and flat diagnostic renderer for one generated foreign city.
 *
 * Usage:
 *   node city-generation-proof.mjs --worktree <checkout> --city windhoek --outdir <evidence-dir>
 *
 * It loads the generated city modules, runs the repository polygon and Three.js triangulation checks,
 * builds the real CityPack, records source-point/bounds/water/road diagnostics, and writes JSON plus an SVG
 * converted to PNG by rsvg-convert on Linux or sips on macOS. The PNG is diagnostic evidence; it is not visual acceptance.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const arg = (name, fallback = undefined) => {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : fallback
}
const worktree = resolve(arg('worktree', process.cwd()))
const cityId = arg('city')
const outdir = resolve(arg('outdir'))
if (!cityId || !outdir) throw new Error('Usage: --worktree <checkout> --city <id> --outdir <directory>')
const cityDir = join(worktree, 'src/game/cities', cityId)
const importFile = file => `file://${join(cityDir, file)}`
const { firstPolygonProblem, firstTriangulationProblem, signedArea } = await import(`file://${join(worktree, 'src/game/cities/africa/polygonCheck.ts')}`)
const { toLocal } = await import(`file://${join(worktree, 'src/geo/frame.ts')}`)
const { validateDestinationFacts } = await import(`file://${join(worktree, 'src/game/cities/africa/types.ts')}`)
const { FACTS } = await import(importFile('facts.ts'))
const { GEOMETRY } = await import(importFile('geometry.ts'))
const { TERRAIN } = await import(importFile('terrain.ts'))
const { PLACES } = await import(importFile('places.ts'))
const { city } = await import(importFile('index.ts'))
const valid = validateDestinationFacts(FACTS)
const origin = valid.mapOrigin
const project = point => toLocal(origin, point[0], point[1])
const layers = { land: GEOMETRY.land, playArea: GEOMETRY.playArea ?? (GEOMETRY.playAreaFromSurfaces ? [...GEOMETRY.land, ...TERRAIN.water] : []), water: TERRAIN.water, reachWater: TERRAIN.reachWater ?? [] }
const polygonProof = Object.fromEntries(Object.entries(layers).map(([name, polygons]) => {
  const problem = firstPolygonProblem(polygons)
  const triangulation = firstTriangulationProblem(polygons, project)
  const rings = polygons.reduce((sum, polygon) => sum + polygon.length, 0)
  const holes = polygons.reduce((sum, polygon) => sum + Math.max(0, polygon.length - 1), 0)
  const area = polygons.reduce((sum, polygon) => sum + Math.abs(signedArea(polygon[0])) - polygon.slice(1).reduce((inner, hole) => inner + Math.abs(signedArea(hole)), 0), 0)
  return [name, { polygons: polygons.length, rings, holes, areaSquareDegrees: area, polygonProblem: problem, triangulationProblem: triangulation }]
}))

const inRing = ([x, y], ring) => {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j]
    if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside
  }
  return inside
}
const inPolygons = (point, polygons) => polygons.some(polygon => inRing(point, polygon[0]) && !polygon.slice(1).some(hole => inRing(point, hole)))
const [west, south, east, north] = FACTS.bounds
const pointReport = (label, points) => {
  const outsideBounds = points.filter(point => point.lon < west || point.lon > east || point.lat < south || point.lat > north).map(point => ({ name: point.name, lon: point.lon, lat: point.lat }))
  const wet = points.filter(point => inPolygons([point.lon, point.lat], TERRAIN.water)).map(point => ({ name: point.name, lon: point.lon, lat: point.lat }))
  return { label, count: points.length, outsideBounds, wet }
}
const placePoints = PLACES.map(place => ({ name: place.name, lon: place.lon, lat: place.lat, osm: place.osm }))
const labelPoints = TERRAIN.names.map(label => ({ name: label.name, lon: label.lon, lat: label.lat, kind: label.kind }))
const airportPoint = [{ name: FACTS.airport.name, lon: FACTS.airport.lon, lat: FACTS.airport.lat, kind: 'airport' }]
const pack = await (await city.loadMap()).loadScene()
const content = await city.loadContent()
const venueNames = new Map(content.venues.map(venue => [venue.id, venue.name]))
const roadPoints = pack.roads.flatMap(road => road.points)
const ground = { minX: pack.bounds.minX, maxX: pack.bounds.maxX, minZ: pack.bounds.minZ, maxZ: pack.bounds.maxZ }
const roadCoverage = roadPoints.length ? roadPoints.filter(([x, z]) => x >= ground.minX && x <= ground.maxX && z >= ground.minZ && z <= ground.maxZ).length / roadPoints.length : 0
const diagnostics = {
  city: { id: FACTS.id, name: FACTS.name, bounds: FACTS.bounds, airport: FACTS.airport },
  polygonProof,
  sourcePoints: {
    places: pointReport('places', placePoints),
    labels: pointReport('land names', labelPoints.filter(point => point.kind !== 'water')),
    waterLabels: pointReport('water names', labelPoints.filter(point => point.kind === 'water')),
    airport: pointReport('airport', airportPoint),
  },
  pack: {
    ground,
    landPolygons: pack.land.length,
    waterPolygons: pack.water.length,
    roads: pack.roads.length,
    roadPoints: roadPoints.length,
    roadPointCoverageWithinGround: roadCoverage,
    districts: pack.districts.length,
    places: Object.keys(pack.sites).length,
    placeLabels: Object.fromEntries(Object.entries(pack.sites).map(([id, point]) => [id, { name: venueNames.get(id) ?? id, ...point }])),
  },
}

const width = 1600, height = 1100, margin = 36
const viewMode = arg('view', 'ground')
if (!['ground', 'city'].includes(viewMode)) throw new Error('--view must be ground or city')
const view = { x: margin, y: margin, width: width - margin * 2, height: height - margin * 2 }
const actual = viewMode === 'city' ? pack.bounds.fit : ground
const actualWidth = Math.max(1, actual.maxX - actual.minX)
const actualHeight = Math.max(1, actual.maxZ - actual.minZ)
const padding = viewMode === 'city' ? 0.08 : 0
const plot = {
  minX: actual.minX - actualWidth * padding,
  maxX: actual.maxX + actualWidth * padding,
  minZ: actual.minZ - actualHeight * padding,
  maxZ: actual.maxZ + actualHeight * padding,
}
const plotWidth = Math.max(1, plot.maxX - plot.minX)
const plotHeight = Math.max(1, plot.maxZ - plot.minZ)
const worldScale = Math.min(view.width / plotWidth, view.height / plotHeight)
const plotRect = {
  x: view.x + (view.width - plotWidth * worldScale) / 2,
  y: view.y + (view.height - plotHeight * worldScale) / 2,
  width: plotWidth * worldScale,
  height: plotHeight * worldScale,
}
const groundRect = {
  x: plotRect.x + (ground.minX - plot.minX) * worldScale,
  y: plotRect.y + (ground.minZ - plot.minZ) * worldScale,
  width: (ground.maxX - ground.minX) * worldScale,
  height: (ground.maxZ - ground.minZ) * worldScale,
}
diagnostics.render = { view: viewMode, viewBounds: actual, actualGroundBounds: ground, plotBounds: plot, plotRect, groundRect, worldScale }
const svgPoint = (x, z) => [
  plotRect.x + (x - plot.minX) * worldScale,
  plotRect.y + (z - plot.minZ) * worldScale,
]
const esc = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character])
const lineFor = points => points.map((point, index) => { const [x, y] = svgPoint(point[0], point[1]); return `${index ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}` }).join(' ')
const polygonPath = rings => rings.map(ring => `${lineFor(ring)} Z`).join(' ')
const fixedLandParts = pack.land.map(entry => `<path d="${polygonPath([entry.points, ...(entry.holes ?? [])])}" fill="#bcd596" fill-rule="evenodd" stroke="#788d61" stroke-width="1"/>`).join('')
const waterParts = pack.water.map(entry => `<path d="${polygonPath([entry.points, ...(entry.holes ?? [])])}" fill="#4faacb" fill-rule="evenodd" stroke="#267f9e" stroke-width="1"/>`).join('')
const roadParts = pack.roads.map(road => `<path d="${lineFor(road.points)}" fill="none" stroke="${road.major ? '#454b52' : '#727983'}" stroke-width="${road.major ? 2.4 : 1.1}" stroke-linecap="round"/>`).join('')
const nameParts = pack.districts.map(district => { const [x, y] = svgPoint(district.x, district.z); return `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="700" fill="#1f4d2d">${esc(district.name)}</text>` }).join('')
const placeParts = Object.entries(pack.sites).map(([id, point]) => { const [x, y] = svgPoint(point.x, point.z); return `<g><circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4" fill="#c0392b" stroke="#fff" stroke-width="1"/><text x="${(x + 6).toFixed(2)}" y="${(y - 6).toFixed(2)}" font-family="sans-serif" font-size="10" fill="#5b1d16">${esc(venueNames.get(id) ?? id)}</text></g>` }).join('')
const neutral = '#f3efe5'
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><clipPath id="map-viewport"><rect x="${plotRect.x.toFixed(2)}" y="${plotRect.y.toFixed(2)}" width="${plotRect.width.toFixed(2)}" height="${plotRect.height.toFixed(2)}"/></clipPath></defs><rect x="0" y="0" width="${width}" height="${height}" fill="${neutral}"/><rect x="${plotRect.x.toFixed(2)}" y="${plotRect.y.toFixed(2)}" width="${plotRect.width.toFixed(2)}" height="${plotRect.height.toFixed(2)}" fill="#ff00ff"/><g clip-path="url(#map-viewport)"><rect x="${groundRect.x.toFixed(2)}" y="${groundRect.y.toFixed(2)}" width="${groundRect.width.toFixed(2)}" height="${groundRect.height.toFixed(2)}" fill="${pack.surround ?? '#bcd596'}"/><g>${fixedLandParts}</g><g>${waterParts}</g><g>${roadParts}</g><g>${nameParts}</g><g>${placeParts}</g></g><text x="${margin}" y="24" font-family="sans-serif" font-size="18" font-weight="700" fill="#20232c">${esc(FACTS.name)} diagnostic flat map — ${viewMode} view, ground, land holes, water, roads, names, places</text></svg>`
mkdirSync(outdir, { recursive: true })
const svgPath = join(outdir, `${cityId}-flat.svg`), pngPath = join(outdir, `${cityId}-flat.png`), jsonPath = join(outdir, `${cityId}-proof.json`)
writeFileSync(svgPath, svg)
if (process.platform === 'darwin') execFileSync('/usr/bin/sips', ['-s', 'format', 'png', svgPath, '--out', pngPath], { stdio: 'ignore' })
else execFileSync('rsvg-convert', ['--width', String(width), '--height', String(height), '--output', pngPath, svgPath], { stdio: 'inherit' })
writeFileSync(jsonPath, `${JSON.stringify(diagnostics, null, 2)}\n`)
console.log(JSON.stringify({ city: cityId, json: jsonPath, svg: svgPath, png: pngPath, polygonProblems: Object.values(polygonProof).filter(layer => layer.polygonProblem || layer.triangulationProblem).length, outsidePlaces: diagnostics.sourcePoints.places.outsideBounds.length, wetPlaces: diagnostics.sourcePoints.places.wet.length, roadCoverage: roadCoverage }, null, 2))

process.exitCode = Object.values(polygonProof).some(layer => layer.polygonProblem || layer.triangulationProblem) || Object.entries(diagnostics.sourcePoints).some(([kind, points]) => points.outsideBounds.length || (kind !== 'waterLabels' && points.wet.length)) || roadCoverage < 1 ? 1 : 0
