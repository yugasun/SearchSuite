import { expectTypeOf, test } from 'vitest'
import type {
  ProviderOptionsFor,
  SearchEngine,
  SearchRequest,
  SearchResponse,
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

