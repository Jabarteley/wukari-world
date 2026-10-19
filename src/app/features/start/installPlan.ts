// What the install bar does on this device, as a pure decision (./installPrompt.ts reads the browser and calls it; the test needs no browser).
//   'prompt': a browser that can install the site (Chrome, Edge, Samsung Internet on Android) gave us its offer: Install / Not now.
//   'ios':    an iPhone or iPad browser, which has no install button for a site: say where Add to Home Screen is, once.
//   null:     nothing: already installed or opened from the home screen, already asked on this device, or no way to install.

export type InstallPlan = 'prompt' | 'ios'

/** The device has been asked once (the bar was shown, whatever the person chose): never again. Local storage key. */
export const INSTALL_ASKED_KEY = 'allworld-install-asked'

export interface InstallFacts {
  /** Opened from the home screen or the store wrapper (display-mode standalone, or Safari's `navigator.standalone`). */
  standalone: boolean
  ios: boolean
  /** Chrome's offer is being held (./installEvent.ts). */
  hasOffer: boolean
  /** The device has been asked before. */
  asked: boolean
}

export function installPlan({ standalone, ios, hasOffer, asked }: InstallFacts): InstallPlan | null {
  if (standalone || asked) return null
  if (hasOffer) return 'prompt'
  return ios ? 'ios' : null
}

/**
 * An iPhone, iPod or iPad in a real browser; an iPad that asks for the desktop site says "Macintosh" but has a touch screen. A browser
 * inside another app (Instagram, TikTok, a mail app) has no "Safari/" in its agent and no Add to Home Screen: it is left alone.
 */
export function isIos(userAgent: string, maxTouchPoints: number): boolean {
  return (/iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)) && /Safari\//.test(userAgent)
}
