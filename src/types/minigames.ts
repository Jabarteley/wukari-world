// OWNER: minigames. Local mini-games (docs/MINI-GAMES.md): the market haggle, the skit studio's caption check, and the two Nigerian seasons
// (NYSC camp, JAMB season). Game naira only, settled by the server. Type-only: the first download carries none of this.
import type { HostErrorCode, JsonBodyErrorCode, Ok } from './protocol.ts'

type E = HostErrorCode | JsonBodyErrorCode | 'rate_limited' | 'device_session_required' | 'storage_unavailable' | 'invalid_request'
type Refused = { ok: false; code: string; reason: string }
type Done<T extends object = object> = Ok<({ ok: true } & T) | Refused>

// ---- the market haggle ---------------------------------------------------------------------------------------------------------------

export interface HaggleItemView { id: string; label: string; icon: string; list: number }
export interface HaggleLine { who: 'trader' | 'you'; text: string }
/** How good a deal was, coarse on purpose: it never says where the floor was. */
export type HaggleGrade = 'fair' | 'good' | 'sharp' | 'floor'
export interface HaggleTalkView {
  item: string; label: string; list: number
  /** What the trader asks now. */
  ask: number
  roundsLeft: number
  state: 'open' | 'deal' | 'final' | 'bought'
  /** The price agreed and held for the person, and until when (server ms). */
  deal: number | null
  dealUntil: number | null
  lines: HaggleLine[]
  saved: number
  grade: HaggleGrade | null
}
/** How the trader knows the person: not at all, from earlier today ("You again?"), or as a regular. */
export type HaggleMemory = 'new' | 'again' | 'regular' | 'returning'
export interface HaggleTraderView {
  key: string; name: string; stall: string; blurb: string
  /** Every trader is a game character, always labelled as AI-played. */
  ai: true
  items: HaggleItemView[]
  memory: HaggleMemory
  greeting: string
  /** Today's talks with this trader, newest first. */
  talks: HaggleTalkView[]
}
export interface HaggleBest {
  trader: string; stall: string; city: string; item: string; list: number; price: number; saved: number; grade: HaggleGrade; at: number
  /** The last few lines of the talk, for the card and the clip. */
  lines: HaggleLine[]
}
export interface HaggleStalls {
  open: boolean; city: string; marketName: string; marketVenue: string
  /** The person stands in the market (the haggle needs it). */
  here: boolean
  traders: HaggleTraderView[]
  today: { bought: number; cap: number }
  best: HaggleBest | null
}

// ---- the skit studio -----------------------------------------------------------------------------------------------------------------

export interface SkitCheck { title: string; captions: string[] }

// ---- NYSC camp -----------------------------------------------------------------------------------------------------------------------

export type NyscStageId = 'registration' | 'platoon' | 'parade'
export interface NyscDutyView {
  id: string; title: string; scene: string
  options: { id: string; text: string }[]
  done: boolean
  /** What happened, once done. */
  result?: string
}
export interface NyscStageView {
  id: NyscStageId; title: string; blurb: string
  /** The day of the arc this stage opens on (0, 7 or 14). */
  opensDay: number
  open: boolean
  done: boolean
  duties: NyscDutyView[]
}
export interface NyscCard {
  name: string; batch: string; camp: string; state: string; platoon: number
  /** 'Distinction', 'Credit' or 'Pass'. */
  honour: string
  posting: string
  passedOutDay: string
}
export interface NyscView {
  on: boolean; batch: string; joined: boolean
  /** The days since joining (0 on the day), and the day the next stage or the passing out opens. */
  day: number
  camp: { name: string; state: string } | null
  platoon: number | null
  stages: NyscStageView[]
  /** A duty has been done today: the next waits for tomorrow. */
  dutyToday: boolean
  /** Passing out is open and not yet collected. */
  passingOut: 'locked' | 'ready' | 'done'
  card: NyscCard | null
  earned: number
}

// ---- JAMB season ---------------------------------------------------------------------------------------------------------------------

