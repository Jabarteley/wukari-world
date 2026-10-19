/**
 * OWNER: social
 * A line in a person's feed inbox (docs/FEED.md "Inbox") from the social glue: a talk going live, a trip invitation, a proposal, a gist
 * post taken down. The same stored shape and the same `feed-inbox` frame as the feed's own lines, so the Feed's bell shows it; the frames
 * are collected and sent after the transaction commits (sendInbox). Never to someone in a block with the sender.
 */
import { feedOf } from '../feed/data.ts'
import { FEED } from '../../src/feed/model.ts'
import type { InboxLine } from '../../src/types/feed.ts'
import type { ServerFrame } from '../../src/types/protocol.ts'
import type { Db, RouteContext } from '../types.ts'

export type InboxPush = [string, { type: 'feed-inbox'; unseen: number; line: InboxLine }][]

export function inboxLine(ctx: RouteContext, db: Db, to: string, line: Omit<InboxLine, 'at'>, push: InboxPush): void {
  if (line.from && (line.from.id === to || ctx.checks?.blocked?.(to, line.from.id))) return
  const f = feedOf(ctx, db)
  const name = (db as unknown as { social?: { players?: Record<string, { name?: string }> } }).social?.players?.[to]?.name ?? 'Player'
  const a = f.authors[to] ??= { name }
  const list = (a.inbox ??= [])
  const full: InboxLine = { at: ctx.now(), ...line }
  list.push(full)
  if (list.length > FEED.inbox) list.splice(0, list.length - FEED.inbox)
  push.push([to, { type: 'feed-inbox', unseen: list.filter((l) => l.at > (a.seenAt ?? 0)).length, line: full }])
}
export function sendInbox(ctx: RouteContext, push: InboxPush | undefined): void {
  for (const [to, frame] of push ?? []) ctx.push(to, frame as unknown as ServerFrame)
}
