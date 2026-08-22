import { SearchSuite } from '../../src/index.js'

const key = process.env.DOUBAO_API_KEY ?? process.env.DOUBAO_SEARCH_API_KEY

test.skipIf(!key)('Doubao live contract', async () => {
  const client = new SearchSuite({ providers: { doubao: { apiKey: key! } } })
  const response = await client.search({ engine: 'doubao:custom', query: 'Node.js', maxResults: 1 })
  expect(response.engine).toBe('doubao:custom')
  expect(Array.isArray(response.results)).toBe(true)
})
