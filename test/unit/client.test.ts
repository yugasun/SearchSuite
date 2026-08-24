import { SearchAbortedError, UnsupportedCapabilityError } from '../../src/errors.js'
import { SearchSuite } from '../../src/client.js'
import { createProviderRegistry } from '../../src/registry.js'
import type { SearchProvider } from '../../src/provider.js'

function makeProvider(capabilities: SearchProvider['capabilities']): SearchProvider {
  return {
    id: 'tavily',
    capabilities,
    async search(request) {
      return {
        provider: 'tavily',
        query: request.query,
        engine: request.engine,
        results: [{ title: 'Example', url: 'https://example.com' }],
        latencyMs: 0,
      }
    },
  }
}

describe('SearchSuite client', () => {
  test('normalizes input, applies latency, and returns a unified response', async () => {
    const provider = makeProvider({
      includeDomains: true,
      excludeDomains: true,
      timeRange: true,
      content: true,
      score: true,
    })
    const client = new SearchSuite({ timeoutMs: 100 }, createProviderRegistry({ tavily: () => provider }))

    const response = await client.search({
      engine: 'tavily:advanced',
      query: '  hello  ',
      maxResults: 2,
      includeDomains: ['example.com'],
    })

    expect(response.query).toBe('hello')
    expect(response.engine).toBe('tavily:advanced')
    expect(response.results[0]?.url).toBe('https://example.com')
    expect(response.latencyMs).toBeGreaterThanOrEqual(0)
  })

  test('accepts provider-first search requests and resolves the provider mode internally', async () => {
    const provider = makeProvider({
      includeDomains: true,
      excludeDomains: true,
      timeRange: true,
      content: true,
      score: true,
    })
    const client = new SearchSuite({}, createProviderRegistry({ tavily: () => provider }))

    const response = await client.search({
      provider: 'tavily',
      query: 'hello',
      providerOptions: { searchDepth: 'advanced' },
    })

    expect(response.provider).toBe('tavily')
    expect(response.engine).toBe('tavily:advanced')
  })

  test('does not forward a consumed provider mode to the provider adapter', async () => {
    let receivedOptions: unknown
    const provider = {
      ...makeProvider({
        includeDomains: true,
        excludeDomains: true,
        timeRange: true,
        content: true,
        score: true,
      }),
      async search(request: Parameters<SearchProvider['search']>[0]) {
        receivedOptions = request.providerOptions
        return {
          provider: 'tavily' as const,
          query: request.query,
          engine: request.engine,
          results: [{ title: 'Example', url: 'https://example.com' }],
          latencyMs: 0,
        }
      },
    }
    const client = new SearchSuite({}, createProviderRegistry({ tavily: () => provider }))

    await client.search({
      provider: 'tavily',
      query: 'hello',
      providerOptions: { searchDepth: 'advanced' },
    })

    expect(receivedOptions).toBeUndefined()
  })

  test('fetches page content through the selected provider', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      results: [{ url: 'https://example.com/article', text: 'Article content' }],
    }), { status: 200 }))
    const client = new SearchSuite({
      fetch: fetcher,
      providers: { exa: { apiKey: 'test-key' } },
    })

    const response = await client.fetch({
      provider: 'exa',
      url: 'https://example.com/article',
      providerOptions: { maxCharacters: 1_000 },
    })

    expect(response.provider).toBe('exa')
    expect(response.body).toEqual({ kind: 'text', content: 'Article content' })
    expect(response.latencyMs).toBeGreaterThanOrEqual(0)
  })

  test('warn mode drops unsupported common parameters', async () => {
    const provider = makeProvider({
      includeDomains: false,
      excludeDomains: false,
      timeRange: false,
      content: false,
      score: false,
    })
    const warnings: string[] = []
    const client = new SearchSuite({
      onWarning: (warning) => warnings.push(warning.parameter),
    }, createProviderRegistry({ tavily: () => provider }))

    await client.search({ engine: 'tavily:advanced', query: 'hello', includeDomains: ['example.com'] })

    expect(warnings).toEqual(['includeDomains'])
  })

  test('strict mode rejects unsupported common parameters', async () => {
    const provider = makeProvider({
      includeDomains: false,
      excludeDomains: false,
      timeRange: false,
      content: false,
      score: false,
    })
    const client = new SearchSuite({
      unsupportedParamMode: 'strict',
    }, createProviderRegistry({ tavily: () => provider }))

    await expect(client.search({ engine: 'tavily:advanced', query: 'hello', includeDomains: ['example.com'] }))
      .rejects.toBeInstanceOf(UnsupportedCapabilityError)
  })

  test('pre-aborted requests do not initialize a Provider', async () => {
    const controller = new AbortController()
    controller.abort()
    const factory = vi.fn(() => makeProvider({
      includeDomains: true,
      excludeDomains: true,
      timeRange: true,
      content: true,
      score: true,
    }))
    const client = new SearchSuite({}, createProviderRegistry({ tavily: factory }))

    await expect(client.search({ engine: 'tavily:advanced', query: 'hello', signal: controller.signal }))
      .rejects.toBeInstanceOf(SearchAbortedError)
    expect(factory).not.toHaveBeenCalled()
  })

  test('pre-aborted fetches do not initialize a Fetch Provider', async () => {
    const controller = new AbortController()
    controller.abort()
    const fetcher = vi.fn<typeof fetch>()
    const client = new SearchSuite({
      fetch: fetcher,
      providers: { exa: { apiKey: 'test-key' } },
    })

    await expect(client.fetch({
      provider: 'exa',
      url: 'https://example.com',
      signal: controller.signal,
    })).rejects.toBeInstanceOf(SearchAbortedError)
    expect(fetcher).not.toHaveBeenCalled()
  })
})
