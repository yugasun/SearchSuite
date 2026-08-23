import { baiduAiResponse, baiduWebResponse } from '../../fixtures/baidu.js'
import { makeContext, makeRequest, makeSearchContext } from '../../helpers.js'
import { createBaiduProvider } from '../../../src/providers/baidu.js'

describe('Baidu provider', () => {
  test('maps ordinary web references', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(baiduWebResponse), { status: 200 }),
    )
    const provider = createBaiduProvider(makeContext(fetcher, { baidu: { apiKey: 'test-key' } }))
    const response = await provider.search(makeRequest('baidu:web'), makeSearchContext(fetcher, { baidu: { apiKey: 'test-key' } }))

    expect(response.results[0]).toMatchObject({ title: 'Baidu result', url: 'https://example.com/baidu' })
    expect(fetcher).toHaveBeenCalledWith(
      'https://qianfan.baidubce.com/v2/ai_search/web_search',
      expect.objectContaining({ body: expect.stringContaining('"top_k":5') }),
    )
  })

  test('maps AI answer and model option', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(baiduAiResponse), { status: 200 }),
    )
    const provider = createBaiduProvider(makeContext(fetcher, { baidu: { apiKey: 'test-key' } }))
    const response = await provider.search(makeRequest('baidu:ai', {
      providerOptions: { model: 'custom-model' },
    }), makeSearchContext(fetcher, { baidu: { apiKey: 'test-key' } }))

    expect(response.answer).toBe('Baidu AI answer.')
    expect(fetcher).toHaveBeenCalledWith(
      'https://qianfan.baidubce.com/v2/ai_search/chat/completions',
      expect.objectContaining({ body: expect.stringContaining('"model":"custom-model"') }),
    )
  })

  test('rejects non-string model options before requesting', async () => {
    const fetcher = vi.fn<typeof fetch>()
    const provider = createBaiduProvider(makeContext(fetcher, { baidu: { apiKey: 'test-key' } }))

    await expect(provider.search(makeRequest('baidu:ai', {
      providerOptions: { model: 123 as unknown as string },
    }), makeSearchContext(fetcher, { baidu: { apiKey: 'test-key' } })))
      .rejects.toMatchObject({ code: 'INVALID_REQUEST', provider: 'baidu' })
    expect(fetcher).not.toHaveBeenCalled()
  })
})
