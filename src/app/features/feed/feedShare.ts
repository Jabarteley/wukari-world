// Sharing a feed thing outside the game: the phone's own share sheet when there is one, else WhatsApp (most players' first app), else a copy.
export async function shareLink(url: string, text: string): Promise<'shared' | 'copied' | 'failed'> {
  const full = new URL(url, location.origin).href
  try {
    if (typeof navigator.share === 'function') { await navigator.share({ title: 'Allworld', text, url: full }); return 'shared' }
  } catch (error) { if ((error as { name?: string })?.name === 'AbortError') return 'failed' }
  try { await navigator.clipboard.writeText(`${text} ${full}`); return 'copied' } catch { /* below */ }
  try { window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${full}`)}`, '_blank', 'noopener'); return 'shared' } catch { return 'failed' }
}
export const whatsappUrl = (url: string, text: string): string => `https://wa.me/?text=${encodeURIComponent(`${text} ${new URL(url, location.origin).href}`)}`
