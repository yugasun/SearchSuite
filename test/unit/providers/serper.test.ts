import { serperResponse } from '../../fixtures/serper.js'
import { makeContext, makeRequest, makeSearchContext } from '../../helpers.js'
import { createSerperProvider } from '../../../src/providers/serper.js'

describe('Serper provider', () => {
  test('maps organic results and answer box', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(serperResponse), { status: 200 }),
    )
    const provider = createSerperProvider(makeContext(fetcher, { serper: { apiKey: 'test-key' } }))
    const response = await provider.search(makeRequest('serper:google', {
      providerOptions: { gl: 'us', hl: 'en' },
    }), makeSearchContext(fetcher, { serper: { apiKey: 'test-key' } }))

    expect(response.answer).toBe('An answer box.')
    expect(response.results[0]).toMatchObject({
      title: 'Serper result',
      url: 'https://example.com/serper',
      snippet: 'SERP snippet.',
    })
    expect(fetcher).toHaveBeenCalledWith(
      'https://google.serper.dev/search',
      expect.objectContaining({ body: expect.stringContaining('"gl":"us"') }),
    )
  })
})

