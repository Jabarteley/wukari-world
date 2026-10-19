// The Vue panels. Each takes the place of the existing panel with the same id (state/panels.ts);
// its component is fetched the first time it is opened, so the entry chunk carries only this
// metadata — the same split the existing lazy panel groups make.
import { lazyPanel, phonePanel } from '../state/panelFactories.ts'
import type { VuePanel } from '../types/panel.ts'
import { reportReplies } from '../../ui/phone/reports.ts'
import { social } from './social/useSocial.ts'
import { billsDue } from './bank/bankModel.ts'
import { messagesBadge, notificationLines } from './messages/messagesModel.ts'
import { noticeMarks } from './messages/messageBadges.ts'
import { scene as homeScene } from './home/homeState.ts'
import { CIVIC_APPS, CIVIC_HUD } from './civic/register.ts'
import { GROWTH_HUD_PANELS, GROWTH_PANELS } from './growth/register.ts'
import { CAMPUS_PANELS } from './campus/register.ts'
import { TABLES_PANELS } from './tables/register.ts'
import { GAMES_PANELS } from './games/register.ts'
import { WORLD_PANELS } from './world/register.ts'
import { SOCIAL_PANELS } from './social/register.ts'
import { START_PANELS } from './start/register.ts'
import { TRAVEL_PANELS } from './travel/register.ts'
import { ACCOUNT_PANELS } from './account/register.ts'
import { COMMERCE_PANELS } from './commerce/register.ts'
import { BUSINESS_PANELS } from './business/register.ts'
import { MARKET_PANELS } from './market/register.ts'
import { SHOWCASE_PANELS } from './showcase/register.ts'
import { POLITICS_PANELS } from './politics/register.ts'
import { ADMIN_PANELS } from './admin/register.ts'
import { LIVING_WORLD_PANELS } from './living-world/register.ts'
import { PASSPORT_PANELS } from './passport/register.ts'
import { FEED_PANELS } from './feed/register.ts'
import { bodyLoader } from '../state/panelBody.ts'

export const bank = phonePanel('bank', 'Bank', bodyLoader('bank/BankApp'), {
  icon: '🏦', order: 14, group: 'money', badge: billsDue,
})

export const messages = phonePanel('messages', 'Messages', bodyLoader('messages/MessagesApp'), {
  icon: '✉️', order: 12, group: 'people',
  badge: (_state, view) => messagesBadge(social.me, view.connected, noticeMarks.fresh(view.session?.id ?? null, view.cityId, view.social?.notices)),
  notifications: (_state, view) => notificationLines(social.me, { connected: view.connected, now: view.now, notices: view.social?.notices, seen: noticeMarks.seen(view.session?.id ?? null, view.cityId) }),
})

/** Feedback: the public board for ideas and votes (features/feedback/board.ts), first on the phone's first page. */
export const feedback = phonePanel('feedback', 'Feedback', bodyLoader('feedback/FeedbackApp'), { icon: '💬', order: 1, group: 'life' })
export const support = phonePanel('support', 'Report a problem', bodyLoader('support/ReportApp'), { short: 'Report', icon: '🛟', order: 96, group: 'city', badge: () => reportReplies() })

export const jobs = phonePanel('jobs', 'Jobs', bodyLoader('jobs/JobsApp'), { order: 10, group: 'money' })

export const career = lazyPanel('career', 'Career', 'sim-tab', bodyLoader('jobs/CareerTab'), { order: 60, phone: true, group: 'money' })

export const statement = phonePanel('statement', 'Statement', bodyLoader('money/StatementApp'), { order: 15, group: 'money' })

export const invest = phonePanel('invest', 'Invest', bodyLoader('money/InvestApp'), { order: 50, group: 'money' })

export const houses = phonePanel('houses', 'Houses', bodyLoader('home/HousesApp'), { order: 30, group: 'life' })
// Worlds a player makes and the ones others opened (docs/WORLDS.md); the app says so when worlds are not switched on.
export const worlds = phonePanel('worlds', 'Worlds', bodyLoader('worlds/WorldsApp'), { order: 31, group: 'life' })

export const landPanel = phonePanel('land', 'My land', bodyLoader('neighbourhood/LandPanel'), { icon: 'home', order: 30.5, group: 'life' })

/** The Square and the rooms of group chats (src/places/model.ts): the doors of each. */
export const placesPanel = phonePanel('places', 'Places', () => import('./places/PlacesApp.vue'), { icon: 'globe', order: 11.5, group: 'people' })
/** The weekly world event and election night (docs/WORLD-EVENTS.md): the app, and the HUD chip shown around event time. Both lazy. */
export const worldEventPanel = phonePanel('world-event', 'World event', () => import('./world-events/WorldEventApp.vue'), { icon: 'sparkles', order: 11.55, group: 'people' })
// Watch together (docs/ALLWORLD-HOUSE.md): match-night predictions, Allworld House, artist premieres.
export const watchPanel = phonePanel('watch', 'Watch', bodyLoader('watch/WatchApp'), { icon: '📺', order: 11.56, group: 'people' })
export const worldEventChip = lazyPanel('world-event-chip', 'World event', 'hud', () => import('./world-events/WorldEventChip.vue'), { slot: 'alert', order: 4 })

