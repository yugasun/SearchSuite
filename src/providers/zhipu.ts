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

const DEFAULT_BASE_URL = 'https://open.bigmodel.cn/api'
const SOGOU_COUNTS = [10, 20, 30, 40, 50] as const
function zhipuCount(maxResults: number, searchEngine: string, context: Parameters<typeof clampMaxResults>[2], engine: Parameters<typeof clampMaxResults>[3]): number {
  const requested = clampMaxResults(maxResults, 50, context, engine)
  if (searchEngine !== 'search_pro_sogou') return requested
  return SOGOU_COUNTS.find((count) => count >= requested) ?? 50
}
const CAPABILITIES = {
  includeDomains: false,
  excludeDomains: false,
  timeRange: false,
  content: true,
  score: false,
} as const
const SEARCH_ENGINES = ['search_std', 'search_pro', 'search_pro_sogou', 'search_pro_quark'] as const

export function createZhipuProvider(context: ProviderContext): SearchProvider {
  const config = resolveProviderConfig(context, 'zhipu', ['ZHIPU_API_KEY'], DEFAULT_BASE_URL)

  return {
    id: 'zhipu',
    capabilities: CAPABILITIES,
    async search(request, searchContext): Promise<SearchResponse> {
      const engine = request.engine
      const options = providerOptions(
        request.providerOptions,
        ['searchEngine', 'contentSize', 'searchIntent'],
        searchContext,
        'zhipu',
        engine,
        {
          searchEngine: providerOptionRules.oneOf(SEARCH_ENGINES),
          contentSize: providerOptionRules.oneOf(['medium', 'high']),
          searchIntent: providerOptionRules.boolean,
        },
      )
      const selectedSearchEngine = options.searchEngine ?? 'search_std'
      const body: Record<string, unknown> = {
        search_query: request.query,
        search_engine: selectedSearchEngine,
        search_intent: options.searchIntent ?? false,
        count: zhipuCount(request.maxResults, String(selectedSearchEngine), searchContext, engine),
      }
      if (options.contentSize !== undefined) body.content_size = options.contentSize
      const payload = await requestJson({
        fetch: searchContext.fetch,
        provider: 'zhipu',
        engine,
        url: `${config.baseUrl}/paas/v4/web_search`,
        signal: searchContext.signal,
        abortSource: searchContext.abortSource,
        init: {
          method: 'POST',
          headers: { authorization: `Bearer ${config.apiKey}`, 'content-type': 'application/json' },
          body: JSON.stringify(body),
        },
      })
      const root = record(payload)
      const rows = Array.isArray(root.search_result) ? root.search_result : []
      const results = rows.map((item) => {
        const row = record(item)
        return normalizedResult({
          url: row.link,
          title: row.title,
          snippet: row.content,
          publishedAt: toIsoDate(row.publish_date),
          raw: item,
        })
      }).filter((item): item is NonNullable<typeof item> => item !== undefined).slice(0, request.maxResults)
      return {
        provider: 'zhipu',
        query: request.query,
        engine,
        results,
        latencyMs: 0,
        raw: safeRaw(payload),
      }
    },
  }
}
