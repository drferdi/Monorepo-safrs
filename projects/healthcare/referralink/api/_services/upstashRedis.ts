export type RedisEnvironment = Readonly<Record<string, string | undefined>>

export type RedisCommander = {
  command<T>(command: ReadonlyArray<string | number>): Promise<T>
}

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

type UpstashRedisOptions = {
  env: RedisEnvironment
  fetch: FetchLike
  timeoutMs?: number
  setTimeout?: (callback: () => void, delay: number) => unknown
  clearTimeout?: (handle: unknown) => void
}

type UpstashResponse<T> = {
  result?: T
  error?: string
}

export class UpstashRedisConfigurationError extends Error {
  constructor() {
    super('Upstash Redis is not configured with an HTTPS endpoint and token')
    this.name = 'UpstashRedisConfigurationError'
  }
}

export class UpstashRedisUnavailableError extends Error {
  constructor() {
    super('Upstash Redis is unavailable')
    this.name = 'UpstashRedisUnavailableError'
  }
}

export class UpstashRedisCommandError extends Error {
  constructor() {
    super('Redis command failed')
    this.name = 'UpstashRedisCommandError'
  }
}

export class UpstashRedis implements RedisCommander {
  private readonly endpoint: string
  private readonly token: string
  private readonly fetchImpl: FetchLike
  private readonly timeoutMs: number
  private readonly scheduleTimeout: (callback: () => void, delay: number) => unknown
  private readonly cancelTimeout: (handle: unknown) => void

  constructor(options: UpstashRedisOptions) {
    const endpoint = options.env.UPSTASH_REDIS_REST_URL?.trim()
    const token = options.env.UPSTASH_REDIS_REST_TOKEN?.trim()

    if (!endpoint || !token) throw new UpstashRedisConfigurationError()

    let parsedEndpoint: URL
    try {
      parsedEndpoint = new URL(endpoint)
    } catch {
      throw new UpstashRedisConfigurationError()
    }

    if (
      parsedEndpoint.protocol !== 'https:' ||
      parsedEndpoint.username ||
      parsedEndpoint.password ||
      parsedEndpoint.search ||
      parsedEndpoint.hash
    ) {
      throw new UpstashRedisConfigurationError()
    }

    this.endpoint = parsedEndpoint.toString()
    this.token = token
    this.fetchImpl = options.fetch
    this.timeoutMs = options.timeoutMs ?? 5_000
    this.scheduleTimeout = options.setTimeout ?? ((callback, delay) => setTimeout(callback, delay))
    this.cancelTimeout =
      options.clearTimeout ?? ((handle) => clearTimeout(handle as NodeJS.Timeout))
  }

  async command<T>(command: ReadonlyArray<string | number>): Promise<T> {
    if (command.length === 0 || typeof command[0] !== 'string') {
      throw new UpstashRedisCommandError()
    }

    const controller = new AbortController()
    const timeout = this.scheduleTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await this.fetchImpl(this.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
        signal: controller.signal,
      })

      let payload: UpstashResponse<T>
      try {
        payload = (await response.json()) as UpstashResponse<T>
      } catch {
        throw new UpstashRedisUnavailableError()
      }

      if (!response.ok || typeof payload.error === 'string' || !('result' in payload)) {
        throw new UpstashRedisCommandError()
      }

      return payload.result as T
    } catch (error) {
      if (
        error instanceof UpstashRedisCommandError ||
        error instanceof UpstashRedisUnavailableError
      ) {
        throw error
      }
      throw new UpstashRedisUnavailableError()
    } finally {
      this.cancelTimeout(timeout)
    }
  }
}
