import { SearchSuite } from 'searchsuite'

const client = new SearchSuite()
const response = await client.search({
  provider: 'tavily',
  query: 'AI Agent search infrastructure',
  maxResults: 5,
})

for (const result of response.results) {
  console.log(`${result.title}: ${result.url}`)
}
