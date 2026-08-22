import { ConfigurationError, InvalidRequestError } from '../errors.js'
import type { ProviderSearchContext } from '../provider.js'
import { redactSecrets } from './redact.js'
import type {
  ProviderConfig,
  ProviderId,
  SearchEngine,
  SearchResult,
  SearchUsage,
} from '../types.js'

export interface ResolvedProviderConfig {
  apiKey: string
  baseUrl: string
}

export function resolveProviderConfig(
  context: ProviderSearchContext | { config: ProviderSearchContext['config'] },
  provider: ProviderId,
  envNames: readonly string[],
  defaultBaseUrl: string,
): ResolvedProviderConfig {
  const configured = context.config[provider] as ProviderConfig | undefined
  const apiKey = configured?.apiKey?.trim() || envNames.map((name) => process.env[name]?.trim()).find(Boolean)
  if (!apiKey) {
    throw new ConfigurationError(
      `Provider '${provider}' requires an API key; configure ${envNames.join(' or ')}`,
      { provider },
    )
  }

  const baseUrl = (configured?.baseUrl?.trim() || defaultBaseUrl).replace(/\/$/, '')
  let parsed: URL
  try {
    parsed = new URL(baseUrl)
  } catch (error) {
    throw new ConfigurationError(`Provider '${provider}' baseUrl is invalid`, {
      provider,
      cause: error,
    })
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ConfigurationError(`Provider '${provider}' baseUrl must use http or https`, { provider })
  }
  return { apiKey, baseUrl }
}

export function providerOptions(
  value: unknown,
  allowed: readonly string[],
  context: ProviderSearchContext,
  provider: ProviderId,
  engine: SearchEngine,
): Record<string, unknown> {
  if (value === undefined) return {}
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new InvalidRequestError('providerOptions must be an object', {
      provider,
      engine,
    })
  }
  const options = value as Record<string, unknown>
  for (const key of Object.keys(options)) {
    if (!allowed.includes(key)) {
      throw new InvalidRequestError(`Unknown provider option '${key}'`, {
        provider,
        engine,
      })
    }
  }
  return options
}

export function clampMaxResults(
  value: number,
  limit: number,
  context: ProviderSearchContext,
  engine: SearchEngine,
): number {
  if (value <= limit) return value
  context.warn({
    code: 'PROVIDER_LIMIT',
    provider: engine.split(':')[0] as ProviderId,
    engine,
    parameter: 'maxResults',
    message: `Provider limit is ${limit}; maxResults was reduced from ${value}`,
  })
  return limit
}

export function truncateByUnits(
  value: string,
  limit: number,
  unitWeight: (char: string) => number = () => 1,
): string {
  let units = 0
  let output = ''
  for (const char of value) {
    const weight = unitWeight(char)
    if (units + weight > limit) break
    units += weight
    output += char
  }
  return output
}

export function warnTruncation(
  context: ProviderSearchContext,
  engine: SearchEngine,
  parameter: string,
  limit: number,
): void {
  context.warn({
    code: 'PROVIDER_LIMIT',
    provider: engine.split(':')[0] as ProviderId,
    engine,
    parameter,
    message: `${parameter} was truncated to the provider limit of ${limit}`,
  })
}

export function toIsoDate(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined
  const timestamp = Date.parse(String(value))
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString()
}

export function safeRaw(value: unknown): unknown {
  return redactSecrets(value)
}

export function normalizedResult(input: {
  url?: unknown
  title?: unknown
  snippet?: unknown
  content?: unknown
  score?: unknown
  publishedAt?: unknown
  raw?: unknown
}): SearchResult | undefined {
  if (typeof input.url !== 'string' || input.url.trim().length === 0) return undefined
  let url: URL
  try {
    url = new URL(input.url.trim())
  } catch {
    return undefined
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
  const title = typeof input.title === 'string' && input.title.trim().length > 0
    ? input.title.trim()
    : url.hostname || url.toString()
  const result: SearchResult = { title, url: url.toString() }
  if (typeof input.snippet === 'string' && input.snippet.trim()) result.snippet = input.snippet.trim()
  if (typeof input.content === 'string' && input.content.trim()) result.content = input.content.trim()
  if (typeof input.score === 'number' && Number.isFinite(input.score)) result.score = input.score
  const publishedAt = toIsoDate(input.publishedAt)
  if (publishedAt !== undefined) result.publishedAt = publishedAt
  if (input.raw !== undefined) result.raw = safeRaw(input.raw)
  return result
}

export function mapUsage(value: unknown): SearchUsage | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  const usage: SearchUsage = {}
  if (typeof record.requests === 'number') usage.requests = record.requests
  if (typeof record.credits === 'number') usage.credits = record.credits
  if (Object.keys(usage).length === 0) return undefined
  usage.raw = safeRaw(value)
  return usage
}

export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}
