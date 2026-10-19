import type { EpisodeId } from '../../../types/episodes.ts'

export interface StoryLearningLesson {
  readonly episodeId: EpisodeId
  readonly cityId: string
  readonly boundaryText: string
  readonly fact: string
  readonly source: { readonly title: string; readonly publisher: string; readonly url: string; readonly locator: string; readonly basis: string }
  readonly question: string
  readonly choices: readonly [string, string, string]
  readonly correctIndex: 0 | 1 | 2
  readonly explanation: string
  readonly retryFeedback: string
}

const lessons = [
  {
    "episodeId": "place-kano-city-story",
    "cityId": "kano",
    "boundaryText": "Historical note, sourced below. Story characters and events are fictional.",
    "fact": "Kurmi Market historically participated in trade across the Sahara; its lanes group traders by the goods they sell.",
    "source": {
      "title": "Ancient Kano City Walls and Asociated Sties",
      "publisher": "National Commission for Museums and Monuments, Nigeria, submission published by UNESCO World Heritage Centre",
      "url": "https://whc.unesco.org/en/tentativelists/5171/",
      "locator": "Description, Kurmi Market paragraph",
      "basis": "National tentative-list submission; not World Heritage inscription"
    },
    "question": "A historical guide describes Kurmi Market lanes by trade. A visitor wants leatherwork. What clue should they use?",
    "choices": [
      "The lane closest to the main gate",
      "The kind of goods sold in the lane",
      "The widest lane on the plan"
    ],
    "correctIndex": 1,
    "explanation": "The source describes lanes organised by goods, so the trade category is a useful clue. This is historical context, not live walking directions.",
    "retryFeedback": "The source says Kurmi Market lanes are grouped by the goods sold there. Use the kind of goods the visitor wants as the clue, then try again."
  },
  {
    "episodeId": "place-nairobi-city-story",
    "cityId": "nairobi",
    "boundaryText": "Historical note, sourced below. Story characters and events are fictional.",
    "fact": "The museum institution began in Nairobi in 1910; the Museum Hill building opened in 1930.",
    "source": {
      "title": "Museum Story",
      "publisher": "National Museums of Kenya",
      "url": "https://museums.or.ke/museum-story/",
      "locator": "Institution history paragraphs",
      "basis": "Institutional history"
    },
    "question": "A timeline separates the institution beginning from the Museum Hill building opening. Which order fits the evidence?",
    "choices": [
      "Institution in 1930, building in 1910",
      "Institution in 1910, building in 1930",
      "Both the institution and building in 1930"
    ],
    "correctIndex": 1,
    "explanation": "An institution can be older than its present building. The museum dates its founding to 1910 and this building opening to 1930.",
    "retryFeedback": "Keep the two source dates distinct: the museum institution began in 1910; the Museum Hill building opened in 1930. Try again."
  },
  {
    "episodeId": "place-tokyo-city-story",
    "cityId": "tokyo",
    "boundaryText": "Historical note, sourced below. Story characters and events are fictional.",
    "fact": "The city previously called Edo was renamed Tokyo in 1868.",
    "source": {
      "title": "The Changing Face of Tokyo: From Edo to Today and into the Future",
      "publisher": "Tokyo Metropolitan Government, Tokyo Updates",
      "url": "https://www.tokyoupdates.metro.tokyo.lg.jp/en/post-393/",
      "locator": "Opening history paragraph",
      "basis": "Published historical talk on official metropolitan website"
    },
    "question": "An old record says Edo and a later record says Tokyo. What should you check before treating them as different cities?",
    "choices": [
      "Treat different names as different cities",
      "Use the modern name without checking the dates",
      "Compare record dates with the documented name change"
    ],
    "correctIndex": 2,
    "explanation": "The 1868 renaming connects Edo with present-day Tokyo. Dates and name changes help interpret historical records.",
    "retryFeedback": "Check the documented 1868 name change before treating Edo and Tokyo as two separate cities. Try again."
  },
  {
    "episodeId": "place-paris-city-story",
    "cityId": "paris",
    "boundaryText": "Historical note, sourced below. Story characters and events are fictional.",
    "fact": "The historic Banks of the Seine property in Paris was inscribed on the World Heritage List in 1991.",
    "source": {
      "title": "Paris, Banks of the Seine",
      "publisher": "UNESCO World Heritage Centre",
      "url": "https://whc.unesco.org/en/list/600/",
      "locator": "Date of Inscription; property description",
      "basis": "World Heritage property record"
    },
    "question": "A guide gives 1991 as the Seine property’s World Heritage inscription date. What can you conclude about its buildings?",
    "choices": [
      "Their construction dates must be checked separately",
      "The oldest building must date from 1991",
      "Most buildings can be dated from the inscription year"
    ],
    "correctIndex": 0,
    "explanation": "1991 is the recognition date for this historic property, not the age of the river or every building along it.",
    "retryFeedback": "The 1991 date is the World Heritage inscription date for the property, not a construction date for the river or all its buildings. Try again."
  }
] as const satisfies readonly StoryLearningLesson[]

const byEpisodeId: ReadonlyMap<EpisodeId, StoryLearningLesson> = new Map<EpisodeId, StoryLearningLesson>(lessons.map(lesson => [lesson.episodeId, lesson] as const))

export function storyLearningForEpisode(episodeId: EpisodeId): StoryLearningLesson | undefined {
  return byEpisodeId.get(episodeId)
}
