import type { UnilagStudentView } from '../../../types/campus.ts'
import type { AchievementPath } from '../../../types/achievements.ts'
import type { ExecutionOrigin } from '../../../types/progression.ts'
import type { CareerView, GoalsView, MissionRow, MissionsView, SocialView } from '../../../types/view.ts'

export const PASSPORT_TABS = [
  ['today', 'Today'],
  ['story', 'My Story'],
  ['achievements', 'Achievements'],
  ['people', 'My People'],
] as const

export type PassportTab = typeof PASSPORT_TABS[number][0]

export interface PassportStep {
  label: string
  detail: string
  open?: string
  go?: string[]
}

export function nextStep(missions: MissionsView): PassportStep {
  if (missions.locked) return { label: 'Settle in', detail: missions.locked, open: 'onboarding' }
  const reward = missions.pendingRewards[0]
  if (reward) return { label: `Collect ${reward.label}`, detail: 'A completed reward is saved for you.', open: 'missions' }
  const setReward = missions.pendingSetRewards[0]
  if (setReward) return { label: 'Review saved set reward', detail: `Your +${setReward.stars} star bonus is waiting for room.`, open: 'missions' }
  const mission = [...missions.daily, ...missions.weekly].find(row => !row.done)
  if (mission) return {
    label: mission.label,
    detail: mission.hint,
    ...(mission.open ? { open: mission.open } : {}),
    ...(mission.go ? { go: mission.go } : {}),
  }
  return { label: 'Review Missions', detail: 'Your current sets are complete. See when the next set arrives.', open: 'missions' }
}

export function missionProgress(mission: Pick<MissionRow, 'n' | 'count' | 'done'>): string {
  return mission.done ? 'Done' : `${Math.min(mission.n, mission.count)} of ${mission.count}`
}

export function careerLine(career: CareerView): string {
  if (!career.employed) return 'No job yet. Jobs lists current openings and what each shift pays.'
  if (!career.isTrack) return `${career.role ?? career.label ?? 'Starter job'} · ${career.shifts} shift${career.shifts === 1 ? '' : 's'} completed.`
  if (career.topOfLadder) return `${career.role} · level ${career.level} of ${career.levels} · top of this career.`
  return `${career.role} · level ${career.level} of ${career.levels}${career.next ? ` · next: ${career.next.role}` : ''}.`
}

export function campusLine(student: UnilagStudentView | null | undefined): string {
  if (!student) return 'No campus record is available yet. Open Campus to explore or start.'
  const programme = student.programme?.label ?? 'UNILAG programme'
  if (student.degree) return `${programme} completed · CGPA ${student.degree.cgpa.toFixed(2)}.`
  if (student.status === 'none') return 'Not enrolled. You can explore campus before applying.'
  if (student.status === 'dropped') return `${programme} left. Your closed semester records remain.`
  if (student.status === 'admitted') return `Admitted to ${programme}. Matriculation is next.`
  if (student.status === 'matriculated') return `Matriculated in ${programme}. Register a semester to continue.`
  const term = student.term ? `Semester ${student.term.semester}, attempt ${student.term.attempt}` : programme
  if (student.status === 'deferred') return `${term} is paused. Resume it in Campus when you are ready.`
  const complete = student.courses.reduce((sum, course) => sum + Number(course.assignment !== null) + Number(course.test !== null), 0)
  return `${term} · ${complete} of ${student.courses.length * 2} assignments and tests completed.`
}

export interface LifetimeLine { id: string; label: string; value: string }

export function lifetimeLines(missions: MissionsView, goals: GoalsView, career: CareerView, student: UnilagStudentView | null | undefined): LifetimeLine[] {
  const passed = student?.records.filter(record => record.passed).length ?? 0
  return [
    { id: 'days', label: 'Days played', value: String(missions.activeDays) },
    { id: 'missions', label: 'Mission rewards collected', value: String(missions.claimed) },
    { id: 'wishes', label: 'Wishes completed', value: String(goals.granted) },
    { id: 'shifts', label: 'Work shifts completed', value: String(career.completedShifts) },
    { id: 'semesters', label: 'Campus semesters passed', value: String(passed) },
  ]
}

export const residentsOf = (social: SocialView) => social.relationships.filter(person => person.npc)
export const playerFriendsOf = (social: SocialView) => social.friends.filter(person => !person.npc)

const ORIGIN_LABELS: Readonly<Record<ExecutionOrigin, string>> = {
  human: 'Human-played progress',
  'delegated-agent': 'Delegated-agent progress',
  'agent-character': 'Agent-character progress',
  system: 'Automatic game progress',
  unknown: 'Earlier progress with unknown origin',
}

export const originLine = (origins: readonly ExecutionOrigin[]): string => origins.length
  ? origins.map(origin => ORIGIN_LABELS[origin]).join(' · ')
  : 'No qualifying progress recorded yet'

export const pathLabel = (path: AchievementPath): string => ({
  exploration: 'Exploration', belonging: 'Belonging', work: 'Work', creation: 'Creation', play: 'Play', learning: 'Learning',
})[path]
