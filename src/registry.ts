import { ConfigurationError } from './errors.js'
import type { ProviderContext, ProviderId } from './types.js'
import type { ProviderFactory, ProviderFactoryMap, SearchProvider } from './provider.js'

export interface ProviderRegistry {
  get(provider: ProviderId, context: ProviderContext): Promise<SearchProvider>
}

function unavailableFactory(provider: ProviderId): ProviderFactory {
  return () => {
    throw new ConfigurationError(`Provider adapter '${provider}' has not been implemented yet`)
  }
}

const builtInFactories: Record<ProviderId, ProviderFactory> = {
  baidu: unavailableFactory('baidu'),
  doubao: unavailableFactory('doubao'),
  tavily: unavailableFactory('tavily'),
  exa: unavailableFactory('exa'),
  serper: unavailableFactory('serper'),
}

export function createProviderRegistry(overrides: ProviderFactoryMap = {}): ProviderRegistry {
  const factories: Record<ProviderId, ProviderFactory> = {
    ...builtInFactories,
    ...overrides,
  }
  const cache = new Map<ProviderId, Promise<SearchProvider>>()

  return {
    get(provider, context) {
      const cached = cache.get(provider)
      if (cached !== undefined) return cached

      const pending = Promise.resolve().then(() => factories[provider](context))
      cache.set(provider, pending)
      pending.catch(() => {
        if (cache.get(provider) === pending) cache.delete(provider)
      })
      return pending
    },
  }
}
