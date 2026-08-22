import { SearchSuite } from '../../src/index.js'

const key = process.env.TAVILY_API_KEY

test.skipIf(!key)('Tavily live contract', async () => {
  const client = new SearchSuite({ providers: { tavily: { apiKey: key! } } })
  const response = await client.search({ engine: 'tavily:basic', query: 'Node.js', maxResults: 1 })
  expect(response.engine).toBe('tavily:basic')
  expect(Array.isArray(response.results)).toBe(true)
})
