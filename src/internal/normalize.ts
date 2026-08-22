import { InvalidRequestError } from '../errors.js'
import type { ProviderCapabilities } from '../capabilities.js'
import type { NormalizedSearchRequest, SearchEngine, SearchRequest } from '../types.js'

function normalizeDomain(value: string): string {
  const candidate = value.trim()
  if (!candidate) return ''
  try {
    const parsed = candidate.includes('://') ? new URL(candidate) : new URL(`https://${candidate}`)
    return parsed.hostname.toLowerCase().replace(/\.$/, '')
  } catch {
    return candidate.toLowerCase().replace(/^\.+|\.+$/g, '')
  }
}

function normalizeDomains(values: readonly string[] | undefined): string[] | undefined {
  if (values === undefined) return undefined
  return [...new Set(values.map(normalizeDomain).filter(Boolean))]
}

export function normalizeSearchRequest<E extends SearchEngine>(
  request: SearchRequest<E>,
  capabilities: ProviderCapabilities,
): NormalizedSearchRequest<E> {
  const query = request.query.trim()
  if (!query) {
    throw new InvalidRequestError('Search query must not be blank', {
      provider: request.engine.split(':')[0] as never,
      engine: request.engine,
    })
  }

  const maxResults = request.maxResults ?? 10
  if (!Number.isSafeInteger(maxResults) || maxResults < 1) {
    throw new InvalidRequestError('maxResults must be a positive safe integer', {
      provider: request.engine.split(':')[0] as never,
      engine: request.engine,
    })
  }

  const includeDomains = normalizeDomains(request.includeDomains)
  const excludeDomains = normalizeDomains(request.excludeDomains)
  if (includeDomains !== undefined && excludeDomains !== undefined) {
    const excluded = new Set(excludeDomains)
    if (includeDomains.some((domain) => excluded.has(domain))) {
      throw new InvalidRequestError('A domain cannot be included and excluded at the same time', {
        provider: request.engine.split(':')[0] as never,
        engine: request.engine,
      })
    }
  }

  return {
    engine: request.engine,
    query,
    maxResults,
    ...(includeDomains === undefined ? {} : { includeDomains }),
    ...(excludeDomains === undefined ? {} : { excludeDomains }),
    ...(request.timeRange === undefined ? {} : { timeRange: request.timeRange }),
    ...(request.providerOptions === undefined ? {} : { providerOptions: { ...request.providerOptions } }),
    ...(request.signal === undefined ? {} : { signal: request.signal }),
    capabilities,
  }
}
