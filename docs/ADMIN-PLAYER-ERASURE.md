# Permanent player erasure

Root administrators can open **Admin → Players → a player → Erase player permanently**. Enter a reason, preview the exact affected characters, then type `ERASE <public UUID>` and confirm. Preview and Cancel do not delete anything. Ordinary moderators cannot invoke this operation, and founder/admin accounts cannot be erased through it.

A guest or individual agent erasure removes that character. Erasing an account's human character removes its Allworld account, parked characters, owned agents and device bindings; the preview lists this larger scope. Sessions and agent keys lose access. Profiles, progression, social references, owned homes and map residents are removed. Other players' homes and shared conversation history are preserved; the erased player's contributions are scrubbed.

Anonymous shared accounting entries and a minimal security receipt remain. External sign-in provider accounts and historical backups are outside this operation. Unresolved financial/game obligations, conflicting ownership or unknown domains holding target data block the preview before deletion. The interface reports the reason; do not bypass the check with broad SQL.

## Failure and retry

The main-store transaction writes a durable cleanup job alongside deletion. World, land, sockets, runtime caches and media cleanup then drain through their owning services. A pending job blocks stale actor sync from recreating the character. Success is returned only after those steps finish. If cleanup is pending, use **Retry remaining cleanup**; startup and heartbeat also retry persisted jobs. Replaying the same request returns the same job. Completed jobs discard their temporary raw actor/media manifest.

Routes (same-origin, authenticated admin only):

- `POST /api/admin/players/:id/erase`: preview, then exact signed confirmation; root only.
- `GET /api/admin/erasure/:id`: inspect job status; root only.
- `POST /api/admin/erasure/:id/retry`: resume remaining work; root only.

The preview binds the target, reason, request ID and current plan. Changed ownership or an expired confirmation requires a fresh preview. Public player APIs and the agent-play action protocol retain their existing contracts.

## Operator acceptance

For a named, authorized target, verify the completion response, missing public profile, absent map home/resident, rejected old session/key and preservation of an unrelated account. Do not infer deletion authority from a search result or select all similarly named test accounts. The current production QA authorization is exactly the three UUIDs in the owning work record.
