import { SearchSuite } from 'searchsuite'

const client = new SearchSuite()

await client.search({
  provider: 'tavily',
  query: 'latest AI research',
  providerOptions: {
    searchDepth: 'advanced',
    includeAnswer: true,
    includeRawContent: 'markdown',
    chunksPerSource: 2,
  },
})

// Provider options are checked against the selected Provider.
