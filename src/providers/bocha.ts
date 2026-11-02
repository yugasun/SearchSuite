import { requestJson } from '../internal/http.js'
import {
  clampMaxResults,
  normalizedResult,
  providerOptions,
  providerOptionRules,
  record,
  resolveProviderConfig,
  safeRaw,
  toIsoDate,
} from '../internal/provider-utils.js'
import type { SearchProvider } from '../provider.js'
import type { ProviderContext, SearchResponse } from '../types.js'

const DEFAULT_BASE_URL = 'https://api.bochaai.com'
const CAPABILITIES = {
  includeDomains: false,
  excludeDomains: false,
  timeRange: true,
  content: true,
  score: false,
} as const

const FRESHNESS_VALUES = ['noLimit', 'oneYear', 'oneMonth', 'oneWeek', 'oneDay'] as const
const DATE_FRESHNESS = /^\d{4}-\d{2}-\d{2}(\.\.\d{4}-\d{2}-\d{2})?$/
export function createBochaProvider(context: ProviderContext): SearchProvider {
  const config = resolveProviderConfig(context, 'bocha', ['BOCHA_API_KEY'], DEFAULT_BASE_URL)

  return {
    id: 'bocha',
    capabilities: CAPABILITIES,
    async search(request, searchContext): Promise<SearchResponse> {
      const engine = request.engine
      const options = providerOptions(
        request.providerOptions,
        ['summary', 'freshness'],
        searchContext,
        'bocha',
        engine,
        { summary: providerOptionRules.boolean, freshness: { ...providerOptionRules.string, validate: (value) => typeof value === 'string' && (FRESHNESS_VALUES.includes(value as typeof FRESHNESS_VALUES[number]) || DATE_FRESHNESS.test(value)) } },
      )
      const body: Record<string, unknown> = {
        query: request.query,
        count: clampMaxResults(request.maxResults, 50, searchContext, engine),
        summary: options.summary ?? false,
        freshness: typeof options.freshness === 'string' ? options.freshness : 'noLimit',
      }
      const freshnessByTimeRange = { day: 'oneDay', week: 'oneWeek', month: 'oneMonth', year: 'oneYear' } as const
      if (typeof options.freshness === 'string' && options.freshness.trim()) body.freshness = options.freshness.trim()
      else if (request.timeRange !== undefined) body.freshness = freshnessByTimeRange[request.timeRange]
      const payload = await requestJson({
        fetch: searchContext.fetch,
        provider: 'bocha',
        engine,
        url: `${config.baseUrl}/v1/web-search`,
        signal: searchContext.signal,
        abortSource: searchContext.abortSource,
        init: {
          method: 'POST',
          headers: { authorization: `Bearer ${config.apiKey}`, 'content-type': 'application/json' },
          body: JSON.stringify(body),
        },
      })
      const root = record(payload)
      const data = record(root.data)
      const webPages = record(data.webPages)
      const rows = Array.isArray(webPages.value) ? webPages.value : []
      const results = rows.map((item) => {
        const row = record(item)
        return normalizedResult({
          url: row.url,
          title: row.name,
          snippet: row.snippet ?? row.summary,
          publishedAt: toIsoDate(row.datePublished),
          raw: item,
        })
      }).filter((item): item is NonNullable<typeof item> => item !== undefined)
      return {
        provider: 'bocha',
        query: request.query,
        engine,
        results,
        latencyMs: 0,
        raw: safeRaw(payload),
      }
    },
  }
}
