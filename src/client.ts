import { performance } from 'node:perf_hooks'
import type { ProviderCapabilities } from './capabilities.js'
import {
  ConfigurationError,
  ProviderUnavailableError,
  SearchSuiteError,
  UnsupportedCapabilityError,
} from './errors.js'
import { parseEngine } from './internal/engine.js'
import { normalizeSearchRequest } from './internal/normalize.js'
import { combineSignals } from './internal/signal.js'
import { createProviderRegistry, type ProviderRegistry } from './registry.js'
import type { SearchProvider } from './provider.js'
import { emitWarning } from './warnings.js'
import type {
  NormalizedSearchRequest,
  SearchEngine,
  SearchRequest,
  SearchResponse,
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

  constructor(options: SearchSuiteOptions = {}, registry: ProviderRegistry = createProviderRegistry()) {
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
  }

  async search<E extends SearchEngine>(request: SearchRequest<E>): Promise<SearchResponse<E>> {
    const started = performance.now()
    const parsed = parseEngine(request.engine)
    const combined = combineSignals(this.timeoutMs, request.signal)

    try {
      combined.throwIfAborted()
      const provider = await this.registry.get(parsed.provider, {
        fetch: this.fetcher,
        timeoutMs: this.timeoutMs,
        config: this.providers ?? {},
      })
      combined.throwIfAborted()

      const normalized = normalizeSearchRequest(
        { ...request, engine: parsed.full } as SearchRequest<SearchEngine>,
        provider.capabilities,
      ) as NormalizedSearchRequest<E>
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
        warn: (warning) => emitWarning(this.onWarning, warning),
      })
      combined.throwIfAborted()

      return {
        ...response,
        query: effective.query,
        engine: parsed.full as E,
        latencyMs: Math.max(0, Math.round(performance.now() - started)),
      }
    } catch (error) {
      if (combined.source() !== undefined && !isSearchSuiteError(error)) {
        throw new ProviderUnavailableError('Search provider request failed', {
          provider: parsed.provider,
          engine: parsed.full,
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
