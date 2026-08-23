import { SearchSuite } from 'searchsuite'

const client = new SearchSuite({
  providers: {
    ...(process.env.TAVILY_API_KEY === undefined ? {} : { tavily: { apiKey: process.env.TAVILY_API_KEY } }),
    ...(process.env.EXA_API_KEY === undefined ? {} : { exa: { apiKey: process.env.EXA_API_KEY } }),
  },
})

for (const provider of ['tavily', 'exa'] as const) {
  const response = await client.search({
    provider,
    query: 'AI Agent search infrastructure',
    maxResults: 5,
  })
  console.log(provider, response.results.length)
}
