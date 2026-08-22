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

const DEFAULT_BASE_URL = 'https://google.serper.dev'
const CAPABILITIES = {
  includeDomains: false,
  excludeDomains: false,
  timeRange: false,
  content: true,
  score: false,
} as const

export function createSerperProvider(context: ProviderContext): SearchProvider {
  const config = resolveProviderConfig(context, 'serper', ['SERPER_API_KEY'], DEFAULT_BASE_URL)

  return {
    id: 'serper',
    capabilities: CAPABILITIES,
    async search(request, searchContext): Promise<SearchResponse> {
      const engine = request.engine
      const options = providerOptions(request.providerOptions, ['gl', 'hl'], searchContext, 'serper', engine)
      const body: Record<string, unknown> = {
        q: request.query,
        num: clampMaxResults(request.maxResults, 100, searchContext, engine),
      }
      if (typeof options.gl === 'string' && options.gl.trim()) body.gl = options.gl.trim()
      if (typeof options.hl === 'string' && options.hl.trim()) body.hl = options.hl.trim()
      const payload = await requestJson({
        fetch: searchContext.fetch,
        provider: 'serper',
        engine,
        url: `${config.baseUrl}/search`,
        signal: searchContext.signal,
        abortSource: searchContext.abortSource,
        init: {
          method: 'POST',
          headers: {
            'X-API-KEY': config.apiKey,
            'content-type': 'application/json',
          },
          body: JSON.stringify(body),
        },
      })
      const root = record(payload)
      const organic = Array.isArray(root.organic) ? root.organic : []
      const results = organic.map((item) => {
        const row = record(item)
        return normalizedResult({
          url: row.link,
          title: row.title,
          snippet: row.snippet,
          publishedAt: toIsoDate(row.date),
          raw: item,
        })
      }).filter((item): item is NonNullable<typeof item> => item !== undefined)
      const answerBox = record(root.answerBox)
      const knowledgeGraph = record(root.knowledgeGraph)
      const answer = typeof answerBox.snippet === 'string' && answerBox.snippet.trim()
        ? answerBox.snippet.trim()
        : typeof knowledgeGraph.description === 'string' && knowledgeGraph.description.trim()
          ? knowledgeGraph.description.trim()
          : undefined
      return {
        query: request.query,
        engine,
        ...(answer === undefined ? {} : { answer }),
        results,
        latencyMs: 0,
        raw: safeRaw(payload),
      }
    },
  }
}
