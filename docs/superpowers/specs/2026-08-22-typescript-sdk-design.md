# SearchSuite TypeScript SDK Design

Status: Approved by user on 2026-08-22

## Summary

SearchSuite is a framework-agnostic, ESM-only TypeScript SDK that provides one asynchronous API across five search providers: Baidu, Doubao, Tavily, Exa, and Serper. It originates from the provider work in `dsh-web-search`, but v0.1 does not depend on, modify, or replace that plugin.

The published npm package is named `searchsuite`, targets Node.js 24+, uses native `fetch`, and has zero runtime dependencies.

## Goals

- Switch providers by changing a typed `provider:engine` string.
- Normalize common search inputs, results, usage metadata, warnings, and errors.
- Preserve provider-specific capabilities through typed `providerOptions` and safe `raw` values.
- Provide excellent compile-time inference and equivalent runtime validation.
- Keep Provider Adapters reusable by future consumers such as `dsh-web-search`.

## Non-goals

- A dsh plugin or dependencies on `@deepseek-ai/*`
- `web_fetch`, Extract, Crawl, Research, or page-content APIs
- Automatic provider selection, fallback, retry, routing, caching, fusion, or reranking
- Multiple credentials, quotas, billing, gateway, UI, or SaaS features
- CommonJS or non-Node runtime compatibility

## Runtime and packaging

- Package: `searchsuite`
- Node.js: `>=24`
- Module: ESM only with `"type": "module"`
- Language: TypeScript strict
- Build: tsdown producing JavaScript, declarations, and sourcemaps
- Package manager: pnpm
- Test: Vitest
- HTTP: native `fetch` and `AbortSignal`
- Published runtime dependencies: none

## Public API

```ts
import { SearchSuite } from 'searchsuite'

const client = new SearchSuite({
  providers: {
    tavily: { apiKey: process.env.TAVILY_API_KEY },
  },
  timeoutMs: 30_000,
  unsupportedParamMode: 'warn',
})

const response = await client.search({
  engine: 'tavily:advanced',
  query: 'AI Agent search infrastructure',
  maxResults: 5,
  providerOptions: {
    includeAnswer: true,
    includeRawContent: 'markdown',
  },
  signal: AbortSignal.timeout(20_000),
})
```

`search()` is the only search method. It returns a Promise, so no `asearch` alias exists. The Client does not expose `close()` because it owns no persistent transport resources.

## Engines

```text
baidu:web
baidu:ai
doubao:custom
doubao:global
tavily:basic
tavily:advanced
tavily:fast
tavily:ultra-fast
exa:auto
exa:keyword
exa:neural
serper:google
```

No speculative engines are reserved in v0.1.

## Type model

`SearchEngine` is a template-literal union. `SearchRequest<E>` binds the engine to `ProviderOptionsFor<E>`, enabling inference and excess-property checking for provider-specific options.

Common request fields are `engine`, `query`, `maxResults`, `includeDomains`, `excludeDomains`, `timeRange`, `providerOptions`, and `signal`.

`SearchResult` contains required `title` and `url`, with optional `snippet`, `content`, `score`, `publishedAt`, and `raw`. Dates are ISO 8601 strings, not `Date` instances. Scores retain provider-local meaning. Raw values use `unknown` and must be JSON-compatible and credential-free.

`SearchResponse<E>` contains `query`, `engine`, optional top-level `answer`, `results`, optional `usage`, required `latencyMs`, and optional safe `raw`. Provider-generated answers, answer boxes, and knowledge-graph summaries use `answer`; per-result page content uses `SearchResult.content`.

Provider options are fixed for v0.1: Baidu AI supports `model`; Doubao Custom supports `needSummary`; Doubao Global supports `maxSnippetLength`; Tavily supports `topic`, `includeAnswer`, and `includeRawContent`, with `chunksPerSource` available only for Advanced; Exa supports `highlightsPerUrl`; Serper supports `gl` and `hl`. Engines with no options reject unknown fields.

## Provider architecture

An explicit registry maps provider IDs to dynamic import factories. Client parses and validates the engine, normalizes common input, applies capability policy, lazily creates the Provider, calls it, and records monotonic latency.

A Provider owns only its configuration and request/response/error mapping. It must not perform cross-provider operations. Native fetch is injectable at Client construction for tests and controlled environments.

Configuration precedence is explicit Provider config, then environment variables, then Provider defaults. Configuration is resolved when the Provider is first used.

## Compatibility policy

Unsupported common parameters follow `strict`, `warn`, or `ignore` mode. The default is `warn`. Warnings are delivered through an injectable `onWarning` callback; the SDK does not call `console` directly.

Provider options are statically typed and runtime validated. Unknown options fail with `InvalidRequestError`; they are never blindly forwarded.

## Errors and cancellation

Stable errors are rooted at `SearchSuiteError`. Configuration, invalid engine, unsupported capability, and caller abort are core errors. Provider errors cover authentication, rate limit, quota exhaustion, invalid request, unavailable service, and timeout.

Provider errors carry provider, engine, HTTP status, retryable metadata, safe raw details, and a cause. v0.1 never acts on retryable metadata automatically.

Caller cancellation maps to `SearchAbortedError`; SDK timeout maps to `SearchTimeoutError`. The first signal to abort determines the public error.

## Security

Credentials, tokens, authentication headers, and credential-bearing URLs must not appear in errors, warnings, logs, causes exposed by public formatting, or raw data. The SDK emits no query or response-body logs by default.

## Testing and release

Core tests cover parsing, configuration, lazy loading, validation, warning behavior, cancellation, timeout, latency, and redaction. Each Provider receives injected-fetch tests for payloads, normalization, empty/malformed responses, limits, dates, errors, and secret handling.

One Contract suite runs against all five Providers. Compile-time tests verify engine-to-options inference. Live tests are explicitly enabled and credential-gated.

CI runs on Node.js 24 and Node Current. Release gates are typecheck, lint, tests, build, publint, declaration/package validation, and an ESM smoke test against `pnpm pack` output in a clean Node.js 24 environment.

## Future dsh use

`dsh-web-search` may later replace its duplicated search adapters with `searchsuite` while retaining its own settings UI, credentials overlay, provider selection, failover, `web_fetch`, status endpoints, and `WebError` mapping. That migration is outside v0.1 and creates no core dependency on dsh.

## Acceptance criteria

- The package installs and imports in a clean Node.js 24 ESM project.
- The public search API and engine-sensitive options typecheck as documented.
- All five Providers pass mapping and common Contract tests.
- Abort, timeout, Provider errors, and secrets behave consistently.
- The packed artifact contains working JavaScript, declarations, sourcemaps, and no runtime dependencies.
- No non-goal capability is introduced in v0.1.
