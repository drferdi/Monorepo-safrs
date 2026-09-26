/**
 * Langfuse tracing stub for standalone dashboard deployment.
 * Full implementation lives in the Abyss monorepo langfuse package.
 */

export async function initializeAbysLangfuseTracing(): Promise<boolean> {
  // No-op in standalone mode — tracing handled at monorepo level
  return false
}
