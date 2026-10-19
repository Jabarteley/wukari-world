// The scam warning's words (docs/WOW-PLAN.md Phase 0): shown under another person's chat line, message or reply that the server flagged as asking for money, a
// withdrawal, an account number or a code (server/moderation/scam-words.ts). One calm sentence, one tap to report, one link to what real money is (/money).
// The same words everywhere a line can be flagged, so a test can pin them.
export const SCAM_NOTICE = 'Game naira is never real money. Nobody can withdraw it for you.'
export const SCAM_MONEY_PAGE = '/money'
/** The reason a report of a flagged line is filed under: the same word the social and feed report routes know. */
export const SCAM_REPORT_REASON = 'scam' as const
/** What a report carries as its note: the flagged line, cut to the report's limit (300 characters in the messages, any length the feed takes). */
export const scamReportText = (body: string, limit = 300): string => body.trim().slice(0, limit)
