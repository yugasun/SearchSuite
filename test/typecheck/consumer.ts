import {
  SearchSuite,
  type SearchResponse,
  type SearchResponseFor,
  type WebFetchProvider,
} from '../../src/index.js'

const client = new SearchSuite()
const response = await client.search({
  engine: 'tavily:advanced',
  query: 'type inference',
  providerOptions: { chunksPerSource: 2 },
})
const typed: SearchResponse<'tavily:advanced'> = response
void typed

const providerResponse = await client.search({
  provider: 'exa',
  query: 'provider-first API',
  providerOptions: { searchType: 'neural', highlightsPerUrl: 2 },
})
const providerTyped: SearchResponseFor<'exa'> = providerResponse
void providerTyped

const fetched = await client.fetch({
  provider: 'exa',
  url: 'https://example.com/article',
  providerOptions: { maxCharacters: 10_000 },
})
void fetched

const fetchProvider: WebFetchProvider = {
  id: 'exa',
  available: () => true,
  async fetch(request, signal) {
    void request
    void signal
    return {
      url: 'https://example.com',
      statusCode: 200,
      body: { kind: 'text', content: 'example' },
      truncated: false,
    }
  },
}
void fetchProvider

// @ts-expect-error chunksPerSource is only available for tavily:advanced.
await client.search({
  engine: 'tavily:basic',
  query: 'invalid option example',
  providerOptions: {
    chunksPerSource: 2,
  },
})
