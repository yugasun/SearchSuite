import { exaResponse } from '../../fixtures/exa.js'
import { makeContext, makeRequest, makeSearchContext } from '../../helpers.js'
import { createExaProvider } from '../../../src/providers/exa.js'

describe('Exa provider', () => {
  test('maps engine, highlights, and published date', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(exaResponse), { status: 200 }),
    )
    const provider = createExaProvider(makeContext(fetcher, { exa: { apiKey: 'test-key' } }))
    const response = await provider.search(makeRequest('exa:neural', {
      providerOptions: { highlightsPerUrl: 2 },
    }), makeSearchContext(fetcher, { exa: { apiKey: 'test-key' } }))

    expect(response.results[0]).toMatchObject({
      title: 'Exa result',
      url: 'https://example.com/exa',
      snippet: 'Relevant highlight.',
      publishedAt: '2026-01-03T00:00:00.000Z',
    })
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.exa.ai/search',
      expect.objectContaining({ body: expect.stringContaining('"type":"neural"') }),
    )
  })
})

