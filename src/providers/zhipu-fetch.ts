import { requestJson } from '../internal/http.js'
import { fetchProviderOptions, providerOptionRules, record, resolveProviderConfig, safeRaw } from '../internal/provider-utils.js'
import type { FetchProvider } from '../provider.js'
import type { ProviderContext, WebFetchResult } from '../types.js'

const ALLOWED_OPTIONS = ['timeoutSeconds', 'noCache', 'format', 'retainImages', 'noGfm', 'keepImgDataUrl', 'withImagesSummary', 'withLinksSummary'] as const
const OPTION_RULES = {
  timeoutSeconds: providerOptionRules.positiveSafeInteger,
  noCache: providerOptionRules.boolean,
  format: providerOptionRules.oneOf(['markdown', 'text']),
  retainImages: providerOptionRules.boolean,
  noGfm: providerOptionRules.boolean,
  keepImgDataUrl: providerOptionRules.boolean,
  withImagesSummary: providerOptionRules.boolean,
  withLinksSummary: providerOptionRules.boolean,
} as const
const DEFAULT_BASE_URL = 'https://open.bigmodel.cn/api'

export function createZhipuFetchProvider(context: ProviderContext): FetchProvider<'zhipu'> {
  const config = resolveProviderConfig(context, 'zhipu', ['ZHIPU_API_KEY'], DEFAULT_BASE_URL)

  return {
    id: 'zhipu',
    async fetch(request, fetchContext): Promise<WebFetchResult> {
      const options = fetchProviderOptions(request.providerOptions, ALLOWED_OPTIONS, 'zhipu', OPTION_RULES)
      const timeoutSeconds = options.timeoutSeconds
      const body: Record<string, unknown> = { url: request.url }
      if (timeoutSeconds !== undefined) body.timeout = timeoutSeconds
      if (options.noCache !== undefined) body.no_cache = options.noCache
      if (options.format !== undefined) body.return_format = options.format
      if (options.retainImages !== undefined) body.retain_images = options.retainImages
      if (options.noGfm !== undefined) body.no_gfm = options.noGfm
      if (options.keepImgDataUrl !== undefined) body.keep_img_data_url = options.keepImgDataUrl
      if (options.withImagesSummary !== undefined) body.with_images_summary = options.withImagesSummary
      if (options.withLinksSummary !== undefined) body.with_links_summary = options.withLinksSummary
      const payload = await requestJson({
        fetch: fetchContext.fetch,
        provider: 'zhipu',
        operation: 'fetch',
        url: `${config.baseUrl}/paas/v4/reader`,
        signal: fetchContext.signal,
        abortSource: fetchContext.abortSource,
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
      const result = record(root.reader_result)
      const content = typeof result.content === 'string' ? result.content : ''
      if (content.trim()) {
        return { url: request.url, statusCode: 200, body: { kind: 'text', content }, truncated: false, raw: safeRaw(payload) }
      }
      return {
        url: request.url,
        statusCode: 502,
        body: { kind: 'text', content: 'Zhipu reader returned no content' },
        truncated: false,
        raw: safeRaw(payload),
      }
    },
  }
}
