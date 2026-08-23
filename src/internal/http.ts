import {
  AuthenticationError,
  InvalidRequestError,
  ProviderUnavailableError,
  RateLimitError,
  SearchAbortedError,
  SearchSuiteError,
  SearchTimeoutError,
} from '../errors.js'
import type { ProviderId, SearchEngine } from '../types.js'

export interface RequestJsonOptions {
  fetch: typeof globalThis.fetch
  provider: ProviderId
  engine?: SearchEngine
  operation?: 'search' | 'fetch'
  url: string
  init?: RequestInit
  signal?: AbortSignal
  abortSource?: (() => 'caller' | 'timeout' | undefined) | undefined
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return undefined
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text.slice(0, 4_000)
  }
}

function providerContext(options: RequestJsonOptions, raw?: unknown) {
  return {
    provider: options.provider,
    ...(options.engine === undefined ? {} : { engine: options.engine }),
    ...(options.operation === undefined ? {} : { operation: options.operation }),
    ...(raw === undefined ? {} : { raw }),
  }
}

export async function requestJson(options: RequestJsonOptions): Promise<unknown> {
  const init: RequestInit = {
    ...options.init,
    ...(options.signal === undefined ? {} : { signal: options.signal }),
  }

  let response: Response
  try {
    response = await options.fetch(options.url, init)
  } catch (error) {
    if (error instanceof SearchSuiteError) throw error
    const source = options.abortSource?.()
    if (source === 'caller') throw new SearchAbortedError('Search was aborted by the caller', providerContext(options))
    if (source === 'timeout') throw new SearchTimeoutError('Search request timed out', providerContext(options))
    throw new ProviderUnavailableError('Search provider request failed', {
      ...providerContext(options),
      retryable: true,
      cause: error,
    })
  }

  const body = await readBody(response)
  if (response.ok) return body

  const context = {
    ...providerContext(options, body),
    statusCode: response.status,
  }
  if (response.status === 401 || response.status === 403) {
    throw new AuthenticationError('Search provider authentication failed', context)
  }
  if (response.status === 429) {
    throw new RateLimitError('Search provider rate limit exceeded', context)
  }
  if (response.status === 400 || response.status === 422) {
    throw new InvalidRequestError('Search provider rejected the request', context)
  }
  if (response.status === 408) {
    throw new SearchTimeoutError('Search provider timed out', context)
  }
  throw new ProviderUnavailableError('Search provider returned an error', {
    ...context,
    retryable: response.status >= 500,
  })
}
