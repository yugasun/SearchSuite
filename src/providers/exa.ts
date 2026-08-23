import { requestJson } from '../internal/http.js'
import {
  clampMaxResults,
  normalizedResult,
  providerOptions,
  record,
  resolveProviderConfig,
  safeRaw,
  toIsoDate,
} from '../internal/provider-utils.js'
import type { SearchProvider } from '../provider.js'
import type { ProviderContext, SearchResponse } from '../types.js'

const DEFAULT_BASE_URL = 'https://api.exa.ai'
const ENGINES = new Set(['auto', 'keyword', 'neural'])
const CAPABILITIES = {
  includeDomains: false,
  excludeDomains: false,
  timeRange: false,
  content: true,
  score: false,
} as const

export function createExaProvider(context: ProviderContext): SearchProvider {
  const config = resolveProviderConfig(context, 'exa', ['EXA_API_KEY'], DEFAULT_BASE_URL)

  return {
    id: 'exa',
    capabilities: CAPABILITIES,
    async search(request, searchContext): Promise<SearchResponse> {
      const engine = request.engine
      const type = engine.slice('exa:'.length)
      if (!ENGINES.has(type)) throw new Error(`Unsupported Exa engine: ${engine}`)
      const options = providerOptions(request.providerOptions, ['highlightsPerUrl'], searchContext, 'exa', engine)
      const maxResults = request.maxResults
      const highlightsPerUrl = typeof options.highlightsPerUrl === 'number'
        ? Math.max(1, Math.floor(options.highlightsPerUrl))
        : 1
      const body: Record<string, unknown> = {
        query: request.query,
        type,
        numResults: clampMaxResults(maxResults, 100, searchContext, engine),
        contents: { highlights: { highlightsPerUrl } },
      }
      const payload = await requestJson({
        fetch: searchContext.fetch,
        provider: 'exa',
        engine,
        url: `${config.baseUrl}/search`,
        signal: searchContext.signal,
        abortSource: searchContext.abortSource,
        init: {
          method: 'POST',
          headers: {
            authorization: `Bearer ${config.apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify(body),
        },
      })
      const root = record(payload)
      const results = Array.isArray(root.results)
        ? root.results.map((item) => {
          const row = record(item)
          const highlights = Array.isArray(row.highlights)
            ? row.highlights.find((value): value is string => typeof value === 'string' && value.trim().length > 0)
            : undefined
          return normalizedResult({
            url: row.url,
            title: row.title,
            snippet: highlights ?? row.text,
            publishedAt: toIsoDate(row.publishedDate),
            raw: item,
          })
        }).filter((item): item is NonNullable<typeof item> => item !== undefined)
        : []
      return {
        provider: 'exa',
        query: request.query,
        engine,
        results,
        latencyMs: 0,
        raw: safeRaw(payload),
      }
    },
  }
}
