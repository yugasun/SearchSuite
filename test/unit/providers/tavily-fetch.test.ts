import { createTavilyFetchProvider } from '../../../src/providers/tavily-fetch.js'
import { makeContext, makeFetchContext } from '../../helpers.js'

describe('Tavily fetch provider', () => {
  test('maps extract content and options', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      results: [{ url: 'https://example.com/article', raw_content: '# Article' }],
    }), { status: 200 }))
    const config = { tavily: { apiKey: 'test-key' } }
    const provider = createTavilyFetchProvider(makeContext(fetcher, config))

    const result = await provider.fetch({
      provider: 'tavily',
      url: 'https://example.com/article',
      providerOptions: { extractDepth: 'advanced', format: 'markdown' },
    }, makeFetchContext(fetcher, config))

    expect(result).toMatchObject({
      url: 'https://example.com/article',
      statusCode: 200,
      body: { kind: 'text', content: '# Article' },
      truncated: false,
    })
    const init = fetcher.mock.calls[0]?.[1]
    expect(JSON.parse(String(init?.body))).toMatchObject({
      urls: ['https://example.com/article'],
      extract_depth: 'advanced',
      format: 'markdown',
    })
  })

  test('preserves null defaults and rejects invalid non-null options before requesting', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ results: [{ raw_content: 'ok' }] }), { status: 200 }))
    const config = { tavily: { apiKey: 'test-key' } }
    const provider = createTavilyFetchProvider(makeContext(fetcher, config))

    await provider.fetch({ provider: 'tavily', url: 'https://example.com', providerOptions: { extractDepth: null, format: null } as never }, makeFetchContext(fetcher, config))
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toMatchObject({ extract_depth: 'basic', format: 'markdown' })

    fetcher.mockClear()
    await expect(provider.fetch({ provider: 'tavily', url: 'https://example.com', providerOptions: { extractDepth: 'slow' } as never }, makeFetchContext(fetcher, config)))
      .rejects.toMatchObject({ code: 'INVALID_REQUEST', provider: 'tavily', operation: 'fetch' })
    expect(fetcher).not.toHaveBeenCalled()
  })

  test('accepts explicitly undefined options as defaults', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ results: [{ raw_content: 'ok' }] }), { status: 200 }))
    const config = { tavily: { apiKey: 'test-key' } }
    const provider = createTavilyFetchProvider(makeContext(fetcher, config))

    await provider.fetch({ provider: 'tavily', url: 'https://example.com', providerOptions: { extractDepth: undefined, format: undefined } as never }, makeFetchContext(fetcher, config))
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toMatchObject({ extract_depth: 'basic', format: 'markdown' })
  })
})
