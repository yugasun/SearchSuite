import type { ProviderContext, ProviderId } from './types.js'
import type { ProviderFactory, ProviderFactoryMap, SearchProvider } from './provider.js'

export interface ProviderRegistry {
  get(provider: ProviderId, context: ProviderContext): Promise<SearchProvider>
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
