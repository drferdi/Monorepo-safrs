/** Client-safe view of the `users:online` payload built by src/lib/server/crew-presence.ts. */

export type OnlineSource = 'web' | 'assist' | 'both'

const SOURCE_LABEL: Record<OnlineSource, string> = {
  web: 'Dashboard',
  assist: 'Asisten Medis',
  both: 'Dashboard + Asisten Medis',
}

/** A payload without `source` comes from a server older than Asisten Medis presence: web only. */
export function onlineSourceLabel(source: OnlineSource | undefined): string {
  return SOURCE_LABEL[source ?? 'web']
}

/** EMR triage is relayed over the dashboard socket, so an Asisten Medis-only user cannot receive it. */
export function canReceiveTriage(user: { source?: OnlineSource }): boolean {
  return user.source !== 'assist'
}
