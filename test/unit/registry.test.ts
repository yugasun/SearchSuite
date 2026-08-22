import type { ProviderCapabilities } from '../../src/capabilities.js'
import { createProviderRegistry } from '../../src/registry.js'
import type { ProviderContext, SearchProvider } from '../../src/provider.js'

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
    return { query: 'x', engine: 'tavily:advanced', results: [], latencyMs: 0 }
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

    const [first, second] = await Promise.all([
      registry.get('tavily', context),
      registry.get('tavily', context),
    ])

    expect(first).toBe(provider)
    expect(second).toBe(provider)
    expect(factory).toHaveBeenCalledTimes(1)
  })
})

