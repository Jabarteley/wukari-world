// The character creator's code, once the world city network it reads is in: its Home step lists every country, state and city
// (placesModel.ts reads the catalogue as it loads), so the network is fetched first (src/game/cities/registry.ts loadCityNetwork).
import { loadCityNetwork } from '../../../game/cities/registry.ts'

export const loadCreatorApp = (): Promise<typeof import('./CreatorApp.vue')> => loadCityNetwork().then(() => import('./CreatorApp.vue'))
export const loadOnboardingApp = (): Promise<typeof import('./OnboardingApp.vue')> => loadCityNetwork().then(() => import('./OnboardingApp.vue'))
