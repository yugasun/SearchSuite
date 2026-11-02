import { InvalidRequestError } from '../errors.js'
import type { FetchProviderId, FetchRequest, NormalizedFetchRequest } from '../types.js'

const DEEPSEEK_MAX_URL_LENGTH = 8192

function isFetchProvider(value: string): value is FetchProviderId {
  return value === 'tavily' || value === 'exa' || value === 'deepseek' || value === 'zhipu'
}

export function normalizeFetchRequest<P extends FetchProviderId>(request: FetchRequest<P>): NormalizedFetchRequest<P> {
  const provider = request.provider.trim().toLowerCase()
  if (!isFetchProvider(provider)) {
    throw new InvalidRequestError(`Provider '${request.provider}' does not support content fetching`, {
      provider: request.provider as never,
      operation: 'fetch',
    })
  }

  let url: URL
  try {
    url = new URL(request.url.trim())
  } catch (error) {
    throw new InvalidRequestError('Fetch URL must be an absolute HTTP(S) URL', { provider, operation: 'fetch', cause: error })
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new InvalidRequestError('Fetch URL must use http or https', { provider, operation: 'fetch' })
  }
  if ((provider === 'deepseek' || provider === 'zhipu') && (url.username !== '' || url.password !== '')) {
    throw new InvalidRequestError('Fetch URL must not include credentials', { provider, operation: 'fetch' })
  }
  const normalizedUrl = url.toString()
  if (provider === 'deepseek' && normalizedUrl.length > DEEPSEEK_MAX_URL_LENGTH) {
    throw new InvalidRequestError(`DeepSeek fetch URL must be at most ${DEEPSEEK_MAX_URL_LENGTH} characters`, { provider, operation: 'fetch' })
  }

  return {
    provider,
    url: normalizedUrl,
    ...(request.providerOptions === undefined ? {} : { providerOptions: { ...request.providerOptions } }),
  } as NormalizedFetchRequest<P>
}
