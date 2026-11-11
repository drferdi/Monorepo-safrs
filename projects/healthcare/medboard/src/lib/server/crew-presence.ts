/**
 * Who is online: crew on the web dashboard (Socket.IO) and in Asisten Medis (REST heartbeat).
 *
 * The store lives on globalThis because server.ts and the Next.js route bundles load separate
 * copies of this module; module-level state would not be shared between them. It is in memory
 * and resets with the process, like the socket list it replaces.
 */

import type { OnlineSource } from '@/lib/crew-online'

/** Asisten Medis heartbeats every 30 s; three missed beats take the user offline. */
export const ASSIST_PRESENCE_TTL_MS = 90_000

export type CrewIdentity = {
  userId: string
  name: string
  role: string
  profession: string
  institution: string
}

export type OnlineUser = CrewIdentity & {
  joinedAt: number
  source: OnlineSource
}

type WebPresence = CrewIdentity & { joinedAt: number; socketIds: Set<string> }
type AssistPresence = CrewIdentity & { joinedAt: number; lastSeen: number }

type PresenceStore = {
  web: Map<string, WebPresence>
  assist: Map<string, AssistPresence>
}

const GLOBAL_KEY = '__sentra_crew_presence__'

function store(): PresenceStore {
  const existing = Reflect.get(globalThis, GLOBAL_KEY) as PresenceStore | undefined
  if (existing) return existing
  const created: PresenceStore = { web: new Map(), assist: new Map() }
  Reflect.set(globalThis, GLOBAL_KEY, created)
  return created
}

function identityOf(entry: CrewIdentity): CrewIdentity {
  return {
    userId: entry.userId,
    name: entry.name,
    role: entry.role,
    profession: entry.profession,
    institution: entry.institution,
  }
}

export function joinWebPresence(identity: CrewIdentity, socketId: string, now = Date.now()): void {
  const web = store().web
  const existing = web.get(identity.userId)
  if (existing) {
    existing.socketIds.add(socketId)
    return
  }
  web.set(identity.userId, { ...identityOf(identity), joinedAt: now, socketIds: new Set([socketId]) })
}

/** Returns true when the user's last web tab closed. */
export function leaveWebPresence(userId: string, socketId: string): boolean {
  const web = store().web
  const existing = web.get(userId)
  if (!existing) return false
  existing.socketIds.delete(socketId)
  if (existing.socketIds.size > 0) return false
  web.delete(userId)
  return true
}

/** Socket ids of the user's open web tabs; Asisten Medis has no socket. */
export function webSocketIds(userId: string): string[] {
  return Array.from(store().web.get(userId)?.socketIds ?? [])
}

/** Returns true when the user was not already online in Asisten Medis. */
export function markAssistPresence(identity: CrewIdentity, now = Date.now()): boolean {
  const assist = store().assist
  const existing = assist.get(identity.userId)
  const alive = existing !== undefined && now - existing.lastSeen <= ASSIST_PRESENCE_TTL_MS
  assist.set(identity.userId, {
    ...identityOf(identity),
    joinedAt: alive ? existing.joinedAt : now,
    lastSeen: now,
  })
  return !alive
}

/** Returns true when the user was online in Asisten Medis. */
export function clearAssistPresence(userId: string): boolean {
  return store().assist.delete(userId)
}

/** Drops expired heartbeats; returns true when any was removed. */
export function pruneAssistPresence(now = Date.now()): boolean {
  const assist = store().assist
  let changed = false
  for (const [userId, entry] of assist) {
    if (now - entry.lastSeen > ASSIST_PRESENCE_TTL_MS) {
      assist.delete(userId)
      changed = true
    }
  }
  return changed
}

export function listOnlineUsers(now = Date.now()): OnlineUser[] {
  const { web, assist } = store()
  const merged = new Map<string, OnlineUser>()

  for (const entry of web.values()) {
    merged.set(entry.userId, { ...identityOf(entry), joinedAt: entry.joinedAt, source: 'web' })
  }
  for (const entry of assist.values()) {
    if (now - entry.lastSeen > ASSIST_PRESENCE_TTL_MS) continue
    const onWeb = merged.get(entry.userId)
    merged.set(
      entry.userId,
      onWeb
        ? { ...onWeb, joinedAt: Math.min(onWeb.joinedAt, entry.joinedAt), source: 'both' }
        : { ...identityOf(entry), joinedAt: entry.joinedAt, source: 'assist' }
    )
  }

  return Array.from(merged.values()).sort((a, b) => a.joinedAt - b.joinedAt)
}

export function resetCrewPresence(): void {
  const { web, assist } = store()
  web.clear()
  assist.clear()
}
