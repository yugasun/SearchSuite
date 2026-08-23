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

const DEFAULT_BASE_URL = 'https://open.feedcoopapi.com'
const LEGACY_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3'
const QUERY_LIMIT = 100
const CAPABILITIES = {
  includeDomains: false,
  excludeDomains: false,
  timeRange: false,
  content: true,
  score: false,
} as const

function mapCustom(item: unknown) {
  const row = record(item)
  return normalizedResult({
    url: row.Url,
    title: row.Title,
    snippet: row.Summary ?? row.Snippet ?? row.Content,
    publishedAt: toIsoDate(row.PublishTime),
    raw: item,
  })
}

function mapGlobal(item: unknown) {
  const row = record(item)
  const snippets = Array.isArray(row.Snippet) ? row.Snippet : []
  const snippet = snippets
    .map((part) => record(part))
    .filter((part) => part.Type === undefined || part.Type === 'text')
    .map((part) => typeof part.Text === 'string' ? part.Text : '')
    .filter(Boolean)
    .join('\n')
  const info = record(row.DocumentInfo)
  return normalizedResult({
    url: row.Url,
    title: row.Title,
    snippet,
    publishedAt: toIsoDate(info.PublishTime),
    raw: item,
  })
}

export function createDoubaoProvider(context: ProviderContext): SearchProvider {
  const resolved = resolveProviderConfig(context, 'doubao', ['DOUBAO_API_KEY', 'DOUBAO_SEARCH_API_KEY'], DEFAULT_BASE_URL)
  const configBaseUrl = context.config.doubao?.baseUrl?.trim()
  const baseUrl = configBaseUrl === LEGACY_BASE_URL ? DEFAULT_BASE_URL : resolved.baseUrl

  return {
    id: 'doubao',
    capabilities: CAPABILITIES,
    async search(request, searchContext): Promise<SearchResponse> {
      const engine = request.engine
      const mode = engine.slice('doubao:'.length)
      const options = providerOptions(
        request.providerOptions,
        mode === 'custom' ? ['needSummary'] : ['maxSnippetLength'],
        searchContext,
        'doubao',
        engine,
        mode === 'custom'
          ? { needSummary: providerOptionRules.boolean }
          : { maxSnippetLength: providerOptionRules.positiveSafeInteger },
      )
      const max = mode === 'global' ? 20 : 50
      const maxResults = clampMaxResults(request.maxResults, max, searchContext, engine)
      const query = truncateByUnits(request.query, QUERY_LIMIT)
      if (query !== request.query) warnTruncation(searchContext, engine, 'query', QUERY_LIMIT)
      const body: Record<string, unknown> = mode === 'global'
        ? {
          Query: query,
          DocCount: maxResults,
          MaxSnippetLength: typeof options.maxSnippetLength === 'number' ? options.maxSnippetLength : 1_000,
          MaxImageCountPerDoc: 0,
        }
        : {
          Query: query,
          SearchType: 'web',
          Count: maxResults,
          NeedSummary: options.needSummary ?? true,
        }
      const path = mode === 'global' ? '/search_api/global_search' : '/search_api/web_search'
      const payload = await requestJson({
        fetch: searchContext.fetch,
        provider: 'doubao',
        engine,
        url: `${baseUrl}${path}`,
        signal: searchContext.signal,
        abortSource: searchContext.abortSource,
        init: {
          method: 'POST',
          headers: {
            authorization: `Bearer ${resolved.apiKey}`,
            'X-Traffic-Tag': 'searchsuite',
            'content-type': 'application/json',
          },
          body: JSON.stringify(body),
        },
      })
      const root = record(record(payload).Result)
      const items = mode === 'global' ? root.Documents : root.WebResults
      const results = (Array.isArray(items) ? items : [])
        .map(mode === 'global' ? mapGlobal : mapCustom)
        .filter((item): item is NonNullable<typeof item> => item !== undefined)
      return {
        provider: 'doubao',
        query: request.query,
        engine,
        results,
        latencyMs: 0,
        raw: safeRaw(payload),
      }
    },
  }
}
