// What the creator keeps between openings, as the panels it replaces kept it in module variables: the
// choices being made (so closing the creator and opening it again resumes where it was), the step on
// screen, the pending request, the last refusal and the looks to go back to. The device keeps only
// the look (and, on the landing, the name); everything else is confirmed by the server step by step.
import { reactive } from 'vue'
import type { DreamId, Look, TraitId } from '../../../types/life.ts'
import type { PanelView } from '../../types/panel.ts'
import type { AreaChoice } from './onboardingModel.ts'
import type { StepId } from './creatorModel.ts'

export interface CreatorDraft { look: Look; name: string; traits: TraitId[]; dream: DreamId | null; area: AreaChoice | undefined; spiritChosen: boolean }
export interface CreatorUi {
  draft: CreatorDraft | null
  owner: string | null
  step: StepId
  /** The look the creator opened with: "Reset" goes back to it. */
  origin: Look | null
  history: Look[]
  error: string
  pending: string
  /** A Play of the whole creator is on its way: when the life exists, the rest of the choices are sent. */
  settling: boolean
  /** Play was sent from this creator: the life exists (or is being made), so the rest is a move-in, not a Play. */
  played: boolean
  offered: boolean
  /** The rest of the choices is being sent (one run at a time, whichever instance of the screen started it). */
  settleRunning: boolean
  /** The city a life that does not exist yet will be born in (chosen on the Home step); null is the one the device is showing. */
  city: string | null
}
export const cr = reactive<CreatorUi>({ draft: null, owner: null, step: 'who', origin: null, history: [], error: '', pending: '', settling: false, played: false, offered: false, settleRunning: false, city: null })

/** Whose draft this is: the session and the city. */
export const ownerOf = (view: Pick<PanelView, 'session' | 'cityId'>, mode: string): string => `${mode}:${view.session?.id ?? 'local'}:${view.cityId}`

/** Whether the draft and step held in `cr` still belong to this screen: the same owner, or a start of this very screen that is on its way (its session and city arriving change the owner, not the person). */
export const keepsDraft = (ui: Pick<CreatorUi, 'draft' | 'owner' | 'settling'>, owner: string, mode: string): boolean =>
  ui.draft !== null && (ui.owner === owner || (mode === 'new' && ui.owner?.startsWith('new:') === true && ui.settling))
