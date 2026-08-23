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
})
