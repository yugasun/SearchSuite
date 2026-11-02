import { InvalidRequestError } from '../../src/errors.js'
import { normalizeFetchRequest } from '../../src/internal/fetch-normalize.js'
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

  test('enforces fetch URL constraints for DeepSeek and Zhipu', () => {
    const prefix = 'https://example.com/'
    const boundary = prefix + 'a'.repeat(8192 - prefix.length)
    expect(normalizeFetchRequest({ provider: 'deepseek', url: boundary }).url).toBe(boundary)
    expect(normalizeFetchRequest({ provider: 'deepseek', url: `  ${boundary}  ` }).url).toBe(boundary)
    expect(() => normalizeFetchRequest({ provider: 'deepseek', url: `${boundary}a` })).toThrow(InvalidRequestError)
    expect(() => normalizeFetchRequest({ provider: 'deepseek', url: prefix + 'é'.repeat(1400) })).toThrow(InvalidRequestError)
    expect(() => normalizeFetchRequest({ provider: 'deepseek', url: 'ftp://example.com/' })).toThrow(InvalidRequestError)
    expect(() => normalizeFetchRequest({ provider: 'deepseek', url: '/relative' })).toThrow(InvalidRequestError)
    expect(() => normalizeFetchRequest({ provider: 'deepseek', url: 'https://user:pw@example.com' })).toThrow(InvalidRequestError)
    expect(() => normalizeFetchRequest({ provider: 'zhipu', url: 'https://user@example.com' })).toThrow(InvalidRequestError)
    expect(() => normalizeFetchRequest({ provider: 'tavily', url: 'https://user@example.com' })).not.toThrow()
  })
})
