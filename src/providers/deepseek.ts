import { isIP } from 'node:net'
import { InvalidRequestError } from '../errors.js'
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

const DEFAULT_BASE_URL = 'https://api.deepseek.com'
const CAPABILITIES = {
  includeDomains: false,
  excludeDomains: false,
  timeRange: false,
  content: true,
  score: true,
} as const

export function createDeepSeekProvider(context: ProviderContext): SearchProvider {
  const config = resolveProviderConfig(context, 'deepseek', ['DEEPSEEK_API_KEY'], DEFAULT_BASE_URL)

  return {
    id: 'deepseek',
    capabilities: CAPABILITIES,
    async search(request, searchContext): Promise<SearchResponse> {
      const engine = request.engine
      if (engine !== 'deepseek:web') throw new Error(`Unsupported DeepSeek engine: ${engine}`)
      if ([...request.query].length > 128) {
        throw new InvalidRequestError('DeepSeek query must be at most 128 Unicode characters', { provider: 'deepseek', engine })
      }
      const options = providerOptions(
        request.providerOptions,
        ['needContent', 'originalQuestion', 'localization'],
        searchContext,
        'deepseek',
        engine,
        { needContent: providerOptionRules.boolean, originalQuestion: providerOptionRules.string, localization: providerOptionRules.string },
      )
      const originalQuestion = options.originalQuestion as string | undefined
      const localization = options.localization as string | undefined
      if (originalQuestion !== undefined && ([...originalQuestion].length < 1 || [...originalQuestion].length > 128)) {
        throw new InvalidRequestError('DeepSeek originalQuestion must contain 1 to 128 Unicode characters', { provider: 'deepseek', engine })
      }
      if (localization !== undefined && localization !== '' && isIP(localization) === 0) {
        throw new InvalidRequestError('DeepSeek localization must be an IP address', { provider: 'deepseek', engine })
      }

      const body: Record<string, unknown> = {
        query: request.query,
        count: clampMaxResults(request.maxResults, 50, searchContext, engine),
      }
      if (options.needContent !== undefined) body.need_content = options.needContent
      if (originalQuestion !== undefined) body.ori_question = originalQuestion
      if (localization !== undefined) body.localization = localization

      const payload = await requestJson({
        fetch: searchContext.fetch,
        provider: 'deepseek',
        engine,
        url: `${config.baseUrl}/v1/tools/search`,
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
            snippet: row.snippet,
            content: row.content,
            score: row.rerank_score,
            publishedAt: toIsoDate(row.date),
            raw: item,
          })
        }).filter((item): item is NonNullable<typeof item> => item !== undefined)
        : []
      return {
        provider: 'deepseek',
        query: request.query,
        engine,
        results,
        latencyMs: 0,
        raw: safeRaw(payload),
      }
    },
  }
}
