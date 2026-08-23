import type { ProviderId, SearchEngine } from './types.js'
import { redactSecrets } from './internal/redact.js'

export type SearchErrorCode =
  | 'SEARCH_SUITE_ERROR'
  | 'CONFIGURATION_ERROR'
  | 'INVALID_ENGINE'
  | 'UNSUPPORTED_CAPABILITY'
  | 'SEARCH_ABORTED'
  | 'AUTHENTICATION_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'QUOTA_EXCEEDED'
  | 'INVALID_REQUEST'
  | 'PROVIDER_UNAVAILABLE'
  | 'SEARCH_TIMEOUT'

export interface SearchErrorContext {
  provider?: ProviderId
  engine?: SearchEngine
  operation?: 'search' | 'fetch'
  statusCode?: number
  retryable?: boolean
  raw?: unknown
  cause?: unknown
}

export interface ProviderErrorContext extends SearchErrorContext {
  provider: ProviderId
  engine?: SearchEngine
}

export class SearchSuiteError extends Error {
  readonly code: SearchErrorCode
  readonly provider?: ProviderId
  readonly engine?: SearchEngine
  readonly operation?: 'search' | 'fetch'
  readonly statusCode?: number
  readonly retryable: boolean
  readonly raw?: unknown

  constructor(code: SearchErrorCode, message: string, context: SearchErrorContext = {}) {
    super(String(redactSecrets(message)))
    this.name = new.target.name
    this.code = code
    if (context.provider !== undefined) this.provider = context.provider
    if (context.engine !== undefined) this.engine = context.engine
    if (context.operation !== undefined) this.operation = context.operation
    if (context.statusCode !== undefined) this.statusCode = context.statusCode
    this.retryable = context.retryable ?? false
    if (context.raw !== undefined) this.raw = redactSecrets(context.raw)
    if (context.cause !== undefined) {
      Object.defineProperty(this, 'cause', {
        configurable: true,
        enumerable: false,
        value: context.cause,
        writable: false,
      })
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      ...(this.provider === undefined ? {} : { provider: this.provider }),
      ...(this.engine === undefined ? {} : { engine: this.engine }),
      ...(this.operation === undefined ? {} : { operation: this.operation }),
      ...(this.statusCode === undefined ? {} : { statusCode: this.statusCode }),
      retryable: this.retryable,
      ...(this.raw === undefined ? {} : { raw: this.raw }),
    }
  }
}

export class ConfigurationError extends SearchSuiteError {
  constructor(message: string, context?: SearchErrorContext) {
    super('CONFIGURATION_ERROR', message, context)
  }
}

export class InvalidEngineError extends SearchSuiteError {
  constructor(message: string, context?: SearchErrorContext & { value?: string }) {
    super('INVALID_ENGINE', context?.value === undefined ? message : `${message}: ${context.value}`, {
      ...context,
      raw: context?.value === undefined ? context?.raw : { value: context.value },
    })
  }
}

export class UnsupportedCapabilityError extends SearchSuiteError {
  constructor(message: string, context?: SearchErrorContext) {
    super('UNSUPPORTED_CAPABILITY', message, context)
  }
}

export class SearchAbortedError extends SearchSuiteError {
  constructor(message = 'Search was aborted', context?: SearchErrorContext) {
    super('SEARCH_ABORTED', message, { ...context, retryable: false })
  }
}

export class ProviderError extends SearchSuiteError {
  constructor(code: Exclude<SearchErrorCode, 'SEARCH_SUITE_ERROR' | 'CONFIGURATION_ERROR' | 'INVALID_ENGINE' | 'UNSUPPORTED_CAPABILITY' | 'SEARCH_ABORTED'>, message: string, context: ProviderErrorContext) {
    super(code, message, context)
  }
}

export class AuthenticationError extends ProviderError {
  constructor(message: string, context: ProviderErrorContext) {
    super('AUTHENTICATION_ERROR', message, { ...context, retryable: false })
  }
}

export class RateLimitError extends ProviderError {
  constructor(message: string, context: ProviderErrorContext) {
    super('RATE_LIMIT_ERROR', message, { ...context, retryable: true })
  }
}

export class QuotaExceededError extends ProviderError {
  constructor(message: string, context: ProviderErrorContext) {
    super('QUOTA_EXCEEDED', message, { ...context, retryable: false })
  }
}

export class InvalidRequestError extends ProviderError {
  constructor(message: string, context: ProviderErrorContext) {
    super('INVALID_REQUEST', message, { ...context, retryable: false })
  }
}

export class ProviderUnavailableError extends ProviderError {
  constructor(message: string, context: ProviderErrorContext) {
    super('PROVIDER_UNAVAILABLE', message, context)
  }
}

export class SearchTimeoutError extends SearchSuiteError {
  constructor(message = 'Search timed out', context: SearchErrorContext = {}) {
    super('SEARCH_TIMEOUT', message, { ...context, retryable: true })
  }
}
