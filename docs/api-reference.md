# API reference

SearchSuite exposes one asynchronous search operation and a small set of typed
contracts. This guide summarizes the stable public surface; use the linked
source declarations as the authority for exact TypeScript shapes.

## `SearchSuite`

```ts
import { SearchSuite } from 'searchsuite'

const client = new SearchSuite({
  providers: {
    tavily: { apiKey: process.env.TAVILY_API_KEY },
  },
  timeoutMs: 30_000,
  unsupportedParamMode: 'warn',
  onWarning: (warning) => console.warn(warning),
})
```

The constructor accepts [`SearchSuiteOptions`](../src/types.ts):

| Option | Default | Purpose |
| --- | --- | --- |
| `providers` | `{}` | Explicit API keys, base URLs, and supported provider configuration. Explicit values override environment variables, which override provider defaults. |
| `timeoutMs` | `30_000` | End-to-end SDK deadline in milliseconds. It must be a positive finite number. |
| `unsupportedParamMode` | `'warn'` | Controls unsupported common search parameters: `'strict'`, `'warn'`, or `'ignore'`. |
| `onWarning` | none | Receives structured `SearchWarning` objects. |
| `fetch` | `globalThis.fetch` | Injects a Fetch-compatible implementation for tests, proxies, or controlled runtimes. |

The package uses native `fetch` and does not hold a persistent connection pool,
so there is no `close()` method.

## `search(request)`

```ts
const response = await client.search({
  engine: 'tavily:advanced',
  query: 'Typed search SDK design',
  maxResults: 5,
  includeDomains: ['typescriptlang.org'],
  timeRange: 'month',
  providerOptions: {
    includeAnswer: true,
    chunksPerSource: 2,
  },
})
```

`search<E extends SearchEngine>()` returns `Promise<SearchResponse<E>>`. The
engine literal selects the corresponding `providerOptions` type and is retained
on the response. For example, `chunksPerSource` is accepted for
`tavily:advanced` but rejected for `tavily:basic`.

[`SearchRequest`](../src/types.ts) contains:

- `engine`: a supported `provider:engine` literal.
- `query`: the search query.
- `maxResults`: requested result count; defaults to `10`.
- `includeDomains` and `excludeDomains`: optional domain filters.
- `timeRange`: `'day'`, `'week'`, `'month'`, or `'year'`.
- `providerOptions`: engine-specific typed options.
- `signal`: an optional caller-owned `AbortSignal`.

Before an adapter runs, SearchSuite trims the query and rejects a blank value.
`maxResults` must be a positive safe integer. Domains are trimmed, reduced to
lowercase hostnames, stripped of a final dot, de-duplicated, and rejected when
the same normalized hostname is both included and excluded. Provider adapters
may clamp valid values to their upstream limits and emit a warning.

TypeScript only protects typed callers. Adapters also validate
`providerOptions` at runtime and reject unknown option keys. See
[Providers](providers.md) for the supported engine literals and their options.

There is no `asearch` alias: `search()` is already asynchronous.

## Responses and results

Every provider returns [`SearchResponse`](../src/types.ts):

| Field | Meaning |
| --- | --- |
| `query` | The normalized query actually sent through the adapter. |
| `engine` | The requested engine literal. |
| `answer?` | A provider-supplied top-level answer; SearchSuite does not synthesize one from snippets. |
| `results` | Normalized `SearchResult[]`. |
| `usage?` | Portable request or credit counts when the provider reports them, plus optional safe `raw`. |
| `latencyMs` | Rounded end-to-end client latency measured with a monotonic clock. |
| `raw?` | Optional JSON-compatible, redacted provider response data. |

Every retained `SearchResult` has a non-empty `title` and an absolute HTTP(S)
`url`. Invalid URLs are discarded, and a missing title receives a stable
hostname or URL fallback. Results may also contain `snippet`, `content`,
`score`, ISO 8601 `publishedAt`, and safe `raw` fields.

Scores preserve provider-local semantics. Core code does not normalize or
compare scores across providers.

## Warnings and capability policy

[`SearchWarning`](../src/types.ts) has one of two codes:

- `UNSUPPORTED_CAPABILITY`: a common parameter is not mapped by the selected
  adapter.
- `PROVIDER_LIMIT`: an otherwise valid request was clamped or truncated to an
  upstream limit.

