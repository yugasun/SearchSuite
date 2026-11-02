import { baiduWebResponse } from '../fixtures/baidu.js'
import { doubaoCustomResponse } from '../fixtures/doubao.js'
import { exaResponse } from '../fixtures/exa.js'
import { serperResponse } from '../fixtures/serper.js'
import { tavilyResponse } from '../fixtures/tavily.js'
import { deepseekResponse } from '../fixtures/deepseek.js'
import { zhipuResponse } from '../fixtures/zhipu.js'
import { bochaResponse } from '../fixtures/bocha.js'
import { alibabaResponse } from '../fixtures/alibaba.js'
import { makeContext, makeRequest, makeSearchContext } from '../helpers.js'
import type { SearchProvider } from '../../src/provider.js'
import type { SearchEngine } from '../../src/types.js'
import { createBaiduProvider } from '../../src/providers/baidu.js'
import { createDoubaoProvider } from '../../src/providers/doubao.js'
import { createExaProvider } from '../../src/providers/exa.js'
import { createSerperProvider } from '../../src/providers/serper.js'
import { createTavilyProvider } from '../../src/providers/tavily.js'
import { createDeepSeekProvider } from '../../src/providers/deepseek.js'
import { createZhipuProvider } from '../../src/providers/zhipu.js'
import { createBochaProvider } from '../../src/providers/bocha.js'
import { createAlibabaProvider } from '../../src/providers/alibaba.js'

const cases: Array<{
  engine: SearchEngine
  provider: (context: ReturnType<typeof makeContext>) => SearchProvider
  config: Record<string, { apiKey: string; baseUrl?: string }>
  body: unknown
}> = [
  { engine: 'baidu:web', provider: createBaiduProvider, config: { baidu: { apiKey: 'test' } }, body: baiduWebResponse },
  { engine: 'doubao:custom', provider: createDoubaoProvider, config: { doubao: { apiKey: 'test' } }, body: doubaoCustomResponse },
  { engine: 'tavily:advanced', provider: createTavilyProvider, config: { tavily: { apiKey: 'test' } }, body: tavilyResponse },
  { engine: 'exa:auto', provider: createExaProvider, config: { exa: { apiKey: 'test' } }, body: exaResponse },
  { engine: 'serper:google', provider: createSerperProvider, config: { serper: { apiKey: 'test' } }, body: serperResponse },
  { engine: 'deepseek:web', provider: createDeepSeekProvider, config: { deepseek: { apiKey: 'test' } }, body: deepseekResponse },
  { engine: 'zhipu:web', provider: createZhipuProvider, config: { zhipu: { apiKey: 'test' } }, body: zhipuResponse },
  { engine: 'bocha:web', provider: createBochaProvider, config: { bocha: { apiKey: 'test' } }, body: bochaResponse },
  { engine: 'alibaba:web', provider: createAlibabaProvider, config: { alibaba: { apiKey: 'test', baseUrl: 'https://dashscope.aliyuncs.com' } }, body: alibabaResponse },
]

describe('Provider contract', () => {
  for (const testCase of cases) {
    test(`${testCase.engine} returns a normalized response`, async () => {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify(testCase.body), { status: 200 }),
      )
      const context = makeContext(fetcher, testCase.config)
      const provider = testCase.provider(context)
      const response = await provider.search(
        makeRequest(testCase.engine),
        makeSearchContext(fetcher, testCase.config),
      )

      expect(response.engine).toBe(testCase.engine)
      expect(response.query).toBe('test query')
      expect(response.latencyMs).toBe(0)
      expect(Array.isArray(response.results)).toBe(true)
      for (const result of response.results) {
        expect(result.title.trim()).not.toBe('')
        expect(new URL(result.url).protocol).toMatch(/^https?:$/)
      }
      expect(JSON.stringify(response)).not.toContain('test-key')
    })
  }
})

