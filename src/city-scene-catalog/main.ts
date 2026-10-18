import './style.css'
import { countryUrl, matches, neighbours, publicVenues, readRoute, sceneUrl } from './model.ts'
import { resourceSlot } from './lifetime.ts'
import type { CatalogueCity, CatalogueCountry } from './model.ts'
import type { Viewer } from './renderer.ts'

const root = document.getElementById('catalogue')!
const resources = resourceSlot()
let revision = 0, index: CatalogueCountry[] | undefined
const fingerprints = new Map<string, { name: string; url: string }[]>()
function element<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag); node.textContent = text; if (className) node.className = className; return node
}
function link(text: string, url: string, className = '') { const node = element('a', text, className); node.href = url; return node }
function button(text: string, action: () => void) { const node = element('button', text); node.type = 'button'; node.addEventListener('click', action); return node }
function errorPanel(parent: HTMLElement, error: unknown, retry: () => void) {
  const panel = element('section', '', 'error'); panel.setAttribute('role', 'alert')
  panel.append(element('h2', 'This view could not load'), element('p', error instanceof Error ? error.message : String(error)), button('Try again', retry)); parent.append(panel)
}
function shell(title: string) {
  const header = element('header', '', 'masthead'); header.append(link('ALLWORLD', '/county', 'wordmark'), element('span', 'World scene catalogue'))
  const nav = element('nav', '', 'breadcrumbs'); nav.setAttribute('aria-label', 'Breadcrumb'); nav.append(link('Countries', '/county'))
  const main = element('main'); main.id = 'main'
  const heading = element('h1', title); heading.tabIndex = -1; main.append(heading)
  const skip = link('Skip to content', '#main', 'skip')
  root.replaceChildren(skip, header, nav, main)
  document.title = `${title} · Allworld scene catalogue`
  return { main, nav, heading }
}
function search(parent: HTMLElement, label: string, update: (query: string) => void) {
  const field = element('label', label, 'search-label'), input = element('input'); input.type = 'search'; input.placeholder = label; field.append(input); parent.append(field)
  input.addEventListener('input', () => update(input.value))
}
function summary(parent: HTMLElement, text: string) { parent.append(element('p', text, 'intro')) }
function adjacent(parent: HTMLElement, items: ReturnType<typeof neighbours<CatalogueCity>>, venue?: string) {
  const nav = element('nav', '', 'step-links'); nav.setAttribute('aria-label', 'Other cities')
  if (items.previous) nav.append(link(`← ${items.previous.name}`, sceneUrl(items.previous.id, venue)))
  if (items.next) nav.append(link(`${items.next.name} →`, sceneUrl(items.next.id, venue)))
  parent.append(nav)
}
async function render(focus = false) {
  const own = ++revision; resources.clear()
  let view = shell('World scene catalogue')
  const status = element('p', 'Loading the country and city index…', 'status'); status.setAttribute('role', 'status'); view.main.append(status)
  try {
    const route = readRoute(new URL(location.href))
    index ??= await (await import('./data.ts')).loadCatalogue()
    if (own !== revision) return
    const allCities = index.flatMap(country => country.cities)
    if (route.page === 'countries') {
      view = shell('Countries')
      summary(view.main, `${index.length} country identities · ${allCities.length} playable cities. Browse the real places and inspect the scenes currently used in Allworld.`)
      view.main.append(element('p', 'Country identities follow city content, including territories that share a map entry. Scene uniqueness has not been certified.', 'note'))
      const results = element('p', '', 'result-count'); results.setAttribute('role', 'status')
      const grid = element('ul', '', 'card-grid')
      const update = (query: string) => {
        grid.replaceChildren()
        const rows = index!.filter(country => matches(query, country.name, country.id, ...country.cities.map(city => city.name)))
        for (const country of rows) { const card = element('li'); const a = link('', countryUrl(country.id), 'card'); a.append(element('span', country.id.toUpperCase(), 'eyebrow'), element('h2', country.name), element('p', `${country.cities.length} playable ${country.cities.length === 1 ? 'city' : 'cities'}`)); card.append(a); grid.append(card) }
        results.textContent = rows.length ? `${rows.length} countries shown` : 'No countries match. Try a country code or city name.'
      }
      search(view.main, 'Search countries or cities', update); view.main.append(results, grid); update('')
    } else if (route.page === 'cities' || (route.page === 'scenes' && !route.cityId)) {
      const countryId = route.page === 'cities' ? route.countryId : null
      const country = countryId ? index.find(item => item.id === countryId) : undefined
      if (countryId && !country) throw new Error('This country is not in the catalogue. Choose a country from the list.')
      const available = country?.cities ?? [...allCities].sort((a, b) => a.name.localeCompare(b.name, 'en'))
      view = shell(country?.name ?? 'Cities'); if (country) view.nav.append(element('span', ' / '), element('span', country.name))
      summary(view.main, `${available.length} playable ${available.length === 1 ? 'city' : 'cities'}. Choose a city to browse its public scenes. City content loads only when you open a city.`)
      const results = element('p', '', 'result-count'); results.setAttribute('role', 'status'); const grid = element('ul', '', 'card-grid')
      let selectedCountry = '', searchText = ''
      const update = (query: string) => {
        searchText = query
        grid.replaceChildren(); const rows = available.filter(city => (!selectedCountry || city.countryId === selectedCountry) && matches(query, city.name, city.region, city.id, city.countryName))
        for (const city of rows) { const card = element('li'); const a = link('', sceneUrl(city.id), 'card'); a.append(element('span', country ? city.region : city.countryName, 'eyebrow'), element('h2', city.name), element('p', 'Browse public scenes →')); card.append(a); grid.append(card) }
        results.textContent = rows.length ? `${rows.length} cities shown` : 'No cities match your search.'
      }
      search(view.main, 'Search cities', update)
      if (!country) {
        const label = element('label', 'Country', 'scene-select'), filter = element('select'); filter.add(new Option('All countries', ''))
        for (const item of index) filter.add(new Option(`${item.name} (${item.cities.length})`, item.id))
        filter.addEventListener('change', () => { selectedCountry = filter.value; update(searchText) }); label.append(filter); view.main.append(label)
      }
      view.main.append(results, grid); update('')
    } else {
      const city = allCities.find(item => item.id === route.cityId)
      if (!city) throw new Error('Choose a playable city from the country catalogue.')
      view = shell(city.name)
      view.nav.append(element('span', ' / '), link(city.countryName, countryUrl(city.countryId)), element('span', ` / ${city.name}`))
      adjacent(view.main, neighbours([...allCities].sort((a, b) => a.name.localeCompare(b.name, 'en')), city.id))
      const loading = element('p', `Loading ${city.name}’s public venues…`, 'status'); loading.setAttribute('role', 'status'); view.main.append(loading)
      const content = await (await import('./data.ts')).loadCityContent(city.id)
      if (own !== revision) return
      loading.remove()
      const venues = publicVenues(content)
      summary(view.main, `${venues.length} public scenes in ${city.name}. Private homes and player state are outside this catalogue.`)
      if (!route.venueId) {
        const results = element('p', '', 'result-count'); results.setAttribute('role', 'status'); const grid = element('ul', '', 'card-grid')
        const update = (query: string) => {
          grid.replaceChildren(); const rows = venues.filter(venue => matches(query, venue.name, venue.kind, venue.id))
          for (const venue of rows) { const card = element('li'); const a = link('', sceneUrl(city.id, venue.id), 'card'); a.append(element('span', venue.definition.scene.kind, 'eyebrow'), element('h2', venue.name), element('p', venue.definition.description), element('small', `${venue.definition.scene.design ? 'Parametric configuration' : venue.definition.scene.variant ? `Requested variant: ${venue.definition.scene.variant}` : 'Kind configuration'} · source resolved on open`)); card.append(a); grid.append(card) }
          results.textContent = `${rows.length} scenes shown${rows.length ? '' : ' — no matches'}`
        }
        search(view.main, 'Search scenes', update); view.main.append(results, grid); update('')
      } else {
        const venue = venues.find(item => item.id === route.venueId)
        if (!venue) throw new Error('This public venue is not in the selected city. Use the city scene list to choose another.')
        view.main.append(link('← All scenes in this city', sceneUrl(city.id)))
        view.main.append(element('h2', venue.name, 'scene-title'), element('p', venue.definition.description, 'intro'))
        const selection = element('label', 'Scene', 'scene-select'), select = element('select')
        for (const item of venues) select.add(new Option(`${item.name} · ${item.definition.scene.kind}`, item.id, false, item.id === venue.id))
        select.addEventListener('change', () => navigate(sceneUrl(city.id, select.value))); selection.append(select); view.main.append(selection)
        const around = neighbours(venues, venue.id), steps = element('nav', '', 'step-links'); steps.setAttribute('aria-label', 'Other scenes')
        if (around.previous) steps.append(link('← Previous scene', sceneUrl(city.id, around.previous.id)))
        if (around.next) steps.append(link('Next scene →', sceneUrl(city.id, around.next.id)))
        view.main.append(steps)
        const stage = element('div', '', 'stage'), stageStatus = element('p', 'Loading the actual scene renderer…', 'status'); stageStatus.setAttribute('role', 'status')
        const controls = element('div', '', 'camera-controls'), details = element('section', '', 'inspection'), metrics = element('p', '', 'metrics'), fingerprint = element('div', '', 'fingerprint')
        details.append(element('h2', 'Scene inspection'), element('p', `Kind: ${venue.definition.scene.kind} · Variant: ${venue.definition.scene.variant || 'default'}`), metrics)
        view.main.append(stageStatus, stage, controls, details, fingerprint)
        let viewer: Viewer | null = null
        const operations: [string, () => void][] = [['Rotate left', () => viewer?.turn(-.25, 0)], ['Rotate right', () => viewer?.turn(.25, 0)], ['Look up', () => viewer?.turn(0, -.18)], ['Look down', () => viewer?.turn(0, .18)], ['Zoom in', () => viewer?.zoom(.8)], ['Zoom out', () => viewer?.zoom(1.25)], ['Reset camera', () => viewer?.reset()]]
        const buttons = operations.map(([label, action]) => button(label, action)); buttons.forEach(node => { node.disabled = true; controls.append(node) })
        controls.append(button('Reload scene', () => void render()))
        const inspect = button('Compare geometry snapshot', () => {
          if (!viewer) return
          const measured = viewer.fingerprint(), key = `${measured.key}:${measured.meshes}:${measured.vertices}`, prior = fingerprints.get(key) ?? [], url = sceneUrl(city.id, venue.id)
          fingerprint.replaceChildren(element('h3', `Geometry fingerprint ${measured.key}`), element('p', `${measured.meshes} visible static meshes · ${measured.vertices.toLocaleString()} vertices. Names, material colours and texture pixels are not hashed; sign geometry can still affect the snapshot. Camera visibility and asynchronous assets can change it; animation and hidden geometry are not represented, and hash collisions are possible. This is a comparison aid, not proof of geometric uniqueness.`))
          const others = prior.filter(item => item.url !== url)
          if (others.length) { fingerprint.append(element('p', 'Matching snapshots inspected in this session:')); for (const item of others) fingerprint.append(link(item.name, item.url, 'match-link')) }
          else fingerprint.append(element('p', 'No matching snapshot inspected in this session. No uniqueness conclusion.'))
          if (!prior.some(item => item.url === url)) fingerprints.set(key, [...prior, { name: `${city.name} / ${venue.name}`, url }])
        }); inspect.disabled = true; controls.append(inspect)
        try {
          const opened = await resources.replace(async isCurrent => {
            const module = await import('./renderer.ts')
            return module.openScene(stage, city.id, venue, isCurrent, values => {
              if (own !== revision) return
              metrics.textContent = `${values.triangles.toLocaleString()} rendered triangles · ${values.drawCalls} draw calls · ${values.meshes} scene meshes · ${values.anchors} anchors. ${values.runtimeStatus}`
            })
          })
          if (!opened || own !== revision) return
          viewer = opened
          if (opened.locations?.length) {
            const label = element('label', 'Campus area', 'scene-select'), areas = element('select')
            const placeholder = new Option('Choose campus area', '', true, true); placeholder.disabled = true; areas.add(placeholder)
            for (const area of opened.locations) areas.add(new Option(area.label, area.id))
            areas.addEventListener('change', () => { if (areas.value && !opened.selectLocation?.(areas.value)) stageStatus.textContent = 'This campus anchor is not on an available walk surface. Choose another area.'; else if (areas.value) stageStatus.textContent = 'Campus area loaded. Drag to orbit.' })
            label.append(areas); stage.before(label)
          }
          stageStatus.textContent = 'Scene loaded. Drag to orbit or use the camera controls.'
          buttons.forEach(node => { node.disabled = false }); inspect.disabled = false
          details.append(element('p', opened.evidence.source, 'source'), element('p', opened.evidence.detail), element('p', `Builder group: ${opened.evidence.group}`, 'note'))
        } catch (error) { if (own !== revision) return; stageStatus.textContent = 'Scene unavailable'; errorPanel(details, error, () => void render()) }
      }
    }
    if (focus && own === revision) view.heading.focus({ preventScroll: true })
  } catch (error) { if (own === revision) { view.main.querySelector('.status')?.remove(); errorPanel(view.main, error, () => void render()) } }
}
function navigate(url: string) { history.pushState(null, '', url); scrollTo(0, 0); void render(true) }
root.addEventListener('click', event => {
  if (!(event instanceof MouseEvent) || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const target = event.target instanceof Element ? event.target.closest('a') : null
  if (!(target instanceof HTMLAnchorElement) || target.hash || target.origin !== location.origin) return
  event.preventDefault(); navigate(target.href)
})
window.addEventListener('popstate', () => void render(true))
window.addEventListener('pagehide', () => { ++revision; resources.clear() })
window.addEventListener('pageshow', event => { if (event.persisted) void render() })
void render()
