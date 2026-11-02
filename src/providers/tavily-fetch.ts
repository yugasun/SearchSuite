import { requestJson } from '../internal/http.js'
import {
  fetchProviderOptions,
  providerOptionRules,
  record,
  resolveProviderConfig,
  safeRaw,
} from '../internal/provider-utils.js'
import type { FetchProvider } from '../provider.js'
import type { ProviderContext, WebFetchResult } from '../types.js'

const DEFAULT_BASE_URL = 'https://api.tavily.com'

const ALLOWED_OPTIONS = ['extractDepth', 'format'] as const
const OPTION_RULES = {
  extractDepth: providerOptionRules.nullable(providerOptionRules.oneOf(['basic', 'advanced'])),
  format: providerOptionRules.nullable(providerOptionRules.oneOf(['markdown', 'text'])),
} as const

function textResult(url: string, content: string, raw: unknown): WebFetchResult {
  return {
    url,
    statusCode: 200,
    body: { kind: 'text', content },
    truncated: false,
    raw: safeRaw(raw),
  }
}

export function createTavilyFetchProvider(context: ProviderContext): FetchProvider<'tavily'> {
  const config = resolveProviderConfig(context, 'tavily', ['TAVILY_API_KEY'], DEFAULT_BASE_URL)

  return {
    id: 'tavily',
    async fetch(request, fetchContext): Promise<WebFetchResult> {
      const options = fetchProviderOptions(request.providerOptions, ALLOWED_OPTIONS, 'tavily', OPTION_RULES)
      const extractDepth = options.extractDepth ?? 'basic'
      const format = options.format ?? 'markdown'

      const payload = await requestJson({
        fetch: fetchContext.fetch,
        provider: 'tavily',
        operation: 'fetch',
        url: `${config.baseUrl}/extract`,
        signal: fetchContext.signal,
        abortSource: fetchContext.abortSource,
        init: {
          method: 'POST',
          headers: {
            authorization: `Bearer ${config.apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            urls: [request.url],
            extract_depth: extractDepth,
            format,
            include_images: false,
          }),
        },
      })
      const root = record(payload)
      const results = Array.isArray(root.results) ? root.results : []
      const hit = record(results[0])
      const content = typeof hit.raw_content === 'string' ? hit.raw_content.trim() : ''
      if (content) {
        return textResult(
          typeof hit.url === 'string' && hit.url.trim() ? hit.url.trim() : request.url,
          content,
          payload,
        )
      }
      const failed = Array.isArray(root.failed_results) ? record(root.failed_results[0]) : {}
      const message = typeof failed.error === 'string' && failed.error.trim()
        ? failed.error.trim()
        : 'Tavily extract returned no content'
      return {
        url: request.url,
        statusCode: 502,
        body: { kind: 'text', content: message },
        truncated: false,
        raw: safeRaw(payload),
      }
    },
  }
}
