export const CREDENTIAL_KINDS = ['account', 'api-token', 'certificate', 'other'] as const

export type CredentialKind = (typeof CREDENTIAL_KINDS)[number]

export interface CredentialMetadataInput {
  label: string
  provider: string
  username: string
  url: string
  kind: CredentialKind
  notes: string
}

export interface CredentialMetadata extends CredentialMetadataInput {
  id: string
  createdAt: string
  updatedAt: string
  secretState: 'desktop-required' | 'configured'
}

export function normalizeCredentialMetadata(input: CredentialMetadataInput) {
  const label = input.label.trim()
  if (!label) throw new Error('Credential label is required.')
  if (!CREDENTIAL_KINDS.includes(input.kind)) throw new Error('Credential kind is invalid.')

  const url = input.url.trim()
  if (url) {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') throw new Error('Credential URL must use HTTPS.')
  }

  return {
    label,
    provider: input.provider.trim(),
    username: input.username.trim(),
    url,
    kind: input.kind,
    notes: input.notes.trim(),
  }
}
