import { createFetchProviderRegistry } from '../../src/registry.js'
import { makeContext, makeFetchContext } from '../helpers.js'

const url = 'https://example.com/article'

describe('fetch provider contract', () => {
  test.each([
    { provider: 'deepseek' as const, config: { deepseek: { apiKey: 'test-key' } }, payload: { title: 'Article', content: '# Article' }, endpoint: 'https://api.deepseek.com/v1/tools/fetch' },
    { provider: 'zhipu' as const, config: { zhipu: { apiKey: 'test-key' } }, payload: { reader_result: { title: 'Article', content: '# Article' } }, endpoint: 'https://open.bigmodel.cn/api/paas/v4/reader' },
  ])('$provider returns a normalized fetch result', async (testCase) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(testCase.payload), { status: 200 }))
    const provider = await createFetchProviderRegistry().get(testCase.provider, makeContext(fetcher, testCase.config))
    const result = await provider.fetch({ provider: testCase.provider, url }, makeFetchContext(fetcher, testCase.config))
    expect(result).toMatchObject({ url, statusCode: 200, body: { kind: 'text', content: '# Article' }, truncated: false })
    expect(new URL(result.url).protocol).toMatch(/^https?:$/)
    expect(JSON.stringify(result)).not.toContain('test-key')
    expect(fetcher).toHaveBeenCalledWith(testCase.endpoint, expect.objectContaining({ method: 'POST' }))
  })
})
