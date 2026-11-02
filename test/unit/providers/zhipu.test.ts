import { zhipuExpectedResult, zhipuResponse } from '../../fixtures/zhipu.js'
import { makeContext, makeRequest, makeSearchContext } from '../../helpers.js'
import { createZhipuProvider } from '../../../src/providers/zhipu.js'

describe('Zhipu provider', () => {
  test('maps fields and sends explicit search options', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(zhipuResponse)))
    const provider = createZhipuProvider(makeContext(fetcher, { zhipu: { apiKey: 'test-key' } }))
    const response = await provider.search(makeRequest('zhipu:web', {
      providerOptions: { searchEngine: 'search_pro_quark', contentSize: 'high', searchIntent: true },
    }), makeSearchContext(fetcher, { zhipu: { apiKey: 'test-key' } }))

    expect(response.results[0]).toMatchObject(zhipuExpectedResult)
    expect(fetcher).toHaveBeenCalledWith('https://open.bigmodel.cn/api/paas/v4/web_search', expect.objectContaining({
      method: 'POST', headers: expect.objectContaining({ authorization: 'Bearer test-key' }),
    }))
    expect(JSON.parse(fetcher.mock.calls[0]![1]!.body as string)).toMatchObject({
      search_query: 'test query', search_engine: 'search_pro_quark', search_intent: true, content_size: 'high', count: 5,
    })

  })
  test('uses a supported Sogou count and caps normalized results to maxResults', async () => {
    const payload = { ...zhipuResponse, search_result: Array.from({ length: 10 }, () => zhipuResponse.search_result[0]) }
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(payload)))
    const provider = createZhipuProvider(makeContext(fetcher, { zhipu: { apiKey: 'test-key' } }))
    const response = await provider.search(makeRequest('zhipu:web', { maxResults: 5, providerOptions: { searchEngine: 'search_pro_sogou' } }),
      makeSearchContext(fetcher, { zhipu: { apiKey: 'test-key' } }))
    expect(JSON.parse(fetcher.mock.calls[0]![1]!.body as string).count).toBe(10)
    expect(response.results).toHaveLength(5)
  })

  test('uses defaults and validates options before requesting', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(zhipuResponse)))
    const provider = createZhipuProvider(makeContext(fetcher, { zhipu: { apiKey: 'test-key' } }))
    await provider.search(makeRequest('zhipu:web'), makeSearchContext(fetcher, { zhipu: { apiKey: 'test-key' } }))
    expect(JSON.parse(fetcher.mock.calls[0]![1]!.body as string)).toMatchObject({ search_engine: 'search_std', search_intent: false, count: 5 })
    await expect(provider.search(makeRequest('zhipu:web', { providerOptions: { contentSize: 'low' as never } }),
      makeSearchContext(fetcher, { zhipu: { apiKey: 'test-key' } }))).rejects.toMatchObject({ code: 'INVALID_REQUEST' })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  test('maps response without intent as answer, supports cancellation and HTTP errors', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('aborted'))
    const provider = createZhipuProvider(makeContext(fetcher, { zhipu: { apiKey: 'test-key' } }))
    await expect(provider.search(makeRequest('zhipu:web'), { ...makeSearchContext(fetcher), abortSource: () => 'caller' }))
      .rejects.toMatchObject({ code: 'SEARCH_ABORTED' })
    const failed = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 401 }))
    const failedProvider = createZhipuProvider(makeContext(failed, { zhipu: { apiKey: 'test-key' } }))
    await expect(failedProvider.search(makeRequest('zhipu:web'), makeSearchContext(failed, { zhipu: { apiKey: 'test-key' } })))
      .rejects.toMatchObject({ code: 'AUTHENTICATION_ERROR' })
  })
})
