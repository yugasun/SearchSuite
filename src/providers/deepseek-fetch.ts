import { requestJson } from '../internal/http.js'
import { fetchProviderOptions, record, resolveProviderConfig, safeRaw } from '../internal/provider-utils.js'
import type { FetchProvider } from '../provider.js'
import type { ProviderContext, WebFetchResult } from '../types.js'

const DEFAULT_BASE_URL = 'https://api.deepseek.com'

export function createDeepSeekFetchProvider(context: ProviderContext): FetchProvider<'deepseek'> {
  const config = resolveProviderConfig(context, 'deepseek', ['DEEPSEEK_API_KEY'], DEFAULT_BASE_URL)

  return {
    id: 'deepseek',
    async fetch(request, fetchContext): Promise<WebFetchResult> {
      fetchProviderOptions(request.providerOptions, [], 'deepseek')
      const payload = await requestJson({
        fetch: fetchContext.fetch,
        provider: 'deepseek',
        operation: 'fetch',
        url: `${config.baseUrl}/v1/tools/fetch`,
        signal: fetchContext.signal,
        abortSource: fetchContext.abortSource,
        init: {
          method: 'POST',
          headers: {
            authorization: `Bearer ${config.apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ url: request.url }),
        },
      })
      const root = record(payload)
      const content = typeof root.content === 'string' ? root.content : ''
      if (content.trim()) {
        return { url: request.url, statusCode: 200, body: { kind: 'text', content }, truncated: false, raw: safeRaw(payload) }
      }
      return {
        url: request.url,
        statusCode: 502,
        body: { kind: 'text', content: 'DeepSeek fetch returned no content' },
        truncated: false,
        raw: safeRaw(payload),
      }
    },
  }
}
