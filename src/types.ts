import type { ProviderCapabilities } from './capabilities.js'

export type ProviderId = 'baidu' | 'doubao' | 'tavily' | 'exa' | 'serper'

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

export type NoProviderOptions = Record<string, never>

export interface BaiduAiSearchOptions {
  model?: string
}

export interface DoubaoCustomSearchOptions {
  needSummary?: boolean
}

export interface DoubaoGlobalSearchOptions {
  maxSnippetLength?: number
}

export interface TavilySearchOptions {
  topic?: 'general' | 'news' | 'finance'
  includeAnswer?: boolean | 'basic' | 'advanced'
  includeRawContent?: boolean | 'markdown' | 'text'
}

export interface TavilyAdvancedSearchOptions extends TavilySearchOptions {
  chunksPerSource?: 1 | 2 | 3
}

export interface ExaSearchOptions {
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
  query: string
  engine: E
  answer?: string
  results: SearchResult[]
  usage?: SearchUsage
  latencyMs: number
  raw?: unknown
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

export interface NormalizedSearchRequest<E extends SearchEngine = SearchEngine>
  extends Omit<SearchRequest<E>, 'query' | 'maxResults' | 'includeDomains' | 'excludeDomains'> {
  query: string
  maxResults: number
  includeDomains?: string[]
  excludeDomains?: string[]
  capabilities: ProviderCapabilities
}
