import { SearchSuite } from '../../../src/index.js'
import { deepseekFetchResponse } from '../../fixtures/deepseek-fetch.js'
import { createDeepSeekFetchProvider } from '../../../src/providers/deepseek-fetch.js'
import { createZhipuFetchProvider } from '../../../src/providers/zhipu-fetch.js'
import { makeContext, makeFetchContext } from '../../helpers.js'

const url = 'https://example.com/article'
const deepseekConfig = { deepseek: { apiKey: 'test-key' } }
const zhipuConfig = { zhipu: { apiKey: 'test-key' } }

describe('DeepSeek fetch provider', () => {
  test('maps the official response and sends only the URL', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(deepseekFetchResponse), { status: 200 }))
    const provider = createDeepSeekFetchProvider(makeContext(fetcher, deepseekConfig))
    const result = await provider.fetch({ provider: 'deepseek', url }, makeFetchContext(fetcher, deepseekConfig))
    expect(result).toMatchObject({ url, statusCode: 200, body: { kind: 'text', content: deepseekFetchResponse.content }, truncated: false })
    expect(result.raw).toMatchObject({ title: deepseekFetchResponse.title })
    expect(JSON.stringify(result.raw)).not.toContain(deepseekFetchResponse.api_key)
    expect(fetcher).toHaveBeenCalledWith('https://api.deepseek.com/v1/tools/fetch', expect.objectContaining({
      method: 'POST', headers: expect.objectContaining({ authorization: `Bearer ${deepseekConfig.deepseek.apiKey}` }), body: JSON.stringify({ url }),
    }))
  })

  test('maps upstream rate limits through the shared HTTP boundary', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 429 }))
    const provider = createDeepSeekFetchProvider(makeContext(fetcher, deepseekConfig))
    await expect(provider.fetch({ provider: 'deepseek', url }, makeFetchContext(fetcher, deepseekConfig)))
      .rejects.toMatchObject({ code: 'RATE_LIMIT_ERROR', operation: 'fetch', provider: 'deepseek' })
  })

  test('rejects unsupported options before making a request', async () => {
    const fetcher = vi.fn<typeof fetch>()
    const provider = createDeepSeekFetchProvider(makeContext(fetcher, deepseekConfig))
    await expect(provider.fetch({ provider: 'deepseek', url, providerOptions: { unsupported: true } as never }, makeFetchContext(fetcher, deepseekConfig)))
      .rejects.toMatchObject({ code: 'INVALID_REQUEST', operation: 'fetch', provider: 'deepseek' })
    expect(fetcher).not.toHaveBeenCalled()
  })

  test.each(['', '   ', undefined, 42])('maps unusable content %s to a 502 result', async (content) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ title: 'Article', content }), { status: 200 }))
    const provider = createDeepSeekFetchProvider(makeContext(fetcher, deepseekConfig))
    await expect(provider.fetch({ provider: 'deepseek', url }, makeFetchContext(fetcher, deepseekConfig)))
      .resolves.toMatchObject({ url, statusCode: 502, truncated: false })
  })

  test.each([[401, 'AUTHENTICATION_ERROR'], [400, 'INVALID_REQUEST'], [503, 'PROVIDER_UNAVAILABLE']] as const)('maps HTTP %s errors', async (status, code) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status }))
    const provider = createDeepSeekFetchProvider(makeContext(fetcher, deepseekConfig))
    await expect(provider.fetch({ provider: 'deepseek', url }, makeFetchContext(fetcher, deepseekConfig)))
      .rejects.toMatchObject({ code, statusCode: status, provider: 'deepseek', operation: 'fetch' })
  })

  test('propagates caller cancellation to the HTTP request', async () => {
    const controller = new AbortController()
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => {
      controller.abort()
      expect(init?.signal?.aborted).toBe(true)
      throw new DOMException('Aborted', 'AbortError')
    })
    const client = new SearchSuite({ fetch: fetcher, providers: deepseekConfig })
    await expect(client.fetch({ provider: 'deepseek', url, signal: controller.signal }))
      .rejects.toMatchObject({ code: 'SEARCH_ABORTED', provider: 'deepseek', operation: 'fetch' })
  })
})

describe('Zhipu fetch provider', () => {
  test('maps documented options to the reader API and preserves the requested URL', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ reader_result: { title: 'Article', content: '# Article', url: 'https://redirected.example/' } }), { status: 200 }))
    const provider = createZhipuFetchProvider(makeContext(fetcher, zhipuConfig))
    const result = await provider.fetch({ provider: 'zhipu', url, providerOptions: { format: 'text', noCache: true, timeoutSeconds: 12 } }, makeFetchContext(fetcher, zhipuConfig))
    expect(result).toMatchObject({ url, statusCode: 200, body: { kind: 'text', content: '# Article' }, truncated: false })
    expect(fetcher).toHaveBeenCalledWith('https://open.bigmodel.cn/api/paas/v4/reader', expect.objectContaining({
      method: 'POST', headers: expect.objectContaining({ authorization: `Bearer ${zhipuConfig.zhipu.apiKey}` }),
      body: JSON.stringify({ url, timeout: 12, no_cache: true, return_format: 'text' }),
    }))
  })

  test('accepts explicitly undefined Zhipu reader options', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ reader_result: { content: 'ok' } }), { status: 200 }))
    const provider = createZhipuFetchProvider(makeContext(fetcher, zhipuConfig))

    await provider.fetch({ provider: 'zhipu', url, providerOptions: { noCache: undefined, timeoutSeconds: undefined } as never }, makeFetchContext(fetcher, zhipuConfig))
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({ url })
  })

  test('rejects invalid option values before making a request', async () => {
    const fetcher = vi.fn<typeof fetch>()
    const provider = createZhipuFetchProvider(makeContext(fetcher, zhipuConfig))
    await expect(provider.fetch({ provider: 'zhipu', url, providerOptions: { noCache: 'yes' } as never }, makeFetchContext(fetcher, zhipuConfig)))
      .rejects.toMatchObject({ code: 'INVALID_REQUEST', operation: 'fetch', provider: 'zhipu' })
    expect(fetcher).not.toHaveBeenCalled()
  })

  test('maps empty reader content to a 502 result', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ reader_result: { title: 'Article' } }), { status: 200 }))
    const provider = createZhipuFetchProvider(makeContext(fetcher, zhipuConfig))
    await expect(provider.fetch({ provider: 'zhipu', url }, makeFetchContext(fetcher, zhipuConfig))).resolves.toMatchObject({ statusCode: 502, truncated: false })
  })
})
