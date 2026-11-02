import type { FetchProvider, FetchProviderFactory, FetchProviderFactoryMap, ProviderFactory, ProviderFactoryMap, SearchProvider } from './provider.js'
import type { FetchProviderId, ProviderContext, ProviderId } from './types.js'

export interface ProviderRegistry {
  get(provider: ProviderId, context: ProviderContext): Promise<SearchProvider>
}

export interface FetchProviderRegistry {
  get(provider: FetchProviderId, context: ProviderContext): Promise<FetchProvider>
}

function createLazyRegistry<K extends string, V, C>(
  factories: Record<K, (context: C) => V | Promise<V>>,
): { get(provider: K, context: C): Promise<V> } {
  const cache = new Map<K, Promise<V>>()

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

// Load registry plugins lazily so unused providers are not loaded.
const builtInFactories: Record<ProviderId, ProviderFactory> = {
  baidu: async (context) => (await import('./providers/baidu.js')).createBaiduProvider(context),
  doubao: async (context) => (await import('./providers/doubao.js')).createDoubaoProvider(context),
  tavily: async (context) => (await import('./providers/tavily.js')).createTavilyProvider(context),
  exa: async (context) => (await import('./providers/exa.js')).createExaProvider(context),
  serper: async (context) => (await import('./providers/serper.js')).createSerperProvider(context),
  deepseek: async (context) => (await import('./providers/deepseek.js')).createDeepSeekProvider(context),
  zhipu: async (context) => (await import('./providers/zhipu.js')).createZhipuProvider(context),
  bocha: async (context) => (await import('./providers/bocha.js')).createBochaProvider(context),
  alibaba: async (context) => (await import('./providers/alibaba.js')).createAlibabaProvider(context),
}

export function createProviderRegistry(overrides: ProviderFactoryMap = {}): ProviderRegistry {
  const factories: Record<ProviderId, ProviderFactory> = {
    ...builtInFactories,
    ...overrides,
  }
  return createLazyRegistry(factories)
}

const builtInFetchFactories: Record<FetchProviderId, FetchProviderFactory> = {
  tavily: async (context) => (await import('./providers/tavily-fetch.js')).createTavilyFetchProvider(context),
  exa: async (context) => (await import('./providers/exa-fetch.js')).createExaFetchProvider(context),
  deepseek: async (context) => (await import('./providers/deepseek-fetch.js')).createDeepSeekFetchProvider(context),
  zhipu: async (context) => (await import('./providers/zhipu-fetch.js')).createZhipuFetchProvider(context),
}

export function createFetchProviderRegistry(overrides: FetchProviderFactoryMap = {}): FetchProviderRegistry {
  const factories: Record<FetchProviderId, FetchProviderFactory> = {
    ...builtInFetchFactories,
    ...overrides,
  }
  return createLazyRegistry(factories)
}
