/**
 * Authentication boundary.
 *
 * This is the only place the UI talks to an authentication service.
 * Nothing here authenticates anyone yet: both functions reject with
 * AuthNotConfiguredError so the UI can show an honest message.
 *
 * To integrate: replace the function bodies with real API calls.
 * Resolve on success (then redirect), throw an Error with a
 * user-readable `message` on failure.
 */
export class AuthNotConfiguredError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthNotConfiguredError';
  }
}

// Preview-only pause so the loading state is visible. Delete with the stub.
const previewPause = () => new Promise((resolve) => setTimeout(resolve, 900));

/**
 * @param {{ email: string, password: string, remember: boolean }} credentials
 * @returns {Promise<void>}
 */
// eslint-disable-next-line no-unused-vars
export async function signIn(credentials) {
  await previewPause();
  throw new AuthNotConfiguredError(
    'Sign-in is not connected in this preview. Nothing was sent.',
  );
}

/** @returns {Promise<void>} */
export async function signInWithMicrosoft() {
  await previewPause();
  throw new AuthNotConfiguredError(
    'Microsoft sign-in is not connected in this preview. Nothing was sent.',
  );
}
