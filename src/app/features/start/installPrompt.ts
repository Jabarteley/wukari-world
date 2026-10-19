// "Add Allworld to your phone": one small bar, once per device, after the first session has reached the game. An Android browser that can install
// the site gets Install / Not now (its own prompt opens on Install); an iPhone or iPad gets one line on where Add to Home Screen is, since a site
// cannot install itself there. A lazy chunk, fetched when the scene is up (startExtras.ts) and only for a device that has not been asked.
// The decision is ./installPlan.ts; the offer is kept from page start by ./installEvent.ts. Counted as install_prompt_shown / _accepted / _dismissed
// (jaw:track, with the platform: prompt | ios); no one's name or address is in them.
import { watch } from 'vue'
import { useApp } from '../../state/app.ts'
import { heldInstallOffer } from './installEvent.ts'
import { INSTALL_ASKED_KEY, installPlan, isIos } from './installPlan.ts'
import type { InstallPlan } from './installPlan.ts'

/** How long the game has been ready before the bar appears: long enough to have done something first. */
const CALM_MS = 20000

const track = (name: string, props: Record<string, unknown>): void => {
  try { window.dispatchEvent(new CustomEvent('jaw:track', { detail: { name, props } })) } catch { /* no window: nothing to tell */ }
}

const standalone = (): boolean => {
  try { return globalThis.matchMedia('(display-mode: standalone)').matches || (globalThis.navigator as { standalone?: boolean }).standalone === true } catch { return false }
}
const asked = (): boolean => { try { return globalThis.localStorage.getItem(INSTALL_ASKED_KEY) !== null } catch { return true } }
const markAsked = (): void => { try { globalThis.localStorage.setItem(INSTALL_ASKED_KEY, '1') } catch { /* private mode: it may show again next time */ } }

const BAR = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 84px);z-index:45;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px 12px;box-sizing:border-box;width:min(440px,calc(100% - 24px));padding:10px 14px;border-radius:14px;background:#183b2a;color:#fff;font:600 15px/1.3 system-ui,sans-serif;box-shadow:0 6px 24px #00000059'
const BUTTON = 'min-height:44px;min-width:44px;padding:0 16px;border:0;border-radius:10px;font:700 15px system-ui,sans-serif;cursor:pointer'

function showBar(plan: InstallPlan): void {
  const bar = document.createElement('aside')
  bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Add Allworld to your phone'); bar.style.cssText = BAR
  const text = document.createElement('span')
  text.style.cssText = 'flex:1 1 200px'
  text.textContent = plan === 'ios' ? 'Add Allworld to your phone: tap Share, then Add to Home Screen.' : 'Add Allworld to your phone'
  const close = (accepted: boolean): void => {
    bar.remove()
    if (accepted) track('install_prompt_accepted', { platform: plan })
    else track('install_prompt_dismissed', { platform: plan })
  }
  const later = document.createElement('button'); later.type = 'button'; later.textContent = plan === 'ios' ? 'Got it' : 'Not now'
  later.style.cssText = `${BUTTON};background:transparent;color:#fff`
  later.addEventListener('click', () => { close(false) })
  bar.append(text)
  if (plan === 'prompt') {
    const install = document.createElement('button'); install.type = 'button'; install.textContent = 'Install'
    install.style.cssText = `${BUTTON};background:#e8a643;color:#183b2a`
    install.addEventListener('click', () => {
      const offer = heldInstallOffer() // a browser gives each offer one prompt; the bar is closed after this press, so it is not asked twice
      if (!offer) { close(false); return }
      // The browser's own prompt answers: accepted only when the person pressed its Install.
      void offer.prompt().then(() => offer.userChoice).then((choice) => { close(choice.outcome === 'accepted') }, () => { close(false) })
    })
    bar.append(install)
  }
  bar.append(later)
  document.body.append(bar)
  markAsked()
  track('install_prompt_shown', { platform: plan })
}

/** Wait for a first session in the game, a calm moment after it, and then ask once. A device that cannot install, has installed or was asked is left alone. */
export function startInstallPrompt(): void {
  if (standalone() || asked()) return
  const { game } = useApp()
  const ready = (): boolean => game.connected.value && game.view.value.onboarding?.required !== true
  const arrive = (): void => {
    globalThis.setTimeout(() => {
      const plan = installPlan({ standalone: standalone(), ios: isIos(globalThis.navigator.userAgent, globalThis.navigator.maxTouchPoints), hasOffer: heldInstallOffer() !== null, asked: asked() })
      if (plan) showBar(plan)
    }, CALM_MS)
  }
  if (ready()) { arrive(); return }
  const stop = watch(ready, (now) => { if (now) { stop(); arrive() } })
}
