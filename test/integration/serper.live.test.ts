import { SearchSuite } from '../../src/index.js'
import { LIVE_TEST_TIMEOUT_MS } from './live-timeout.js'

const key = process.env.SERPER_API_KEY

test.skipIf(!key)('Serper live contract', async () => {
  const client = new SearchSuite({ providers: { serper: { apiKey: key! } } })
  const response = await client.search({ engine: 'serper:google', query: 'Node.js', maxResults: 1 })
  expect(response.engine).toBe('serper:google')
  expect(Array.isArray(response.results)).toBe(true)
}, LIVE_TEST_TIMEOUT_MS)
