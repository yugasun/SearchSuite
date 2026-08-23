import { InvalidRequestError } from '../errors.js'
import { requestJson } from '../internal/http.js'
import {
  fetchProviderOptions,
  record,
  resolveProviderConfig,
  safeRaw,
} from '../internal/provider-utils.js'
import type { FetchProvider } from '../provider.js'
import type { ProviderContext, WebFetchResult } from '../types.js'

const DEFAULT_BASE_URL = 'https://api.exa.ai'
const DEFAULT_MAX_CHARACTERS = 100_000

export function createExaFetchProvider(context: ProviderContext): FetchProvider<'exa'> {
  const config = resolveProviderConfig(context, 'exa', ['EXA_API_KEY'], DEFAULT_BASE_URL)

  return {
    id: 'exa',
    async fetch(request, fetchContext): Promise<WebFetchResult> {
      const options = fetchProviderOptions(
        request.providerOptions,
        ['maxCharacters'],
        'exa',
      )
      const maxCharacters = typeof options.maxCharacters === 'number'
        ? options.maxCharacters
        : DEFAULT_MAX_CHARACTERS
      if (!Number.isSafeInteger(maxCharacters) || maxCharacters < 1) {
        throw new InvalidRequestError('Exa maxCharacters must be a positive safe integer', {
          provider: 'exa',
          operation: 'fetch',
        })
      }

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
