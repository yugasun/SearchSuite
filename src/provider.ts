import type { ProviderCapabilities } from './capabilities.js'
import type {
  NormalizedSearchRequest,
  NormalizedFetchRequest,
  ProviderConfigMap,
  ProviderContext,
  ProviderFetchContext,
  FetchProviderId,
  ProviderId,
  SearchEngine,
  SearchResponse,
  SearchWarning,
  WebFetchResult,
} from './types.js'

export type { ProviderContext, ProviderFetchContext } from './types.js'

export interface ProviderSearchContext extends ProviderContext {
  signal: AbortSignal
  abortSource?: () => 'caller' | 'timeout' | undefined
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

export interface FetchProvider<P extends FetchProviderId = FetchProviderId> {
  readonly id: P
  fetch(
    request: NormalizedFetchRequest<P>,
    context: ProviderFetchContext,
  ): Promise<WebFetchResult>
}

export type ProviderFactory = (context: ProviderContext) => SearchProvider | Promise<SearchProvider>

export type ProviderFactoryMap = Partial<Record<ProviderId, ProviderFactory>>

export type FetchProviderFactory = (
  context: ProviderContext,
) => FetchProvider | Promise<FetchProvider>

export type FetchProviderFactoryMap = Partial<Record<FetchProviderId, FetchProviderFactory>>

export function providerConfigFor(config: ProviderConfigMap, provider: ProviderId): ProviderConfigMap[ProviderId] {
  return config[provider]
}
