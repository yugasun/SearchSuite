import type { ProviderCapabilities } from './capabilities.js'
import type {
  NormalizedSearchRequest,
  ProviderConfigMap,
  ProviderContext,
  ProviderId,
  SearchEngine,
  SearchResponse,
  SearchWarning,
} from './types.js'

export type { ProviderContext } from './types.js'

export interface ProviderSearchContext extends ProviderContext {
  signal: AbortSignal
  warn: (warning: SearchWarning) => void
}

export interface SearchProvider<E extends SearchEngine = SearchEngine> {
  readonly id: ProviderId
  readonly capabilities: ProviderCapabilities
  search(
    request: NormalizedSearchRequest<E>,
    context: ProviderSearchContext,
  ): Promise<SearchResponse<E>>
}

export type ProviderFactory = (context: ProviderContext) => SearchProvider | Promise<SearchProvider>

export type ProviderFactoryMap = Partial<Record<ProviderId, ProviderFactory>>

export function providerConfigFor(config: ProviderConfigMap, provider: ProviderId): ProviderConfigMap[ProviderId] {
  return config[provider]
}
