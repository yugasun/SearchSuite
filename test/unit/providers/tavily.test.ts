import { tavilyResponse } from '../../fixtures/tavily.js'
import { makeContext, makeRequest, makeSearchContext } from '../../helpers.js'
import { createTavilyProvider } from '../../../src/providers/tavily.js'

describe('Tavily provider', () => {
  test('maps advanced request and response including answer and usage', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(tavilyResponse), { status: 200 }),
    )
    const provider = createTavilyProvider(makeContext(fetcher, { tavily: { apiKey: 'test-key' } }))
    const response = await provider.search(makeRequest('tavily:advanced', {
      includeDomains: ['example.com'],
      timeRange: 'week',
      providerOptions: { includeAnswer: true, chunksPerSource: 2 },
    }), makeSearchContext(fetcher, { tavily: { apiKey: 'test-key' } }))

    expect(response.answer).toBe('A concise answer.')
    expect(response.results[0]).toMatchObject({
      title: 'Example result',
      url: 'https://example.com/article',
      snippet: 'A useful snippet.',
      score: 0.91,
      publishedAt: '2026-01-02T03:04:05.000Z',
    })
    expect(response.usage?.credits).toBe(1)
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.tavily.com/search',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"search_depth":"advanced"'),
      }),
    )
  })
})