`unsupportedParamMode` applies only to unsupported common parameters:

- `'strict'` throws `UnsupportedCapabilityError`.
- `'warn'` calls `onWarning` and removes the unsupported parameter.
- `'ignore'` removes the unsupported parameter silently.

Provider-limit warnings are independent of this mode and are still delivered to
`onWarning`. The current common capability policy covers `includeDomains`,
`excludeDomains`, and `timeRange`.

## Errors

All exported error classes are defined in [`src/errors.ts`](../src/errors.ts).
Each instance has a stable `code`, a redacted `message`, `retryable`, and optional
`provider`, `engine`, `statusCode`, and safe `raw` metadata. `toJSON()` returns
the serializable public metadata and excludes the non-enumerable `cause`.

| Export | Stable code | Notes |
| --- | --- | --- |
| `SearchSuiteError` | `SEARCH_SUITE_ERROR` is the reserved generic code | Base SDK error; built-in subclasses assign the specific codes below. |
| `ConfigurationError` | `CONFIGURATION_ERROR` | Invalid SDK/provider configuration or missing credentials. |
| `InvalidEngineError` | `INVALID_ENGINE` | Invalid engine syntax, provider, or engine name. |
| `UnsupportedCapabilityError` | `UNSUPPORTED_CAPABILITY` | Unsupported common parameter in strict mode. |
| `SearchAbortedError` | `SEARCH_ABORTED` | Cancellation initiated by the caller; not retryable. |
| `ProviderError` | No independent code | Base class; a subclass or direct constructor supplies one of the provider error codes below. |
| `AuthenticationError` | `AUTHENTICATION_ERROR` | Authentication or authorization failure; not retryable. |
| `RateLimitError` | `RATE_LIMIT_ERROR` | Provider rate limit; marked retryable. |
| `QuotaExceededError` | `QUOTA_EXCEEDED` | Public quota-exhaustion type; not retryable. |
| `InvalidRequestError` | `INVALID_REQUEST` | Invalid common input or provider rejection; not retryable. |
| `ProviderUnavailableError` | `PROVIDER_UNAVAILABLE` | Network, upstream, or unclassified HTTP failure. |
| `SearchTimeoutError` | `SEARCH_TIMEOUT` | SDK deadline or upstream HTTP 408; marked retryable. |

The shared HTTP boundary currently maps:

| Condition | Error |
| --- | --- |
| HTTP 401 or 403 | `AuthenticationError` |
| HTTP 429 | `RateLimitError` |
| HTTP 400 or 422 | `InvalidRequestError` |
| HTTP 408 | `SearchTimeoutError` |
| HTTP 5xx or another unclassified non-success status | `ProviderUnavailableError` |
| Caller abort | `SearchAbortedError` |
| SDK deadline | `SearchTimeoutError` |
| Other fetch/network failure | `ProviderUnavailableError` |

`QuotaExceededError` is public for a provider-specific mapping that can reliably
distinguish quota exhaustion. The generic HTTP mapper maps every HTTP 429 to
`RateLimitError`, and the current adapters do not emit a quota-specific error.

The `retryable` flag is metadata only. SearchSuite v0.1 does not retry, route,
or fall back automatically.

## Cancellation and timeout

```ts
const controller = new AbortController()

const pending = client.search({
  engine: 'exa:auto',
  query: 'AbortSignal patterns',
  signal: controller.signal,
})

controller.abort()
await pending // rejects with SearchAbortedError
```

SearchSuite combines the caller signal with its own deadline. The first source
to abort determines the error class: caller cancellation remains distinct from
`SearchTimeoutError`. The combined signal is passed to the injected or global
fetch implementation.

## Raw data and fetch injection

Response, result, usage, and error paths preserve only data selected by
the adapter. Known credential-shaped keys, authorization values, bearer tokens,
and URL query secrets are redacted before safe `raw` or error metadata is
exposed. Authentication headers are never intentionally copied.

Redaction is a defense in depth, not a classification system. Provider payloads
may contain user queries, source content, or new secret field names, so review
`raw` before logging or forwarding it. An injected `fetch` implementation must
honor the supplied `AbortSignal` and return standard `Response` objects.

SearchSuite v0.1 deliberately has no automatic retry, fallback, provider router,
result fusion, caching, `asearch`, or lifecycle method.
