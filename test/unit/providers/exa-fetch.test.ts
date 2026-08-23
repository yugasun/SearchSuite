import { createExaFetchProvider } from '../../../src/providers/exa-fetch.js'
import { makeContext, makeFetchContext } from '../../helpers.js'

describe('Exa fetch provider', () => {
  test('maps contents and provider options', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      results: [{ url: 'https://example.com/article', text: 'Article content' }],
    }), { status: 200 }))
    const config = { exa: { apiKey: 'test-key' } }
    const provider = createExaFetchProvider(makeContext(fetcher, config))

    const result = await provider.fetch({
      provider: 'exa',
      url: 'https://example.com/article',
      providerOptions: { maxCharacters: 500 },
    }, makeFetchContext(fetcher, config))

    expect(result).toMatchObject({
      url: 'https://example.com/article',
      statusCode: 200,
      body: { kind: 'text', content: 'Article content' },
      truncated: false,
    })
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.exa.ai/contents',
      expect.objectContaining({ method: 'POST' }),
    )
    const init = fetcher.mock.calls[0]?.[1]
    expect(JSON.parse(String(init?.body))).toMatchObject({
      urls: ['https://example.com/article'],
      text: { maxCharacters: 500 },
    })
  })

  test('maps upstream errors through the shared fetch boundary', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 429 }))
    const provider = createExaFetchProvider(makeContext(fetcher, { exa: { apiKey: 'test-key' } }))

    await expect(provider.fetch({ provider: 'exa', url: 'https://example.com' }, makeFetchContext(fetcher, { exa: { apiKey: 'test-key' } })))
      .rejects.toMatchObject({ code: 'RATE_LIMIT_ERROR', operation: 'fetch', provider: 'exa' })
  })
})
