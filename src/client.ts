import { performance } from 'node:perf_hooks'
import type { ProviderCapabilities } from './capabilities.js'
import {
  ConfigurationError,
  ProviderUnavailableError,
  SearchSuiteError,
  UnsupportedCapabilityError,
} from './errors.js'
import { parseEngine } from './internal/engine.js'
import { resolveProviderEngine } from './internal/engine.js'
import { normalizeFetchRequest } from './internal/fetch-normalize.js'
import { normalizeSearchRequest } from './internal/normalize.js'
import { combineSignals } from './internal/signal.js'
import { createFetchProviderRegistry, createProviderRegistry, type FetchProviderRegistry, type ProviderRegistry } from './registry.js'
import type { SearchProvider } from './provider.js'
import { emitWarning } from './warnings.js'
import type {
  NormalizedSearchRequest,
  FetchRequest,
  FetchResponse,
  FetchProviderId,
  ProviderSearchRequest,
  ProviderId,
  SearchEngine,
  SearchRequest,
  SearchResponse,
  SearchResponseFor,
  SearchSuiteOptions,
  SearchWarning,
  UnsupportedParamMode,
} from './types.js'

const DEFAULT_TIMEOUT_MS = 30_000

function hasValues(value: readonly unknown[] | undefined): boolean {
  return value !== undefined && value.length > 0
}

function unsupportedWarning(
  provider: SearchProvider,
  engine: SearchEngine,
  parameter: string,
): SearchWarning {
  return {
    code: 'UNSUPPORTED_CAPABILITY',
    provider: provider.id,
    engine,
    parameter,
    message: `Provider '${provider.id}' does not support '${parameter}' for '${engine}'; the parameter was ignored`,
  }
}

function applyCapabilityPolicy<E extends SearchEngine>(
  request: NormalizedSearchRequest<E>,
  provider: SearchProvider,
  mode: UnsupportedParamMode,
  onWarning: SearchSuiteOptions['onWarning'],
): NormalizedSearchRequest<E> {
  const checks: Array<[keyof ProviderCapabilities, keyof NormalizedSearchRequest<E>]> = [
    ['includeDomains', 'includeDomains'],
    ['excludeDomains', 'excludeDomains'],
    ['timeRange', 'timeRange'],
  ]
  const output = { ...request }

  for (const [capability, parameter] of checks) {
    const value = output[parameter]
    const present = Array.isArray(value) ? hasValues(value) : value !== undefined
    if (!present || provider.capabilities[capability]) continue

    if (mode === 'strict') {
      throw new UnsupportedCapabilityError(
        `Provider '${provider.id}' does not support '${String(parameter)}'`,
        { provider: provider.id, engine: request.engine },
      )
    }
    if (mode === 'warn') emitWarning(onWarning, unsupportedWarning(provider, request.engine, String(parameter)))
    delete output[parameter]
  }

  return output
}

function isSearchSuiteError(error: unknown): error is SearchSuiteError {
  return error instanceof SearchSuiteError
}

export class SearchSuite {
  private readonly timeoutMs: number
  private readonly unsupportedParamMode: UnsupportedParamMode
  private readonly onWarning: SearchSuiteOptions['onWarning']
  private readonly fetcher: typeof globalThis.fetch
  private readonly providers: SearchSuiteOptions['providers']
  private readonly registry: ProviderRegistry
  private readonly fetchRegistry: FetchProviderRegistry

  constructor(
    options: SearchSuiteOptions = {},
    registry: ProviderRegistry = createProviderRegistry(),
    fetchRegistry: FetchProviderRegistry = createFetchProviderRegistry(),
  ) {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new ConfigurationError('timeoutMs must be a positive finite number')
    }
    this.timeoutMs = timeoutMs
    this.unsupportedParamMode = options.unsupportedParamMode ?? 'warn'
    this.onWarning = options.onWarning
    this.fetcher = options.fetch ?? globalThis.fetch
    this.providers = options.providers
    this.registry = registry
    this.fetchRegistry = fetchRegistry
  }

  async search<P extends ProviderId>(request: ProviderSearchRequest<P>): Promise<SearchResponseFor<P>>
  async search<E extends SearchEngine>(request: SearchRequest<E>): Promise<SearchResponse<E>>
  async search(request: ProviderSearchRequest | SearchRequest): Promise<SearchResponse> {
    const started = performance.now()
    const resolved = 'provider' in request
      ? resolveProviderEngine(request.provider, request.providerOptions)
      : parseEngine(request.engine)
    const internalRequest = {
      ...request,
      engine: resolved.full,
      ...('provider' in request
        ? { providerOptions: 'providerOptions' in resolved ? resolved.providerOptions : undefined }
        : {}),
    } as SearchRequest<SearchEngine>
    const combined = combineSignals(this.timeoutMs, request.signal)

    try {
      combined.throwIfAborted()
      const provider = await this.registry.get(resolved.provider, {
        fetch: this.fetcher,
        timeoutMs: this.timeoutMs,
        config: this.providers ?? {},
      })
      combined.throwIfAborted()

      const normalized = normalizeSearchRequest(
        internalRequest,
        provider.capabilities,
      ) as NormalizedSearchRequest<SearchEngine>
      const effective = applyCapabilityPolicy(
        normalized,
        provider,
        this.unsupportedParamMode,
        this.onWarning,
      )
      const response = await provider.search(effective, {
        fetch: this.fetcher,
        timeoutMs: this.timeoutMs,
        config: this.providers ?? {},
        signal: combined.signal,
        abortSource: combined.source,
        warn: (warning) => emitWarning(this.onWarning, warning),
      })
      combined.throwIfAborted()

      return {
        ...response,
        provider: resolved.provider,
        query: effective.query,
        engine: resolved.full,
        latencyMs: Math.max(0, Math.round(performance.now() - started)),
      }
    } catch (error) {
      if (combined.source() !== undefined && !isSearchSuiteError(error)) {
        throw new ProviderUnavailableError('Search provider request failed', {
          provider: resolved.provider,
          engine: resolved.full,
          retryable: true,
          cause: error,
        })
      }
      throw error
    } finally {
      combined.cleanup()
    }
  }

  async fetch<P extends FetchProviderId>(request: FetchRequest<P>): Promise<FetchResponse<P>> {
    const started = performance.now()
    const combined = combineSignals(this.timeoutMs, request.signal)
    let provider: FetchProviderId = request.provider
    try {
      combined.throwIfAborted()
      const normalized = normalizeFetchRequest(request)
      provider = normalized.provider
      const fetchProvider = await this.fetchRegistry.get(normalized.provider, {
        fetch: this.fetcher,
        timeoutMs: this.timeoutMs,
        config: this.providers ?? {},
      })
      combined.throwIfAborted()
      const response = await fetchProvider.fetch(normalized, {
        fetch: this.fetcher,
        timeoutMs: this.timeoutMs,
        config: this.providers ?? {},
        signal: combined.signal,
        abortSource: combined.source,
      })
      combined.throwIfAborted()
      return {
        ...response,
        provider: normalized.provider,
        latencyMs: Math.max(0, Math.round(performance.now() - started)),
      } as FetchResponse<P>
    } catch (error) {
      if (combined.source() !== undefined && !isSearchSuiteError(error)) {
        throw new ProviderUnavailableError('Fetch provider request failed', {
          provider,
          operation: 'fetch',
          retryable: true,
          cause: error,
        })
      }
      throw error
    } finally {
      combined.cleanup()
    }
  }
}
