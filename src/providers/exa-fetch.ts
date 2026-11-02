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

const DEFAULT_BASE_URL = 'https://api.exa.ai'
const DEFAULT_MAX_CHARACTERS = 100_000

const ALLOWED_OPTIONS = ['maxCharacters'] as const
const OPTION_RULES = { maxCharacters: providerOptionRules.positiveSafeInteger } as const

export function createExaFetchProvider(context: ProviderContext): FetchProvider<'exa'> {
  const config = resolveProviderConfig(context, 'exa', ['EXA_API_KEY'], DEFAULT_BASE_URL)

  return {
    id: 'exa',
    async fetch(request, fetchContext): Promise<WebFetchResult> {
      const options = fetchProviderOptions(request.providerOptions, ALLOWED_OPTIONS, 'exa', OPTION_RULES)
      const maxCharacters = options.maxCharacters === undefined ? DEFAULT_MAX_CHARACTERS : options.maxCharacters as number
      const payload = await requestJson({
        fetch: fetchContext.fetch,
        provider: 'exa',
        operation: 'fetch',
        url: `${config.baseUrl}/contents`,
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
            text: { maxCharacters },
          }),
        },
      })
      const root = record(payload)
      const results = Array.isArray(root.results) ? root.results : []
      const hit = record(results[0])
      const content = typeof hit.text === 'string' ? hit.text.trim() : ''
      if (content) {
        return {
          url: typeof hit.url === 'string' && hit.url.trim() ? hit.url.trim() : request.url,
          statusCode: 200,
          body: { kind: 'text', content },
          truncated: content.length >= maxCharacters,
          raw: safeRaw(payload),
        }
      }
      return {
        url: request.url,
        statusCode: 502,
        body: { kind: 'text', content: 'Exa contents returned no text' },
        truncated: false,
        raw: safeRaw(payload),
      }
    },
  }
}
