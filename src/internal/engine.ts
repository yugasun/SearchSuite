import { InvalidEngineError, InvalidRequestError } from '../errors.js'
import type { ProviderId, SearchEngine } from '../types.js'

const ENGINE_ALLOWLIST: Record<ProviderId, readonly string[]> = {
  baidu: ['web', 'ai'],
  doubao: ['custom', 'global'],
  tavily: ['basic', 'advanced', 'fast', 'ultra-fast'],
  exa: ['auto', 'keyword', 'neural'],
  serper: ['google'],
}

export interface ParsedEngine {
  provider: ProviderId
  name: string
  full: SearchEngine
}

export interface ResolvedProviderEngine extends ParsedEngine {
  providerOptions?: Record<string, unknown>
}

export function getProviderEngines(provider: ProviderId): readonly string[] {
  return ENGINE_ALLOWLIST[provider]
}

function isProviderId(value: string): value is ProviderId {
  return Object.hasOwn(ENGINE_ALLOWLIST, value)
}

function optionRecord(value: unknown, provider: ProviderId): Record<string, unknown> {
  if (value === undefined) return {}
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new InvalidRequestError('providerOptions must be an object', {
      provider,
      operation: 'search',
    })
  }
  return { ...(value as Record<string, unknown>) }
}

function validateSelectionOption(provider: ProviderId, options: Record<string, unknown>): void {
  const key = provider === 'tavily' ? 'searchDepth'
    : provider === 'exa' ? 'searchType'
      : provider === 'baidu' || provider === 'doubao' ? 'mode'
        : undefined
  if (key === undefined || options[key] === undefined) return
  if (typeof options[key] !== 'string') {
    throw new InvalidRequestError(`Provider option '${key}' must be a string`, {
      provider,
      operation: 'search',
    })
  }
}

function selectedEngine(provider: ProviderId, options: Record<string, unknown>): string {
  switch (provider) {
    case 'baidu':
      return typeof options.mode === 'string' ? options.mode : 'web'
    case 'doubao':
      return typeof options.mode === 'string' ? options.mode : 'custom'
    case 'tavily':
      return typeof options.searchDepth === 'string' ? options.searchDepth : 'basic'
    case 'exa':
      return typeof options.searchType === 'string' ? options.searchType : 'auto'
    case 'serper':
      return 'google'
  }
}

function removeSelectionOption(provider: ProviderId, options: Record<string, unknown>): void {
  if (provider === 'baidu' || provider === 'doubao') delete options.mode
  if (provider === 'tavily') delete options.searchDepth
  if (provider === 'exa') delete options.searchType
}

export function parseEngine(value: string): ParsedEngine {
  const [rawProvider, ...rest] = value.split(':')
  const provider = rawProvider?.trim().toLowerCase()
  const name = rest.join(':').trim()

  if (!provider || !name || !isProviderId(provider) || !ENGINE_ALLOWLIST[provider].includes(name)) {
    throw new InvalidEngineError('Unknown or malformed search engine', { value })
  }

  return {
    provider,
    name,
    full: `${provider}:${name}` as SearchEngine,
  }
}

export function resolveProviderEngine(providerValue: string, providerOptions?: unknown): ResolvedProviderEngine {
  const provider = providerValue.trim().toLowerCase()
  if (!isProviderId(provider)) {
    throw new InvalidEngineError('Unknown search provider', { value: providerValue })
  }

  const options = optionRecord(providerOptions, provider)
  validateSelectionOption(provider, options)
  const name = selectedEngine(provider, options)
  if (!ENGINE_ALLOWLIST[provider].includes(name)) {
    throw new InvalidEngineError('Unknown search mode for provider', {
      value: `${provider}:${name}`,
    })
  }
  removeSelectionOption(provider, options)
  return {
    provider,
    name,
    full: `${provider}:${name}` as SearchEngine,
    ...(Object.keys(options).length === 0 ? {} : { providerOptions: options }),
  }
}
