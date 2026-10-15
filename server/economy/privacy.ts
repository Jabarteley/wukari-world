import type { StoredWalletEffect } from './effects.ts';

export function erasureIds(values: readonly string[]): Set<string> {
  if (!Array.isArray(values) || values.length > 256 || values.some(id => typeof id !== 'string' || !id || id.length > 128)) throw new TypeError('Invalid erasure actors');
  return new Set(values);
}

/** Replace transfer references on BOTH ledger sides; financial amounts and ordering stay intact. */
export function anonymousTransfers(effects: readonly Pick<StoredWalletEffect, 'publicId' | 'transferId'>[], ids: ReadonlySet<string>): Map<string, string> {
  const transfers = new Map<string, string>();
  for (const effect of effects) if (effect.transferId && (ids.has(effect.publicId) || [...ids].some(id => effect.transferId!.startsWith(`peer|${id}|`)))) {
    if (!transfers.has(effect.transferId)) transfers.set(effect.transferId, `erased|${globalThis.crypto.randomUUID()}`);
  }
  return transfers;
}

export function eraseWalletActors(effects: StoredWalletEffect[], ids: ReadonlySet<string>): void {
  const transfers = anonymousTransfers(effects, ids);
  for (const effect of effects) {
    const own = ids.has(effect.publicId), transfer = effect.transferId && transfers.get(effect.transferId);
    if (own) { effect.publicId = ''; effect.operationId = null; }
    if (own || transfer) effect.reason = 'Erased player transaction';
    if (transfer) effect.transferId = transfer;
  }
}
