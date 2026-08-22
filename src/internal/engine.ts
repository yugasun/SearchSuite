import { InvalidEngineError } from '../errors.js'
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

export function getProviderEngines(provider: ProviderId): readonly string[] {
  return ENGINE_ALLOWLIST[provider]
}

function isProviderId(value: string): value is ProviderId {
  return Object.hasOwn(ENGINE_ALLOWLIST, value)
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
