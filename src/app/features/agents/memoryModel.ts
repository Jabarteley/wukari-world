// The words of the "what AI characters remember" screen (AgentMemory.vue). Plain, short, and the same everywhere it is shown.
export const memoryWords = {
  explainer: 'The game\'s own AI-played characters can remember a few short things you tell them, such as what you like, and how well you know each other. Only you can see this. You can delete any of it, or turn remembering off.',
  globalOn: 'They keep up to five short notes each.',
  globalOff: 'Nothing is kept, and what was kept is deleted.',
  empty: 'No AI character knows you yet. Talk to one in a place and it will show here.',
  /** Why the Partner button is not shown. */
  partnerWhy(adult: boolean, points: number, needed: number): string {
    if (!adult) return 'Partners are only for players who have said they are 18 or older.'
    if (points < needed) return `You can choose a partner when you are closer (${Math.floor(points)} of ${needed}).`
    return 'You already have a Bae. End that first.'
  },
} as const
