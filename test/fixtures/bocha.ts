import type { SearchResult } from '../../src/types.js'

export const bochaResponse = {
  code: 200,
  data: {
    _type: 'SearchResponse',
    webPages: {
      value: [{
        name: 'Bocha result',
        url: 'https://example.com/bocha',
        snippet: 'Bocha snippet.',
        datePublished: '2025-01-02T03:04:05Z',
        summary: 'Bocha summary.',
      }],
    },
  },
} satisfies Record<string, unknown>

export const bochaExpectedResult: Partial<SearchResult> = {
  title: 'Bocha result', url: 'https://example.com/bocha', snippet: 'Bocha snippet.',
  publishedAt: '2025-01-02T03:04:05.000Z',
}
