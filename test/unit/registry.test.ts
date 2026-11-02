import type { ProviderCapabilities } from '../../src/capabilities.js'
import { createFetchProviderRegistry, createProviderRegistry } from '../../src/registry.js'
import type { FetchProvider, ProviderContext, SearchProvider } from '../../src/provider.js'

const capabilities: ProviderCapabilities = {
  includeDomains: true,
  excludeDomains: true,
  timeRange: true,
  content: true,
  score: true,
}

const provider: SearchProvider = {
  id: 'tavily',
  capabilities,
  async search() {
    return { provider: 'tavily', query: 'x', engine: 'tavily:advanced', results: [], latencyMs: 0 }
  },
}

const context: ProviderContext = {
  fetch: globalThis.fetch,
  timeoutMs: 30_000,
  config: {},
}

describe('Provider registry', () => {
  test('lazily creates and caches one Provider instance', async () => {
    const factory = vi.fn(() => provider)
    const registry = createProviderRegistry({ tavily: factory })

    const firstPending = registry.get('tavily', context)
    const secondPending = registry.get('tavily', context)
    expect(secondPending).toBe(firstPending)
    const [first, second] = await Promise.all([firstPending, secondPending])

    expect(first).toBe(provider)
    expect(second).toBe(provider)
    expect(factory).toHaveBeenCalledTimes(1)
  })

  test('evicts synchronous and asynchronous failures before retrying', async () => {
    let attempts = 0
    const factory = vi.fn(() => {
      attempts += 1
      if (attempts === 1) throw new Error('sync failure')
      if (attempts === 2) return Promise.reject(new Error('async failure'))
      return provider
    })
    const registry = createProviderRegistry({ tavily: factory })

    await expect(registry.get('tavily', context)).rejects.toThrow('sync failure')
    await expect(registry.get('tavily', context)).rejects.toThrow('async failure')
    await expect(registry.get('tavily', context)).resolves.toBe(provider)
    expect(factory).toHaveBeenCalledTimes(3)
  })

  test('loads and caches the built-in DeepSeek fetch adapter', async () => {
    const registry = createFetchProviderRegistry()
    const configured = { ...context, config: { deepseek: { apiKey: 'fixture-key' } } }
    const first = await registry.get('deepseek', configured)
    expect(first.id).toBe('deepseek')
    expect(await registry.get('deepseek', configured)).toBe(first)
  })

  test('evicts synchronous and asynchronous fetch failures before retrying', async () => {
    const fetchProvider: FetchProvider = {
      id: 'tavily',
      async fetch() {
        return {
          url: 'https://example.com',
          statusCode: 200,
          body: { kind: 'text', content: '' },
          truncated: false,
        }
      },
    }
    let attempts = 0
    const factory = vi.fn(() => {
      attempts += 1
      if (attempts === 1) throw new Error('sync failure')
      if (attempts === 2) return Promise.reject(new Error('async failure'))
      return fetchProvider
    })
    const registry = createFetchProviderRegistry({ tavily: factory })

    await expect(registry.get('tavily', context)).rejects.toThrow('sync failure')
    await expect(registry.get('tavily', context)).rejects.toThrow('async failure')
    await expect(registry.get('tavily', context)).resolves.toBe(fetchProvider)
    expect(factory).toHaveBeenCalledTimes(3)
  })

  test('shares one pending fetch provider initialization', async () => {
    const factory = vi.fn(async () => ({
      id: 'tavily' as const,
      async fetch() {
        return {
          url: 'https://example.com',
          statusCode: 200,
          body: { kind: 'text' as const, content: '' },
          truncated: false,
        }
      },
    }))
    const registry = createFetchProviderRegistry({ tavily: factory })

    const firstPending = registry.get('tavily', context)
    const secondPending = registry.get('tavily', context)
    expect(secondPending).toBe(firstPending)
    expect(await firstPending).toBe(await secondPending)
    expect(factory).toHaveBeenCalledTimes(1)
  })
})
