import { InvalidRequestError } from '../../src/errors.js'
import { normalizeSearchRequest } from '../../src/internal/normalize.js'

const capabilities = {
  includeDomains: true,
  excludeDomains: true,
  timeRange: true,
  content: true,
  score: true,
} as const

describe('request normalization', () => {
  test('trims query, deduplicates domains, and applies defaults', () => {
    const result = normalizeSearchRequest({
      engine: 'tavily:advanced',
      query: '  latest AI  ',
      includeDomains: ['https://OpenAI.com/', 'openai.com'],
    }, capabilities)

    expect(result).toMatchObject({
      engine: 'tavily:advanced',
      query: 'latest AI',
      maxResults: 10,
      includeDomains: ['openai.com'],
    })
  })

  test('rejects blank queries, invalid result limits, and domain conflicts', () => {
    expect(() => normalizeSearchRequest({ engine: 'tavily:advanced', query: '  ' }, capabilities))
      .toThrow(InvalidRequestError)
    expect(() => normalizeSearchRequest({ engine: 'tavily:advanced', query: 'x', maxResults: 0 }, capabilities))
      .toThrow(InvalidRequestError)
    expect(() => normalizeSearchRequest({
      engine: 'tavily:advanced',
      query: 'x',
      includeDomains: ['example.com'],
      excludeDomains: ['example.com'],
    }, capabilities)).toThrow(InvalidRequestError)
  })
})