/** What is being talked about in the city: short public lines from the world ledger, each with a Share button (docs/GIST.md). */
export const gistPanel = phonePanel('gist', 'Gist', () => import('./gist/GistApp.vue'), { icon: 'megaphone', order: 11.6, group: 'people' })

export const neighbourhoodPanel = phonePanel('neighbourhood', 'My street', bodyLoader('neighbourhood/NeighbourhoodPanel'), { icon: 'home', order: 31, group: 'life' })

export const stories = phonePanel('stories', 'Story scenes', bodyLoader('stories/StoriesApp'), { icon: 'sparkles', order: 53, group: 'life' })
export const storyChip = lazyPanel('story-chip', 'Story scene', 'hud', () => import('./stories/StoryChip.vue'), { order: 22 })

export const captureChip = lazyPanel('capture-chip', 'Recording', 'hud', () => import('./capture/CaptureChip.vue'), { slot: 'alert', order: 3 })

export const capture = phonePanel('capture', 'Capture', bodyLoader('capture/CaptureApp'), { icon: 'camera', order: 54, group: 'life' })

export const cars = phonePanel('cars', 'Cars', bodyLoader('home/CarsApp'), { order: 34, group: 'life' })

export const groceries = phonePanel('groceries', 'Groceries', bodyLoader('home/GroceriesApp'), { order: 16, group: 'life' })

export const health = phonePanel('health', 'Health', bodyLoader('life/HealthApp'), { order: 22, group: 'life',
  /** Sick or run down: something to act on. */
  badge: (_state, view) => (view.health?.sick || view.health?.rundown ? 1 : 0),
})

export const goals = lazyPanel('goals', 'Goals', 'sim-tab', bodyLoader('life/GoalsTab'), { order: 30, phone: true, group: 'life' })

export const profile = lazyPanel('profile', 'Profile', 'sim-tab', bodyLoader('sim/ProfileTab'), { order: 10, live: false })

export const needs = lazyPanel('needs', 'Needs', 'sim-tab', bodyLoader('sim/NeedsTab'), { order: 20 })

export const skills = lazyPanel('skills', 'Skills', 'sim-tab', bodyLoader('sim/SkillsTab'), { order: 40 })

export const settings = lazyPanel('settings', 'Settings', 'sim-tab', bodyLoader('sim/SettingsTab'), { order: 70, phone: true, group: 'life' })

export const boutique = phonePanel('boutique', 'Boutique', bodyLoader('life/BoutiqueApp'), { order: 32, group: 'life' })

export const healthChip = lazyPanel('health-chip', 'Health', 'hud', () => import('./life/HealthChip.vue'), { slot: 'alert', order: 6 })

export const weatherChip = lazyPanel('weather-chip', 'Weather', 'hud', () => import('./life/WeatherChip.vue'), { order: 6 })

export const goalChip = lazyPanel('goal-chip', 'Current goal', 'hud', () => import('./life/GoalChip.vue'), { icon: 'goals', slot: 'goal', order: 10 })

/** The standing "Settle in: get your home" entry for a guest (draws nothing once settled). */
export const settleChip = lazyPanel('settle-chip', 'Settle in', 'hud', () => import('./start/SettleEntry.vue'), { icon: 'home', slot: 'goal', order: 11 })

export const homeChip = lazyPanel('home-chip', 'Home', 'hud', () => import('./home/HomeChip.vue'), { icon: 'home', order: 20,
  /** A room that could not be drawn is something to act on (Try again); otherwise the chip is information for the tray. */
  slot: () => (homeScene.status === 'error' ? 'alert' : 'hud'),
})

/** A tapped piece of furniture at home: what it is, use it, move it, put it away or sell it (home/ItemSheet.vue). */
export const homeItem = lazyPanel('home-item', 'Item', 'modal', bodyLoader('home/ItemSheet'))

export const buy = lazyPanel('buy', 'Buy', 'nav', bodyLoader('home/BuyMode'), {
  /** Buy is only available at home; elsewhere the nav button is disabled with this reason. */
  enabled: (state) => social.me?.visiting ? 'Leave the visit before rearranging your furniture' : state.stories?.running ? 'End your scene before rearranging furniture' : state.location === 'home' || 'Go home to buy furniture',
})

export const NATIVE_PANELS: readonly VuePanel[] = [captureChip, placesPanel, gistPanel, worldEventPanel, watchPanel, worldEventChip, landPanel, stories, storyChip, neighbourhoodPanel, capture, bank, messages, support, jobs, career, statement, invest, houses, worlds, cars, groceries, health, goals, profile, needs, skills, settings, boutique, healthChip, weatherChip, goalChip, settleChip, homeChip, buy, homeItem, ...PASSPORT_PANELS, ...CIVIC_APPS, ...CIVIC_HUD, ...GROWTH_PANELS, ...GROWTH_HUD_PANELS, ...TABLES_PANELS, ...GAMES_PANELS, ...CAMPUS_PANELS, ...WORLD_PANELS, ...SOCIAL_PANELS, ...START_PANELS, ...TRAVEL_PANELS, ...ACCOUNT_PANELS, ...BUSINESS_PANELS, ...MARKET_PANELS, ...SHOWCASE_PANELS, ...COMMERCE_PANELS, ...POLITICS_PANELS, ...ADMIN_PANELS, ...LIVING_WORLD_PANELS, ...FEED_PANELS]
