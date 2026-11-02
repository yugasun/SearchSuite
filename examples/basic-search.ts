import { SearchSuite } from 'searchsuite'

const client = new SearchSuite()
const response = await client.search({
  provider: 'deepseek',
  query: 'AI Agent search infrastructure',
  maxResults: 2,
})

for (const result of response.results) {
  console.log(`${result.title}: ${result.url}`)
}
