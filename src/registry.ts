import type { FetchProvider, FetchProviderFactory, FetchProviderFactoryMap, ProviderFactory, ProviderFactoryMap, SearchProvider } from './provider.js'
import type { FetchProviderId, ProviderContext, ProviderId } from './types.js'

export interface ProviderRegistry {
  get(provider: ProviderId, context: ProviderContext): Promise<SearchProvider>
}

export interface FetchProviderRegistry {
  get(provider: FetchProviderId, context: ProviderContext): Promise<FetchProvider>
}

const builtInFactories: Record<ProviderId, ProviderFactory> = {
  baidu: async (context) => (await import('./providers/baidu.js')).createBaiduProvider(context),
  doubao: async (context) => (await import('./providers/doubao.js')).createDoubaoProvider(context),
  tavily: async (context) => (await import('./providers/tavily.js')).createTavilyProvider(context),
  exa: async (context) => (await import('./providers/exa.js')).createExaProvider(context),
  serper: async (context) => (await import('./providers/serper.js')).createSerperProvider(context),
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

const builtInFetchFactories: Record<FetchProviderId, FetchProviderFactory> = {
  tavily: async (context) => (await import('./providers/tavily-fetch.js')).createTavilyFetchProvider(context),
  exa: async (context) => (await import('./providers/exa-fetch.js')).createExaFetchProvider(context),
}

export function createFetchProviderRegistry(overrides: FetchProviderFactoryMap = {}): FetchProviderRegistry {
  const factories: Record<FetchProviderId, FetchProviderFactory> = {
    ...builtInFetchFactories,
    ...overrides,
  }
  const cache = new Map<FetchProviderId, Promise<FetchProvider>>()

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
