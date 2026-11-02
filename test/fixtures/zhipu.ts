import type { SearchResult } from '../../src/types.js'

export const zhipuResponse = {
  search_intent: [{ query: 'Zhipu query', intent: 'SEARCH_ALL', keywords: 'Zhipu query' }],
  search_result: [
    {
      title: 'Zhipu result', link: 'https://example.com/zhipu', content: 'Zhipu snippet.',
      publish_date: '2025-01-02', media: 'Example', icon: 'https://example.com/icon.png', refer: 'ref_1',
    },
    {
      title: 'Second result', link: 'https://example.com/second', content: 'Second snippet.', publish_date: '2025-01-03',
    },
  ],
} satisfies Record<string, unknown>

export const zhipuExpectedResult: Partial<SearchResult> = {
  title: 'Zhipu result', url: 'https://example.com/zhipu', snippet: 'Zhipu snippet.',
  publishedAt: '2025-01-02T00:00:00.000Z',
}
