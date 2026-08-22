import { SearchSuite } from '../../src/index.js'

const key = process.env.BAIDU_API_KEY ?? process.env.QIANFAN_API_KEY

test.skipIf(!key)('Baidu live contract', async () => {
  const client = new SearchSuite({ providers: { baidu: { apiKey: key! } } })
  const response = await client.search({ engine: 'baidu:web', query: 'Node.js', maxResults: 1 })
  expect(response.engine).toBe('baidu:web')
  expect(Array.isArray(response.results)).toBe(true)
})
