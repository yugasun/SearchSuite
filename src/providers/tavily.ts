import { requestJson } from '../internal/http.js'
import {
  clampMaxResults,
  mapUsage,
  normalizedResult,
  providerOptions,
  record,
  resolveProviderConfig,
  safeRaw,
  toIsoDate,
} from '../internal/provider-utils.js'
import type { SearchProvider } from '../provider.js'
import type { ProviderContext, SearchResponse } from '../types.js'

const DEFAULT_BASE_URL = 'https://api.tavily.com'
const ENGINES = new Set(['basic', 'advanced', 'fast', 'ultra-fast'])
const CAPABILITIES = {
  includeDomains: true,
  excludeDomains: true,
  timeRange: true,
  content: true,
  score: true,
} as const

function timeRange(value: string): string {
  return value
}

export function createTavilyProvider(context: ProviderContext): SearchProvider {
  const config = resolveProviderConfig(context, 'tavily', ['TAVILY_API_KEY'], DEFAULT_BASE_URL)

  return {
    id: 'tavily',
    capabilities: CAPABILITIES,
    async search(request, searchContext): Promise<SearchResponse> {
      const engine = request.engine
      const depth = engine.slice('tavily:'.length)
      if (!ENGINES.has(depth)) throw new Error(`Unsupported Tavily engine: ${engine}`)
      const options = providerOptions(
        request.providerOptions,
        depth === 'advanced'
          ? ['topic', 'includeAnswer', 'includeRawContent', 'chunksPerSource']
          : ['topic', 'includeAnswer', 'includeRawContent'],
        searchContext,
        'tavily',
        engine,
      )
      const maxResults = clampMaxResults(request.maxResults, 20, searchContext, engine)
      const body: Record<string, unknown> = {
        query: request.query,
        search_depth: depth,
        max_results: maxResults,
        include_answer: options.includeAnswer ?? false,
        include_raw_content: options.includeRawContent ?? false,
        include_images: false,
      }
      if (options.topic !== undefined) body.topic = options.topic
      if (options.chunksPerSource !== undefined) body.chunks_per_source = options.chunksPerSource
      if (request.includeDomains !== undefined) body.include_domains = request.includeDomains
      if (request.excludeDomains !== undefined) body.exclude_domains = request.excludeDomains
      if (request.timeRange !== undefined) body.time_range = timeRange(request.timeRange)

      const payload = await requestJson({
        fetch: searchContext.fetch,
        provider: 'tavily',
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
          return normalizedResult({
            url: row.url,
            title: row.title,
            snippet: row.content,
            score: row.score,
            publishedAt: toIsoDate(row.published_date),
            raw: item,
          })
        }).filter((item): item is NonNullable<typeof item> => item !== undefined)
        : []
      const answer = typeof root.answer === 'string' && root.answer.trim() ? root.answer.trim() : undefined
      const usage = mapUsage(root.usage)
      return {
        provider: 'tavily',
        query: request.query,
        engine,
        ...(answer === undefined ? {} : { answer }),
        results,
        ...(usage === undefined ? {} : { usage }),
        latencyMs: 0,
        raw: safeRaw(payload),
      }
    },
  }
}
