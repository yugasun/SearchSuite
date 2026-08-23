import { expectTypeOf, test } from 'vitest'
import type {
  ProviderOptionsFor,
  SearchOptionsFor,
  SearchEngine,
  SearchRequest,
  SearchResponse,
  SearchResponseFor,
  FetchRequest,
  WebFetchProvider,
  WebFetchResult,
} from '../../src/types.js'

test('engine is a union of the five initial provider engine namespaces', () => {
  expectTypeOf<'tavily:advanced'>().toMatchTypeOf<SearchEngine>()
  expectTypeOf<'baidu:web'>().toMatchTypeOf<SearchEngine>()
  expectTypeOf<'doubao:global'>().toMatchTypeOf<SearchEngine>()
  expectTypeOf<'exa:neural'>().toMatchTypeOf<SearchEngine>()
  expectTypeOf<'serper:google'>().toMatchTypeOf<SearchEngine>()
})

test('advanced Tavily options expose chunks per source', () => {
  expectTypeOf<ProviderOptionsFor<'tavily:advanced'>>().toMatchTypeOf<{
    chunksPerSource?: 1 | 2 | 3
  }>()
  expectTypeOf<ProviderOptionsFor<'tavily:basic'>>().not.toHaveProperty('chunksPerSource')
})

test('response preserves the engine literal', () => {
  expectTypeOf<SearchResponse<'exa:auto'>['engine']>().toEqualTypeOf<'exa:auto'>()
  expectTypeOf<SearchRequest<'serper:google'>['providerOptions']>().toMatchTypeOf<{
    gl?: string
    hl?: string
  } | undefined>()
})

test('provider-first requests infer provider options and response provider', () => {
  expectTypeOf<SearchOptionsFor<'exa'>>().toMatchTypeOf<{
    searchType?: 'auto' | 'keyword' | 'neural'
  }>()
  expectTypeOf<SearchResponseFor<'tavily'>['provider']>().toEqualTypeOf<'tavily'>()
  expectTypeOf<FetchRequest<'exa'>['providerOptions']>().toMatchTypeOf<{
    maxCharacters?: number
  } | undefined>()
})

test('result and response fields are JSON-friendly', () => {
  expectTypeOf<SearchResponse['results']>().toEqualTypeOf<Array<{
    title: string
    url: string
    snippet?: string
    content?: string
    score?: number
    publishedAt?: string
    raw?: unknown
  }>>()
})

test('web fetch contract is compatible with a dsh-style provider', () => {
  const result: WebFetchResult = {
    url: 'https://example.com/article',
    statusCode: 200,
    body: { kind: 'text', content: '# Article' },
    truncated: false,
  }
  const provider: WebFetchProvider = {
    id: 'tavily',
    available: () => true,
    fetch: async (_request, _signal) => result,
  }

  expectTypeOf<typeof provider.fetch>().toMatchTypeOf<(
    request: { readonly url: string },
    signal?: AbortSignal,
  ) => Promise<WebFetchResult>>()
})
