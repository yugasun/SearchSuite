import { deepseekResponse } from '../../fixtures/deepseek.js'
import { makeContext, makeRequest, makeSearchContext } from '../../helpers.js'
import { createDeepSeekProvider } from '../../../src/providers/deepseek.js'

describe('DeepSeek provider', () => {
  test('maps search request and result fields', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(deepseekResponse)))
    const config = { deepseek: { apiKey: 'test-key' } }
    const provider = createDeepSeekProvider(makeContext(fetcher, config))
    const response = await provider.search(makeRequest('deepseek:web', {
      query: 'latest research',
      maxResults: 3,
      providerOptions: { needContent: true, originalQuestion: 'What is new?', localization: '192.0.2.1' },
    }), makeSearchContext(fetcher, config))

    expect(response.results[0]).toMatchObject({
      title: 'DeepSeek result',
      url: 'https://example.com/deepseek',
      snippet: 'Search excerpt.',
      content: 'Full page content.',
      score: 0.93,
      publishedAt: '2026-03-04T00:00:00.000Z',
      raw: deepseekResponse.results[0],
    })
    expect(fetcher).toHaveBeenCalledWith('https://api.deepseek.com/v1/tools/search', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ authorization: 'Bearer test-key' }),
      body: JSON.stringify({
        query: 'latest research', count: 3, need_content: true,
        ori_question: 'What is new?', localization: '192.0.2.1',
      }),
    }))
    expect(JSON.stringify(response)).not.toContain('test-key')
  })

  test('rejects queries longer than 128 Unicode codepoints without calling fetch', async () => {
    const fetcher = vi.fn<typeof fetch>()
    const config = { deepseek: { apiKey: 'test-key' } }
    const provider = createDeepSeekProvider(makeContext(fetcher, config))

    await expect(provider.search(makeRequest('deepseek:web', { query: '😀'.repeat(129) }), makeSearchContext(fetcher, config)))
      .rejects.toMatchObject({ code: 'INVALID_REQUEST', provider: 'deepseek' })
    expect(fetcher).not.toHaveBeenCalled()
  })

  test.each(['', '😀'.repeat(129)])('rejects invalid originalQuestion %p', async (originalQuestion) => {
    const fetcher = vi.fn<typeof fetch>()
    const config = { deepseek: { apiKey: 'test-key' } }
    const provider = createDeepSeekProvider(makeContext(fetcher, config))

    await expect(provider.search(makeRequest('deepseek:web', {
      providerOptions: { originalQuestion },
    }), makeSearchContext(fetcher, config))).rejects.toMatchObject({ code: 'INVALID_REQUEST' })
    expect(fetcher).not.toHaveBeenCalled()
  })

  test.each(['not-an-ip', '192.0.2.999'])('rejects invalid localization IP %p', async (localization) => {
    const fetcher = vi.fn<typeof fetch>()
    const config = { deepseek: { apiKey: 'test-key' } }
    const provider = createDeepSeekProvider(makeContext(fetcher, config))

    await expect(provider.search(makeRequest('deepseek:web', {
      providerOptions: { localization },
    }), makeSearchContext(fetcher, config))).rejects.toMatchObject({ code: 'INVALID_REQUEST' })
    expect(fetcher).not.toHaveBeenCalled()
  })

  test('caps count to 50 and permits an empty localization', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ results: [] })))
    const config = { deepseek: { apiKey: 'test-key' } }
    const provider = createDeepSeekProvider(makeContext(fetcher, config))
    await provider.search(makeRequest('deepseek:web', { maxResults: 80 }), makeSearchContext(fetcher, config))
    expect(JSON.parse(fetcher.mock.calls[0]![1]?.body as string)).toEqual({ query: 'test query', count: 50 })
  })

  test('rejects unsafe result URLs and strips secrets from raw response', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      results: [
        { title: 'Unsafe', url: 'javascript:alert(1)' },
        { title: 'Safe', url: 'https://example.com/?api_key=test-key' },
      ],
      api_key: 'test-key',
    })))
    const config = { deepseek: { apiKey: 'test-key' } }
    const provider = createDeepSeekProvider(makeContext(fetcher, config))
    const response = await provider.search(makeRequest('deepseek:web'), makeSearchContext(fetcher, config))
    expect(response.results).toHaveLength(1)
    expect(JSON.stringify(response.raw)).not.toContain('test-key')
    expect(JSON.stringify(response.results[0]?.raw)).not.toContain('test-key')
  })

  test('preserves caller cancellation and provider errors', async () => {
    const controller = new AbortController()
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('aborted'))
    const config = { deepseek: { apiKey: 'test-key' } }
    const provider = createDeepSeekProvider(makeContext(fetcher, config))
    const context = { ...makeSearchContext(fetcher, config), signal: controller.signal, abortSource: () => 'caller' as const }
    await expect(provider.search(makeRequest('deepseek:web'), context)).rejects.toMatchObject({ code: 'SEARCH_ABORTED' })

    const failed = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 500 }))
    const failedProvider = createDeepSeekProvider(makeContext(failed, config))
    await expect(failedProvider.search(makeRequest('deepseek:web'), makeSearchContext(failed, config)))
      .rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE', provider: 'deepseek' })
  })
})
