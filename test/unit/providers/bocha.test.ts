import { bochaExpectedResult, bochaResponse } from '../../fixtures/bocha.js'
import { makeContext, makeRequest, makeSearchContext } from '../../helpers.js'
import { createBochaProvider } from '../../../src/providers/bocha.js'

describe('Bocha provider', () => {
  test('maps web results and forwards documented options', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(bochaResponse)))
    const provider = createBochaProvider(makeContext(fetcher, { bocha: { apiKey: 'test-key' } }))
    const response = await provider.search(makeRequest('bocha:web', {
      providerOptions: { summary: true, freshness: '2025-01-01..2025-01-31' },
    }), makeSearchContext(fetcher, { bocha: { apiKey: 'test-key' } }))
    expect(response.answer).toBeUndefined()
    expect(response.results[0]).toMatchObject(bochaExpectedResult)
    expect(fetcher).toHaveBeenCalledWith('https://api.bochaai.com/v1/web-search', expect.objectContaining({
      method: 'POST', headers: expect.objectContaining({ authorization: 'Bearer test-key' }),
    }))
    expect(JSON.parse(fetcher.mock.calls[0]![1]!.body as string)).toMatchObject({
      query: 'test query', summary: true, freshness: '2025-01-01..2025-01-31', count: 5,
    })
  })

  test('maps common time range when freshness is not supplied', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(bochaResponse)))
    const provider = createBochaProvider(makeContext(fetcher, { bocha: { apiKey: 'test-key' } }))
    await provider.search(makeRequest('bocha:web', { timeRange: 'month' }),
      makeSearchContext(fetcher, { bocha: { apiKey: 'test-key' } }))
    expect(JSON.parse(fetcher.mock.calls[0]![1]!.body as string).freshness).toBe('oneMonth')
  })
  test('explicit freshness takes precedence over common timeRange', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(bochaResponse)))
    const provider = createBochaProvider(makeContext(fetcher, { bocha: { apiKey: 'test-key' } }))
    await provider.search(makeRequest('bocha:web', { timeRange: 'month', providerOptions: { freshness: 'oneDay' } }),
      makeSearchContext(fetcher, { bocha: { apiKey: 'test-key' } }))
    expect(JSON.parse(fetcher.mock.calls[0]![1]!.body as string).freshness).toBe('oneDay')
  })


  test('validates provider options before requesting', async () => {
    const fetcher = vi.fn<typeof fetch>()
    const provider = createBochaProvider(makeContext(fetcher, { bocha: { apiKey: 'test-key' } }))
    await expect(provider.search(makeRequest('bocha:web', { providerOptions: { summary: 'true' as never } }),
      makeSearchContext(fetcher, { bocha: { apiKey: 'test-key' } }))).rejects.toMatchObject({ code: 'INVALID_REQUEST' })
    expect(fetcher).not.toHaveBeenCalled()
    await expect(provider.search(makeRequest('bocha:web', { providerOptions: { freshness: 'lastWeek' } }),
      makeSearchContext(fetcher, { bocha: { apiKey: 'test-key' } }))).rejects.toMatchObject({ code: 'INVALID_REQUEST' })
  })

  test('supports cancellation and HTTP errors', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('aborted'))
    const provider = createBochaProvider(makeContext(fetcher, { bocha: { apiKey: 'test-key' } }))
    await expect(provider.search(makeRequest('bocha:web'), { ...makeSearchContext(fetcher), abortSource: () => 'caller' }))
      .rejects.toMatchObject({ code: 'SEARCH_ABORTED' })
    const failed = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 429 }))
    const failedProvider = createBochaProvider(makeContext(failed, { bocha: { apiKey: 'test-key' } }))
    await expect(failedProvider.search(makeRequest('bocha:web'), makeSearchContext(failed, { bocha: { apiKey: 'test-key' } })))
      .rejects.toMatchObject({ code: 'RATE_LIMIT_ERROR' })
  })
})
