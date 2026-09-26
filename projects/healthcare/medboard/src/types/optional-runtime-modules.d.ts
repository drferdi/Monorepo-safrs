// Ambient fallback declarations for optional observability packages that are
// loaded from shared root helpers. Keep these signatures minimal and aligned
// with the small API surface consumed by this workspace.

declare module '@langfuse/client' {
  export class LangfuseClient {
    constructor(config: {
      publicKey: string
      secretKey: string
      baseUrl?: string
    })

    trace(event: unknown): void | Promise<void>
    shutdown?(): Promise<void>
  }
}

declare module '@sentry/nextjs' {
  export function init(config: unknown): void
  export function captureException(
    error: unknown,
    context?: { extra?: Record<string, unknown> }
  ): void
}
