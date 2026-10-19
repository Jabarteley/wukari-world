// Holds the browser's one-time install offer (`beforeinstallprompt`) from the first moments of the page until the install bar (./installPrompt.ts,
// a lazy chunk fetched once the game is up) asks for it: Chrome fires the event once, early, and a listener added later would never hear it.
// This file is all the first download carries of the install bar (a listener and one variable, kept to the least); nothing here shows anything.

/** The part of Chrome's `BeforeInstallPromptEvent` the bar uses (it is not in the DOM typings). */
export interface InstallOffer extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let held: InstallOffer | null = null

/** Keep the offer instead of letting the browser show its own bar; the page offers it once, later, at a calm moment. */
export function holdInstallOffer(target: Pick<EventTarget, 'addEventListener'> = globalThis): void {
  target.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); held = event as InstallOffer })
}

/** The kept offer, or null (not an Android browser that can install, already installed, or the event has not come). */
export const heldInstallOffer = (): InstallOffer | null => held
