import { createDestinationModule } from '../africa/module.ts'
import { FACTS } from './facts.ts'
export const city = createDestinationModule(FACTS, async () => (await import('#city-map/villa-las-estrellas')).CITY_MAP, async () => (await import('./content.ts')).CONTENT)
