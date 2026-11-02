import { alibabaResponse } from '../../fixtures/alibaba.js'
import { makeContext, makeRequest, makeSearchContext } from '../../helpers.js'
import { createAlibabaProvider } from '../../../src/providers/alibaba.js'

const config = { alibaba: { apiKey: 'test-key', baseUrl: 'https://workspace.example.com' } }

describe('Alibaba provider', () => {
  test('sends DashScope search request and maps answer and sources', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(alibabaResponse)))
    const provider = createAlibabaProvider(makeContext(fetcher, config))
    const response = await provider.search(makeRequest('alibaba:web', {
      query: 'Alibaba query', maxResults: 1, providerOptions: { model: 'qwen-max' },
    }), makeSearchContext(fetcher, config))

    expect(fetcher).toHaveBeenCalledWith(
      'https://workspace.example.com/api/v1/services/aigc/text-generation/generation',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ authorization: 'Bearer test-key' }),
      }),
    )
    expect(JSON.parse(fetcher.mock.calls[0]![1]!.body as string)).toEqual({
      model: 'qwen-max',
      input: { messages: [{ role: 'user', content: 'Alibaba query' }] },
      parameters: {
        enable_search: true,
        result_format: 'message',
        search_options: { forced_search: true, enable_source: true },
      },
    })
    expect(response.results).toMatchObject([{ title: 'Alibaba result', url: 'https://example.com/alibaba' }])
    expect(response.answer).toBe('Alibaba answer.')
  })

  test('defaults the model and requires an explicit base URL', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(alibabaResponse)))
    const provider = createAlibabaProvider(makeContext(fetcher, config))
    await provider.search(makeRequest('alibaba:web'), makeSearchContext(fetcher, config))
    expect(JSON.parse(fetcher.mock.calls[0]![1]!.body as string).model).toBe('qwen-plus')

    expect(() => createAlibabaProvider(makeContext(fetcher, { alibaba: { apiKey: 'key' } })))
      .toThrow(expect.objectContaining({ code: 'CONFIGURATION_ERROR' }))
  })

  test('rejects invalid provider options before requesting', async () => {
    const fetcher = vi.fn<typeof fetch>()
    const provider = createAlibabaProvider(makeContext(fetcher, config))
    await expect(provider.search(makeRequest('alibaba:web', {
      providerOptions: { model: 3 as never },
    }), makeSearchContext(fetcher, config))).rejects.toMatchObject({ code: 'INVALID_REQUEST' })
    await expect(provider.search(makeRequest('alibaba:web', {
      providerOptions: { unsupported: true } as never,
    }), makeSearchContext(fetcher, config))).rejects.toMatchObject({ code: 'INVALID_REQUEST' })
    expect(fetcher).not.toHaveBeenCalled()
  })

  test('propagates cancellation and HTTP errors through requestJson', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('aborted'))
    const provider = createAlibabaProvider(makeContext(fetcher, config))
    await expect(provider.search(makeRequest('alibaba:web'), makeSearchContext(fetcher, config)))
      .rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' })

    const cancelled = vi.fn<typeof fetch>().mockRejectedValue(new Error('aborted'))
    const cancelledProvider = createAlibabaProvider(makeContext(cancelled, config))
    await expect(cancelledProvider.search(makeRequest('alibaba:web'), {
      ...makeSearchContext(cancelled, config), abortSource: () => 'caller',
    })).rejects.toMatchObject({ code: 'SEARCH_ABORTED' })

    const failed = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 401 }))
    const failedProvider = createAlibabaProvider(makeContext(failed, config))
    await expect(failedProvider.search(makeRequest('alibaba:web'), makeSearchContext(failed, config)))
      .rejects.toMatchObject({ code: 'AUTHENTICATION_ERROR' })
  })
})
