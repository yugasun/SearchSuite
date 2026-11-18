import { ProviderUnavailableError } from '../errors.js'
import { requestJson } from '../internal/http.js'
import {
  clampMaxResults,
  normalizedResult,
  providerOptions,
  record,
  resolveProviderBaseUrl,
  safeRaw,
} from '../internal/provider-utils.js'
import type { SearchProvider } from '../provider.js'
import type { ProviderContext, SearchResult } from '../types.js'

const DEFAULT_BASE_URL = 'https://api.anysearch.com'
const CAPABILITIES = {
  includeDomains: false,
  excludeDomains: false,
  timeRange: false,
  content: true,
  score: false,
} as const

export function createAnySearchProvider(context: ProviderContext): SearchProvider {
  const config = context.config.anysearch
  const apiKey = config?.apiKey?.trim() || process.env.ANYSEARCH_API_KEY?.trim()
  const baseUrl = resolveProviderBaseUrl('anysearch', config?.baseUrl, DEFAULT_BASE_URL)

  return {
    id: 'anysearch',
    capabilities: CAPABILITIES,
    async search(request, searchContext) {
      const { engine, query } = request
      providerOptions(request.providerOptions, [], searchContext, 'anysearch', engine)
      const maxResults = clampMaxResults(request.maxResults, 10, searchContext, engine)
      const payload = await requestJson({
        fetch: searchContext.fetch,
        provider: 'anysearch',
        engine,
        quotaExceededStatus: 402,
        url: `${baseUrl}/v1/search`,
        signal: searchContext.signal,
        abortSource: searchContext.abortSource,
        init: {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({ query, max_results: maxResults }),
        },
      })
      const root = record(payload)
      const rows = record(root.data).results
      if (root.code !== 0 || !Array.isArray(rows)) {
        throw new ProviderUnavailableError('AnySearch returned an invalid search response', {
          provider: 'anysearch', engine,
        })
      }
      const results: SearchResult[] = []
      for (const item of rows) {
        const row = record(item)
        const result = normalizedResult({
          title: row.title,
          url: row.url,
          snippet: row.snippet,
          content: row.content,
          raw: item,
        })
        if (result !== undefined) results.push(result)
        if (results.length === maxResults) break
      }
      return { provider: 'anysearch', engine, query, results, latencyMs: 0, raw: safeRaw(payload) }
    },
  }
}
