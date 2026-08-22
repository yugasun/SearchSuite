import { SearchSuite, type SearchResponse } from '../../src/index.js'

const client = new SearchSuite()
const response = await client.search({
  engine: 'tavily:advanced',
  query: 'type inference',
  providerOptions: { chunksPerSource: 2 },
})
const typed: SearchResponse<'tavily:advanced'> = response
void typed

await client.search({
  engine: 'tavily:basic',
  query: 'invalid option example',
  providerOptions: {
    // @ts-expect-error chunksPerSource is only available for tavily:advanced.
    chunksPerSource: 2,
  },
})
