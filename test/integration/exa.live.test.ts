import { SearchSuite } from '../../src/index.js'
import { LIVE_TEST_TIMEOUT_MS } from './live-timeout.js'

const key = process.env.EXA_API_KEY

test.skipIf(!key)('Exa live contract', async () => {
  const client = new SearchSuite({ providers: { exa: { apiKey: key! } } })
  const response = await client.search({ provider: 'exa', query: 'Node.js', maxResults: 1 })
  expect(response.provider).toBe('exa')
  expect(response.engine).toBe('exa:auto')
  expect(Array.isArray(response.results)).toBe(true)
}, LIVE_TEST_TIMEOUT_MS)

test.skipIf(!key)('Exa live fetch contract', async () => {
  const client = new SearchSuite({ providers: { exa: { apiKey: key! } } })
  const response = await client.fetch({
    provider: 'exa',
    url: 'https://example.com',
    providerOptions: { maxCharacters: 1_000 },
  })
  expect(response.provider).toBe('exa')
  expect(response.statusCode).toBe(200)
  expect(response.body.content.length).toBeGreaterThan(0)
}, LIVE_TEST_TIMEOUT_MS)
