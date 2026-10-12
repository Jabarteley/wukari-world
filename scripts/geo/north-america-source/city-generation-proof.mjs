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

const width = 2000, height = 1300, margin = 36, legendWidth = 520, gap = 24
const viewMode = arg('view', 'ground')
if (!['ground', 'city'].includes(viewMode)) throw new Error('--view must be ground or city')
const mapViewWidth = width - margin * 2 - legendWidth - gap
const view = { x: margin, y: margin, width: mapViewWidth, height: height - margin * 2 }
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
diagnostics.render = { view: viewMode, viewBounds: actual, actualGroundBounds: ground, plotBounds: plot, plotRect, groundRect, worldScale, labelLayout: 'numbered non-overlapping markers with complete right-side legend; source coordinates unchanged', canvas: { width, height, legendWidth, gap } }
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
const entries = [
  ...pack.districts.map((district, index) => ({ kind: 'district', key: `D${String(index + 1).padStart(2, '0')}`, name: district.name, x: district.x, z: district.z })),
  ...Object.entries(pack.sites).map(([id, point], index) => ({ kind: 'venue', key: `V${String(index + 1).padStart(2, '0')}`, name: venueNames.get(id) ?? id, x: point.x, z: point.z })),
]
const badges = [], markerParts = []
for (const entry of entries) {
  const [homeX, homeY] = svgPoint(entry.x, entry.z)
  const fits = (x, y) => x >= plotRect.x + 12 && x <= plotRect.x + plotRect.width - 12 && y >= plotRect.y + 12 && y <= plotRect.y + plotRect.height - 12
  let chosen = fits(homeX, homeY) && badges.every(badge => Math.abs(homeX - badge.x) >= 29 || Math.abs(homeY - badge.y) >= 27) ? { x: homeX, y: homeY } : null
  search: for (let radius = 32; !chosen && radius <= 360; radius += 18) for (let step = 0; step < 32; step++) {
    const angle = step * 2 * Math.PI / 32, x = homeX + Math.cos(angle) * radius, y = homeY + Math.sin(angle) * radius
    if (fits(x, y) && badges.every(badge => Math.abs(x - badge.x) >= 29 || Math.abs(y - badge.y) >= 27)) { chosen = { x, y }; break search }
  }
  if (!chosen) throw new Error(`Diagnostic marker placement overflow for ${entry.key}; enlarge map frame`)
  badges.push(chosen)
  if (Math.hypot(homeX - chosen.x, homeY - chosen.y) > 4) markerParts.push(`<path d="M${homeX.toFixed(1)} ${homeY.toFixed(1)}L${chosen.x.toFixed(1)} ${chosen.y.toFixed(1)}" stroke="#374151" stroke-width="1"/>`)
  const fill = entry.kind === 'district' ? '#1f4d2d' : '#a83226'
  markerParts.push(`<g aria-label="${entry.key}: ${esc(entry.name)}"><circle cx="${chosen.x.toFixed(1)}" cy="${chosen.y.toFixed(1)}" r="12" fill="${fill}" stroke="#fff" stroke-width="2"/><text x="${chosen.x.toFixed(1)}" y="${(chosen.y + 3.5).toFixed(1)}" text-anchor="middle" font-family="sans-serif" font-size="8" font-weight="700" fill="#fff">${entry.key}</text></g>`)
}
const wrap = (text, max = 61) => {
  const lines = []; let line = ''
  for (const word of String(text).split(/\s+/)) { const next = line ? `${line} ${word}` : word; if (next.length > max && line) { lines.push(line); line = word } else line = next }
  if (line) lines.push(line)
  return lines
}
const legendX = margin + mapViewWidth + gap, legendY = margin + 54, legendLine = 18
let legendCursor = legendY
const legendParts = [`<text x="${legendX}" y="${margin + 24}" font-family="sans-serif" font-size="17" font-weight="700" fill="#20232c">Mexico City · complete marker key</text>`, `<text x="${legendX}" y="${margin + 44}" font-family="sans-serif" font-size="11" fill="#5b6470">Districts and venues · source names unchanged</text>`]
for (const entry of entries) {
  const lines = wrap(`${entry.key} · ${entry.name}`)
  if (legendCursor + lines.length * legendLine > height - margin) throw new Error(`Diagnostic legend overflow for ${entry.key}`)
  for (const line of lines) { legendParts.push(`<text x="${legendX}" y="${legendCursor}" font-family="sans-serif" font-size="12" fill="#20232c">${esc(line)}</text>`); legendCursor += legendLine }
  legendCursor += 2
}
const markerLegend = legendParts.join('')
const neutral = '#f3efe5'
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><clipPath id="map-viewport"><rect x="${plotRect.x.toFixed(2)}" y="${plotRect.y.toFixed(2)}" width="${plotRect.width.toFixed(2)}" height="${plotRect.height.toFixed(2)}"/></clipPath></defs><rect x="0" y="0" width="${width}" height="${height}" fill="${neutral}"/><rect x="${plotRect.x.toFixed(2)}" y="${plotRect.y.toFixed(2)}" width="${plotRect.width.toFixed(2)}" height="${plotRect.height.toFixed(2)}" fill="#ff00ff"/><g clip-path="url(#map-viewport)"><rect x="${groundRect.x.toFixed(2)}" y="${groundRect.y.toFixed(2)}" width="${groundRect.width.toFixed(2)}" height="${groundRect.height.toFixed(2)}" fill="${pack.surround ?? '#bcd596'}"/><g>${fixedLandParts}</g><g>${waterParts}</g><g>${roadParts}</g><g>${markerParts.join('')}</g></g><g>${markerLegend}</g><text x="${margin}" y="24" font-family="sans-serif" font-size="18" font-weight="700" fill="#20232c">${esc(FACTS.name)} diagnostic map · ${viewMode} view · numbered source locations with complete legend</text></svg>`
mkdirSync(outdir, { recursive: true })
const svgPath = join(outdir, `${cityId}-flat.svg`), pngPath = join(outdir, `${cityId}-flat.png`), jsonPath = join(outdir, `${cityId}-proof.json`)
writeFileSync(svgPath, svg)
if (process.platform === 'darwin') execFileSync('/usr/bin/sips', ['-s', 'format', 'png', svgPath, '--out', pngPath], { stdio: 'ignore' })
else execFileSync('rsvg-convert', ['--width', String(width), '--height', String(height), '--output', pngPath, svgPath], { stdio: 'inherit' })
writeFileSync(jsonPath, `${JSON.stringify(diagnostics, null, 2)}\n`)
console.log(JSON.stringify({ city: cityId, json: jsonPath, svg: svgPath, png: pngPath, polygonProblems: Object.values(polygonProof).filter(layer => layer.polygonProblem || layer.triangulationProblem).length, outsidePlaces: diagnostics.sourcePoints.places.outsideBounds.length, wetPlaces: diagnostics.sourcePoints.places.wet.length, roadCoverage: roadCoverage }, null, 2))

process.exitCode = Object.values(polygonProof).some(layer => layer.polygonProblem || layer.triangulationProblem) || Object.entries(diagnostics.sourcePoints).some(([kind, points]) => points.outsideBounds.length || (kind !== 'waterLabels' && points.wet.length)) || roadCoverage < 1 ? 1 : 0