export type JambSubject = 'english' | 'maths' | 'general'
export interface JambQuestionView { id: number; subject: JambSubject; text: string; options: string[] }
export interface JambAnswerResult { id: number; choice: number; correct: boolean; answer: number; why: string; paid: number }
export interface JambPracticeView {
  day: number
  questions: JambQuestionView[]
  /** Answers already given today, by question id. */
  answered: JambAnswerResult[]
  paid: number
}
export interface JambMockResult { correct: number; total: number; score: number; bySubject: Record<JambSubject, { correct: number; total: number }>; paid: number }
export interface JambMockView {
  state: 'locked' | 'ready' | 'running' | 'done'
  /** Why it is locked. */
  need?: string
  questions: JambQuestionView[]
  endsAt: number | null
  minutes: number
  result: JambMockResult | null
}
export interface JambCard {
  name: string; year: string; score: number; correct: number; total: number
  best: JambSubject; practiceDays: number; practiceCorrect: number; practiceAnswered: number; streak: number
  /** A band word: 'Strong', 'Good', 'Almost there' or 'Keep reading'. */
  band: string
}
export interface JambView {
  on: boolean; year: string; joined: boolean
  day: number
  practice: JambPracticeView | null
  mock: JambMockView
  streak: number
  /** Results day: the day of the season it comes, whether it has come and the card. */
  resultsDay: number
  resultsReady: boolean
  card: JambCard | null
  earned: number
  caps: { practiceDay: number; mock: number }
}

export interface SeasonsView {
  /** The person's character lives in Nigeria. The seasons are for Nigeria only. */
  nigeria: boolean
  city: string
  nysc: NyscView
  jamb: JambView
}

export interface MiniGamesHttpRoutes {
  'GET /api/minigames/haggle/stalls': { query: { city: string }; response: Done<{ stalls: HaggleStalls }>; errors: E }
  'POST /api/minigames/haggle/open': { body: { cityId: string; trader: string; item: string }; response: Done<{ trader: HaggleTraderView; said: string }>; errors: E }
  'POST /api/minigames/haggle/offer': { body: { cityId: string; trader: string; item: string; offer: number; requestId: string }; response: Done<{ trader: HaggleTraderView; said: string; viaModel: boolean; duplicate?: true }>; errors: E }
  'POST /api/minigames/haggle/buy': { body: { cityId: string; trader: string; item: string; requestId: string }; response: Done<{ trader: HaggleTraderView; said: string; paid: number; best: HaggleBest | null; duplicate?: true }>; errors: E }
  'POST /api/minigames/skit/check': { body: SkitCheck; response: Done<SkitCheck>; errors: E }
  'GET /api/minigames/seasons': { query: { city: string }; response: Done<{ seasons: SeasonsView }>; errors: E }
  'POST /api/minigames/nysc/join': { body: { cityId: string; requestId: string }; response: Done<{ nysc: NyscView; duplicate?: true }>; errors: E }
  'POST /api/minigames/nysc/duty': { body: { cityId: string; duty: string; option: string; requestId: string }; response: Done<{ nysc: NyscView; paid: number; duplicate?: true }>; errors: E }
  'POST /api/minigames/nysc/pass-out': { body: { cityId: string; requestId: string }; response: Done<{ nysc: NyscView; paid: number; duplicate?: true }>; errors: E }
  'POST /api/minigames/jamb/join': { body: { cityId: string; requestId: string }; response: Done<{ jamb: JambView; duplicate?: true }>; errors: E }
  'POST /api/minigames/jamb/today': { body: { cityId: string }; response: Done<{ jamb: JambView }>; errors: E }
  'POST /api/minigames/jamb/answer': { body: { cityId: string; id: number; choice: number; requestId: string }; response: Done<{ jamb: JambView; result: JambAnswerResult; duplicate?: true }>; errors: E }
  'POST /api/minigames/jamb/mock/start': { body: { cityId: string; requestId: string }; response: Done<{ jamb: JambView; duplicate?: true }>; errors: E }
  'POST /api/minigames/jamb/mock/submit': { body: { cityId: string; answers: (number | null)[]; requestId: string }; response: Done<{ jamb: JambView; duplicate?: true }>; errors: E }
}
