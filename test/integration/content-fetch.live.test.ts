import { SearchSuite } from '../../src/index.js'
import { LIVE_TEST_TIMEOUT_MS } from './live-timeout.js'

const deepseekKey = process.env.DEEPSEEK_API_KEY
const zhipuKey = process.env.ZHIPU_API_KEY

test.skipIf(!deepseekKey)('DeepSeek live fetch contract', async () => {
  const client = new SearchSuite({ providers: { deepseek: { apiKey: deepseekKey! } } })
  const response = await client.fetch({ provider: 'deepseek', url: 'https://api-docs.deepseek.com/' })
  expect(response.provider).toBe('deepseek')
  expect(response.statusCode).toBe(200)
  expect(response.body.content).toContain('DeepSeek')
}, LIVE_TEST_TIMEOUT_MS)

test.skipIf(!zhipuKey)('Zhipu live fetch contract', async () => {
  const client = new SearchSuite({ providers: { zhipu: { apiKey: zhipuKey! } } })
  const response = await client.fetch({ provider: 'zhipu', url: 'https://example.com' })
  expect(response.provider).toBe('zhipu')
  expect(response.statusCode).toBe(200)
  expect(response.body.content).toContain('Example Domain')
}, LIVE_TEST_TIMEOUT_MS)
