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
  truncateByUnits,
  warnTruncation,
} from '../internal/provider-utils.js'
import type { SearchProvider } from '../provider.js'
import type { ProviderContext, SearchResponse } from '../types.js'

const DEFAULT_BASE_URL = 'https://qianfan.baidubce.com'
const DEFAULT_MODEL = 'ernie-4.5-turbo-32k'
const QUERY_UNITS = 72
const CAPABILITIES = {
  includeDomains: false,
  excludeDomains: false,
  timeRange: false,
  content: false,
  score: false,
} as const

function truncateQuery(query: string): string {
  return truncateByUnits(query, QUERY_UNITS, (char) => (char.codePointAt(0) ?? 0) > 127 ? 2 : 1)
}

function mapReference(item: unknown) {
  const row = record(item)
  if (row.type !== undefined && row.type !== 'web') return undefined
  return normalizedResult({
    url: row.url,
    title: row.title,
    snippet: row.snippet ?? row.content,
    publishedAt: toIsoDate(row.date),
    raw: item,
  })
}

function extractUrls(value: string): string[] {
  return [...new Set(value.match(/https?:\/\/[^\s)\]}>]+/g) ?? [])]
}

export function createBaiduProvider(context: ProviderContext): SearchProvider {
  const config = resolveProviderConfig(context, 'baidu', ['BAIDU_API_KEY', 'QIANFAN_API_KEY'], DEFAULT_BASE_URL)
  const configuredModel = context.config.baidu?.model?.trim()
  const model = configuredModel || process.env.BAIDU_MODEL?.trim() || DEFAULT_MODEL

  return {
    id: 'baidu',
    capabilities: CAPABILITIES,
    async search(request, searchContext): Promise<SearchResponse> {
      const engine = request.engine
      const mode = engine.slice('baidu:'.length)
      const options = providerOptions(
        request.providerOptions,
        mode === 'ai' ? ['model'] : [],
        searchContext,
        'baidu',
        engine,
        { model: providerOptionRules.string },
      )
      const max = mode === 'ai' ? 20 : 50
      const maxResults = clampMaxResults(request.maxResults, max, searchContext, engine)
      const query = truncateQuery(request.query)
      if (query !== request.query) warnTruncation(searchContext, engine, 'query', QUERY_UNITS)
      const body: Record<string, unknown> = {
        messages: [{ role: 'user', content: query }],
        search_source: 'baidu_search_v2',
        resource_type_filter: [{ type: 'web', top_k: maxResults }],
      }
      if (mode === 'ai') {
        body.model = typeof options.model === 'string' && options.model.trim() ? options.model.trim() : model
        body.search_mode = 'required'
        body.stream = false
      }
      const path = mode === 'ai' ? '/v2/ai_search/chat/completions' : '/v2/ai_search/web_search'
      const payload = await requestJson({
        fetch: searchContext.fetch,
        provider: 'baidu',
        engine,
        url: `${config.baseUrl}${path}`,
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
      const references = Array.isArray(root.references) ? root.references : []
      let results = references
        .map(mapReference)
        .filter((item): item is NonNullable<typeof item> => item !== undefined)
      const choices = Array.isArray(root.choices) ? root.choices : []
      const firstChoice = record(choices[0])
      const message = record(firstChoice.message)
      const answer = typeof message.content === 'string' && message.content.trim() ? message.content.trim() : undefined
      if (results.length === 0 && answer !== undefined) {
        results = extractUrls(answer).map((url) => normalizedResult({ url, raw: { url } }))
          .filter((item): item is NonNullable<typeof item> => item !== undefined)
      }
      return {
        provider: 'baidu',
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
