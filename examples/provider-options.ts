import { SearchSuite } from 'searchsuite'

const client = new SearchSuite()

await client.search({
  engine: 'tavily:advanced',
  query: 'latest AI research',
  providerOptions: {
    includeAnswer: true,
    includeRawContent: 'markdown',
    chunksPerSource: 2,
  },
})

// TypeScript rejects `chunksPerSource` when the engine is `tavily:basic`.
