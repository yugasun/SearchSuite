import { doubaoCustomResponse, doubaoGlobalResponse } from '../../fixtures/doubao.js'
import { makeContext, makeRequest, makeSearchContext } from '../../helpers.js'
import { createDoubaoProvider } from '../../../src/providers/doubao.js'

describe('Doubao provider', () => {
  test('maps Custom search results and summary option', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(doubaoCustomResponse), { status: 200 }),
    )
    const provider = createDoubaoProvider(makeContext(fetcher, { doubao: { apiKey: 'test-key' } }))
    const response = await provider.search(makeRequest('doubao:custom', {
      providerOptions: { needSummary: false },
    }), makeSearchContext(fetcher, { doubao: { apiKey: 'test-key' } }))

    expect(response.results[0]).toMatchObject({ title: 'Doubao result', url: 'https://example.com/doubao' })
    expect(fetcher).toHaveBeenCalledWith(
      'https://open.feedcoopapi.com/search_api/web_search',
      expect.objectContaining({ body: expect.stringContaining('"NeedSummary":false') }),
    )
  })

  test('maps Global documents and snippet limit', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(doubaoGlobalResponse), { status: 200 }),
    )
    const provider = createDoubaoProvider(makeContext(fetcher, { doubao: { apiKey: 'test-key' } }))
    const response = await provider.search(makeRequest('doubao:global', {
      providerOptions: { maxSnippetLength: 400 },
    }), makeSearchContext(fetcher, { doubao: { apiKey: 'test-key' } }))

    expect(response.results[0]).toMatchObject({ title: 'Doubao global result', snippet: 'Global snippet.' })
    expect(fetcher).toHaveBeenCalledWith(
      'https://open.feedcoopapi.com/search_api/global_search',
      expect.objectContaining({ body: expect.stringContaining('"MaxSnippetLength":400') }),
    )
  })
})

