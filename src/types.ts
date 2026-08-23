import type { ProviderCapabilities } from './capabilities.js'

export type ProviderId = 'baidu' | 'doubao' | 'tavily' | 'exa' | 'serper'

export type FetchProviderId = 'tavily' | 'exa'

export type BaiduSearchMode = 'web' | 'ai'

export type DoubaoSearchMode = 'custom' | 'global'

export interface EngineMap {
  baidu: 'web' | 'ai'
  doubao: 'custom' | 'global'
  tavily: 'basic' | 'advanced' | 'fast' | 'ultra-fast'
  exa: 'auto' | 'keyword' | 'neural'
  serper: 'google'
}

export type SearchEngine = {
  [P in ProviderId]: `${P}:${EngineMap[P]}`
}[ProviderId]

export type SearchEngineForProvider<P extends ProviderId> = P extends ProviderId
  ? `${P}:${EngineMap[P]}`
  : never

type ProviderForSearchEngine<E extends SearchEngine> = E extends `${infer P}:${string}`
  ? P extends ProviderId ? P : ProviderId
  : ProviderId

export type NoProviderOptions = Record<string, never>

export interface BaiduAiSearchOptions {
  model?: string
}

export interface BaiduWebSearchOptions {
  mode?: 'web'
}

export interface BaiduAiProviderSearchOptions extends BaiduAiSearchOptions {
  mode: 'ai'
}

export type BaiduSearchOptions = BaiduWebSearchOptions | BaiduAiProviderSearchOptions

export interface DoubaoCustomSearchOptions {
  needSummary?: boolean
}

export interface DoubaoGlobalSearchOptions {
  maxSnippetLength?: number
}

export interface DoubaoCustomProviderSearchOptions extends DoubaoCustomSearchOptions {
  mode?: 'custom'
}

export interface DoubaoGlobalProviderSearchOptions extends DoubaoGlobalSearchOptions {
  mode: 'global'
}

export type DoubaoSearchOptions = DoubaoCustomProviderSearchOptions | DoubaoGlobalProviderSearchOptions

export interface TavilySearchOptions {
  searchDepth?: 'basic' | 'advanced' | 'fast' | 'ultra-fast'
  topic?: 'general' | 'news' | 'finance'
  includeAnswer?: boolean | 'basic' | 'advanced'
  includeRawContent?: boolean | 'markdown' | 'text'
}

export interface TavilyAdvancedSearchOptions extends TavilySearchOptions {
  searchDepth?: 'advanced'
  chunksPerSource?: 1 | 2 | 3
}

export interface ExaSearchOptions {
  searchType?: 'auto' | 'keyword' | 'neural'
  highlightsPerUrl?: number
}

export interface SerperSearchOptions {
  gl?: string
  hl?: string
}

export type ProviderOptionsFor<E extends SearchEngine> =
  E extends 'baidu:web' ? NoProviderOptions
    : E extends 'baidu:ai' ? BaiduAiSearchOptions
      : E extends 'doubao:custom' ? DoubaoCustomSearchOptions
        : E extends 'doubao:global' ? DoubaoGlobalSearchOptions
          : E extends 'tavily:advanced' ? TavilyAdvancedSearchOptions
            : E extends `tavily:${string}` ? TavilySearchOptions
              : E extends `exa:${string}` ? ExaSearchOptions
                : E extends 'serper:google' ? SerperSearchOptions
                  : never

export type SearchOptionsFor<P extends ProviderId> =
  P extends 'baidu' ? BaiduSearchOptions
    : P extends 'doubao' ? DoubaoSearchOptions
      : P extends 'tavily' ? TavilySearchOptions | TavilyAdvancedSearchOptions
        : P extends 'exa' ? ExaSearchOptions
          : P extends 'serper' ? SerperSearchOptions
            : never

export interface SearchRequest<E extends SearchEngine = SearchEngine> {
  engine: E
  query: string
  maxResults?: number
  includeDomains?: readonly string[]
  excludeDomains?: readonly string[]
  timeRange?: 'day' | 'week' | 'month' | 'year'
  providerOptions?: ProviderOptionsFor<E>
  signal?: AbortSignal
}

export interface ProviderSearchRequest<P extends ProviderId = ProviderId> {
  provider: P
  query: string
  maxResults?: number
  includeDomains?: readonly string[]
  excludeDomains?: readonly string[]
  timeRange?: 'day' | 'week' | 'month' | 'year'
  providerOptions?: SearchOptionsFor<P>
  signal?: AbortSignal
}

