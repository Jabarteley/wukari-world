// The one account store of the page, wired to the application. Created on first use.
import { useApp } from '../../state/app.ts'
import { STORAGE_KEY } from '../../../client.ts'
import { clearCache } from '../../state/cacheFirst.ts'
import { createAccount } from './accountStore.ts'
import { useAccountLite } from './useAccountLite.ts'
import type { Account } from './accountStore.ts'

/** Sign-out, another character, an erased life: the saved life and everything kept for cache-first reads go with it. */
export function forgetDeviceLife(store: Pick<Storage, 'removeItem' | 'key' | 'length'> | undefined = globalThis.localStorage): void {
  try { store?.removeItem(STORAGE_KEY) } catch { /* nothing was kept */ }
  clearCache(store as Parameters<typeof clearCache>[0])
}

let shared: Account | null = null
export function useAccount(): Account {
  if (shared) return shared
  const { game } = useApp()
  shared = createAccount({
    fetchJson: game.fetchJson,
    // The provider's code is its own file, fetched when a sign-in is first sent.
    loadProvider: () => import('./identityProvider.ts'),
    origin: () => globalThis.location.origin,
    forgetLife: forgetDeviceLife,
    reload() { globalThis.location.reload() },
  }, useAccountLite())
  return shared
}
