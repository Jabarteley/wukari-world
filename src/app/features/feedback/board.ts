// The public feedback board (Feedback Studio, on Goalmatic): players post ideas, vote on them and follow them to Planned and Shipped.
// Every "Feedback" button opens it in a new tab; problems with the game stay in the in-game report (Report a problem, a receipt).
export const FEEDBACK_URL = 'https://feedback-studio.apps.goalmatic.io/b/allworld'
/** Opens the board in a new tab, never in place of the game. */
export function openFeedbackBoard(): void { globalThis.open?.(FEEDBACK_URL, '_blank', 'noopener,noreferrer') }
