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
})

