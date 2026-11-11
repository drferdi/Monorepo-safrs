export interface CredentialVault {
  availability(): Promise<'available' | 'unavailable'>
  saveSecret(credentialId: string, secret: string): Promise<void>
  deleteSecret(credentialId: string): Promise<void>
}

const desktopRequired = () =>
  Promise.reject(new Error('Desktop secure vault required for secret operations.'))

export const browserCredentialVault: CredentialVault = {
  availability: async () => 'unavailable',
  saveSecret: async () => desktopRequired(),
  deleteSecret: async () => desktopRequired(),
}
