import { InvalidRequestError } from '../errors.js'
import type { FetchProviderId, FetchRequest, NormalizedFetchRequest } from '../types.js'

function isFetchProvider(value: string): value is FetchProviderId {
  return value === 'tavily' || value === 'exa'
}

export function normalizeFetchRequest<P extends FetchProviderId>(
  request: FetchRequest<P>,
): NormalizedFetchRequest<P> {
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
    throw new InvalidRequestError('Fetch URL must be an absolute HTTP(S) URL', {
      provider,
      operation: 'fetch',
      cause: error,
    })
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new InvalidRequestError('Fetch URL must use http or https', {
      provider,
      operation: 'fetch',
    })
  }

  return {
    provider,
    url: url.toString(),
    ...(request.providerOptions === undefined ? {} : { providerOptions: { ...request.providerOptions } }),
  } as NormalizedFetchRequest<P>
}
