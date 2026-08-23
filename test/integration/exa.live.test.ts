import { SearchSuite } from '../../src/index.js'
import { LIVE_TEST_TIMEOUT_MS } from './live-timeout.js'

const key = process.env.EXA_API_KEY

test.skipIf(!key)('Exa live contract', async () => {
  const client = new SearchSuite({ providers: { exa: { apiKey: key! } } })
  const response = await client.search({ engine: 'exa:auto', query: 'Node.js', maxResults: 1 })
  expect(response.engine).toBe('exa:auto')
  expect(Array.isArray(response.results)).toBe(true)
}, LIVE_TEST_TIMEOUT_MS)