export interface SearchResult {
  title: string
  url: string
  snippet?: string
  content?: string
  score?: number
  publishedAt?: string
  raw?: unknown
}

export interface SearchUsage {
  requests?: number
  credits?: number
  raw?: unknown
}

export interface SearchResponse<E extends SearchEngine = SearchEngine> {
  provider: ProviderForSearchEngine<E>
  query: string
  engine: E
  answer?: string
  results: SearchResult[]
  usage?: SearchUsage
  latencyMs: number
  raw?: unknown
}

export type SearchResponseFor<P extends ProviderId> = SearchResponse<SearchEngineForProvider<P>>

/** A request for content at one absolute HTTP(S) URL. */
export interface WebFetchRequest {
  readonly url: string
}

export type WebFetchBody =
  | { readonly kind: 'html'; readonly content: string }
  | { readonly kind: 'text'; readonly content: string }

/** Normalized content returned by a WebFetchProvider. */
export interface WebFetchResult {
  readonly url: string
  readonly statusCode: number
  readonly body: WebFetchBody
  readonly truncated: boolean
  readonly raw?: unknown
}

/**
 * Framework-independent seam for a provider that retrieves page content.
 *
 * This shape is deliberately compatible with dsh-web's WebFetchProvider so a
 * dsh-web-search can consume the contract without making SearchSuite depend on
 * DeepSeek Harness.
 */
export interface WebFetchProvider {
  readonly id: string
  available(): boolean
  fetch(request: WebFetchRequest, signal?: AbortSignal): Promise<WebFetchResult>
}

export interface TavilyFetchOptions {
  extractDepth?: 'basic' | 'advanced'
  format?: 'markdown' | 'text'
}

export interface ExaFetchOptions {
  maxCharacters?: number
}

export type FetchOptionsFor<P extends FetchProviderId> =
  P extends 'tavily' ? TavilyFetchOptions
    : P extends 'exa' ? ExaFetchOptions
      : never

export interface FetchRequest<P extends FetchProviderId = FetchProviderId> {
  provider: P
  url: string
  providerOptions?: FetchOptionsFor<P>
  signal?: AbortSignal
}

export interface FetchResponse<P extends FetchProviderId = FetchProviderId> extends WebFetchResult {
  provider: P
  latencyMs: number
}

export interface ProviderConfig {
  apiKey?: string
  baseUrl?: string
}

export interface BaiduConfig extends ProviderConfig {
  model?: string
}

export type DoubaoConfig = ProviderConfig

export type TavilyConfig = ProviderConfig

export type ExaConfig = ProviderConfig

export type SerperConfig = ProviderConfig

export interface ProviderConfigMap {
  baidu?: BaiduConfig
  doubao?: DoubaoConfig
  tavily?: TavilyConfig
  exa?: ExaConfig
  serper?: SerperConfig
}

export type UnsupportedParamMode = 'strict' | 'warn' | 'ignore'

export interface SearchWarning {
  code: 'UNSUPPORTED_CAPABILITY' | 'PROVIDER_LIMIT'
  provider: ProviderId
  engine: SearchEngine
  parameter: string
  message: string
}

export interface SearchSuiteOptions {
  providers?: ProviderConfigMap
  timeoutMs?: number
  unsupportedParamMode?: UnsupportedParamMode
  onWarning?: (warning: SearchWarning) => void
  fetch?: typeof globalThis.fetch
}

export interface ProviderContext {
  fetch: typeof globalThis.fetch
  timeoutMs: number
  config: ProviderConfigMap
}

export interface ProviderFetchContext extends ProviderContext {
  signal: AbortSignal
  abortSource?: () => 'caller' | 'timeout' | undefined
}

export interface NormalizedSearchRequest<E extends SearchEngine = SearchEngine>
  extends Omit<SearchRequest<E>, 'query' | 'maxResults' | 'includeDomains' | 'excludeDomains'> {
  query: string
  maxResults: number
  includeDomains?: string[]
  excludeDomains?: string[]
  capabilities: ProviderCapabilities
}

export interface NormalizedFetchRequest<P extends FetchProviderId = FetchProviderId> {
  provider: P
  url: string
  providerOptions?: FetchOptionsFor<P>
}
