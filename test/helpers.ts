import type { ProviderContext, ProviderSearchContext } from '../src/provider.js'
import type { NormalizedSearchRequest, ProviderConfigMap, SearchEngine } from '../src/types.js'

export function makeContext(
  fetch: typeof globalThis.fetch,
  config: ProviderConfigMap = {},
): ProviderContext {
  return { fetch, timeoutMs: 30_000, config }
}

export function makeSearchContext(
  fetch: typeof globalThis.fetch,
  config: ProviderConfigMap = {},
): ProviderSearchContext {
  return { ...makeContext(fetch, config), signal: new AbortController().signal, warn: vi.fn() }
}

export function makeRequest<E extends SearchEngine>(
  engine: E,
  values: Partial<Omit<NormalizedSearchRequest<E>, 'engine' | 'capabilities'>> = {},
): NormalizedSearchRequest<E> {
  return {
    engine,
    query: 'test query',
    maxResults: 5,
    capabilities: {
      includeDomains: false,
      excludeDomains: false,
      timeRange: false,
      content: true,
      score: true,
    },
    ...values,
  }
}

