import { ConfigurationError } from '../errors.js'
import { requestJson } from '../internal/http.js'
import {
  normalizedResult,
  providerOptions,
  providerOptionRules,
  record,
  safeRaw,
} from '../internal/provider-utils.js'
import type { SearchProvider } from '../provider.js'
import type { ProviderContext, SearchResponse } from '../types.js'

const CAPABILITIES = {
  includeDomains: false,
  excludeDomains: false,
  timeRange: false,
  content: false,
  score: false,
} as const

export function createAlibabaProvider(context: ProviderContext): SearchProvider {
  const config = context.config.alibaba
  const apiKey = config?.apiKey?.trim() || process.env.DASHSCOPE_API_KEY?.trim()
  if (!apiKey) {
    throw new ConfigurationError("Provider 'alibaba' requires an API key; configure DASHSCOPE_API_KEY", {
      provider: 'alibaba',
    })
  }

  const baseUrl = config?.baseUrl?.trim().replace(/\/$/, '')
  if (!baseUrl) {
    throw new ConfigurationError("Provider 'alibaba' requires an explicit baseUrl", { provider: 'alibaba' })
  }
  let parsedBaseUrl: URL
  try {
    parsedBaseUrl = new URL(baseUrl)
  } catch (error) {
    throw new ConfigurationError("Provider 'alibaba' baseUrl is invalid", { provider: 'alibaba', cause: error })
  }
  if (parsedBaseUrl.protocol !== 'http:' && parsedBaseUrl.protocol !== 'https:') {
    throw new ConfigurationError("Provider 'alibaba' baseUrl must use http or https", { provider: 'alibaba' })
  }

  return {
    id: 'alibaba',
    capabilities: CAPABILITIES,
    async search(request, searchContext): Promise<SearchResponse> {
      const engine = request.engine
      const options = providerOptions(
        request.providerOptions,
        ['model'],
        searchContext,
        'alibaba',
        engine,
        { model: providerOptionRules.string },
      )
      const payload = await requestJson({
        fetch: searchContext.fetch,
        provider: 'alibaba',
        engine,
        url: `${baseUrl}/api/v1/services/aigc/text-generation/generation`,
        signal: searchContext.signal,
        abortSource: searchContext.abortSource,
        init: {
          method: 'POST',
          headers: {
            authorization: `Bearer ${apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: options.model ?? 'qwen-plus',
            input: { messages: [{ role: 'user', content: request.query }] },
            parameters: {
              enable_search: true,
              result_format: 'message',
              search_options: { forced_search: true, enable_source: true },
            },
          }),
        },
      })
      const root = record(payload)
      const output = record(root.output)
      const searchInfo = record(output.search_info)
      const rows = Array.isArray(searchInfo.search_results) ? searchInfo.search_results : []
      const results = rows.slice(0, request.maxResults).map((item) => {
        const row = record(item)
        return normalizedResult({
          url: row.url,
          title: row.title,
          snippet: row.snippet,
          raw: item,
        })
      }).filter((item): item is NonNullable<typeof item> => item !== undefined)
      const choices = Array.isArray(output.choices) ? output.choices : []
      const message = record(record(choices[0]).message)

      return {
        provider: 'alibaba',
        query: request.query,
        engine,
        results,
        ...(typeof message.content === 'string' ? { answer: message.content } : {}),
        latencyMs: 0,
        raw: safeRaw(payload),
      }
    },
  }
}
