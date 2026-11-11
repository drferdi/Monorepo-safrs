export const WORKSPACE_VIEWS = [
  'medlink',
  'sentraboard',
  'logbook',
  'credential',
  'sentrapedia',
  'notifications',
  'settings',
] as const

export type WorkspaceView = (typeof WORKSPACE_VIEWS)[number]
export const SENTRAVERSE_URL = 'https://sentrahai.com' as const

export function parseWorkspaceHash(hash: string): WorkspaceView {
  const candidate = hash.replace(/^#/, '')
  return WORKSPACE_VIEWS.includes(candidate as WorkspaceView)
    ? (candidate as WorkspaceView)
    : 'medlink'
}

export function toWorkspaceHash(view: WorkspaceView) {
  return `#${view}` as const
}

type ExternalOpener = (
  url?: string | URL,
  target?: string,
  features?: string
) => WindowProxy | null

export function openSentraverse(openExternal: ExternalOpener = window.open.bind(window)) {
  return openExternal(SENTRAVERSE_URL, '_blank', 'noopener,noreferrer')
}
