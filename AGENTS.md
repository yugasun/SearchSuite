# SearchSuite Engineering Rules

## Runtime and modules

- Target Node.js 24 or newer.
- The package is ESM-only and must keep `"type": "module"`.
- Use TypeScript strict mode and preserve accurate declaration output.
- Use native `fetch`, `AbortSignal`, and Web Platform types. The published package must have zero runtime dependencies in v0.1.
- Do not add CommonJS builds, `require` exports, or compatibility shims.

## Architecture

- Keep provider adapters thin.
- Provider adapters must not contain cross-provider routing logic.
- Do not add fallback, retries, quota routing, multi-key selection, cost routing, quality routing, result fusion, reranking, or caching in v0.1.
- Common types represent broadly portable search concepts only.
- Provider-specific features belong in typed `providerOptions`; provider data that cannot be normalized belongs in safe `raw`.
- Built-in providers use the explicit lazy registry. Do not add directory-scanning imports.
- Do not extract a complex shared HTTP base class before at least three providers demonstrate the same need.
- The core SDK must not depend on DeepSeek Harness or any other agent framework.

## Public API

- Public API stability and TypeScript inference matter more than internal abstraction elegance.
- Prefer `await client.search({ engine: 'provider:engine', ... })`.
- Do not add a redundant `asearch` alias; TypeScript search is asynchronous by default.
- All providers return `SearchResponse`; every normalized result has a non-empty title and absolute HTTP(S) URL.
- Provider scores keep provider-local semantics and must not be compared across providers by core code.
- Preserve JSON-compatible safe raw response data, but never preserve credentials or authentication headers.
- Use `SearchTimeoutError`, not a custom class named `TimeoutError`.
- Keep caller cancellation distinct from timeout by using `SearchAbortedError`.

## Providers

- v0.1 providers are Baidu, Doubao, Tavily, Exa, and Serper.
- v0.1 engines are documented in `TECHNICAL_DESIGN.md`; do not add speculative engines.
- Provider options require both compile-time types and runtime validation.
- Explicit provider config overrides environment variables, which override provider defaults.

## Testing

- Every provider requires mocked request, response, cancellation, and error mapping tests using injected fetch.
- Every provider must pass the common contract suite.
- Add type-inference tests when changing engines or `providerOptions`.
- Live integration tests are optional, explicitly marked, and credential-gated.
- Offline tests must not access the network or consume provider credits.
- Add regression fixtures before fixing provider compatibility bugs.
- Validate the packed ESM artifact and declarations in a clean Node.js 24 environment.

## Documentation

- Read `TECHNICAL_DESIGN.md` and the relevant file in `docs/` before changing public behavior.
- Update the provider capability matrix and relevant public documentation when provider behavior changes.
- Record changes to engine syntax, public types, default modes, cancellation semantics, or request-count behavior in `TECHNICAL_DESIGN.md` and the relevant public guide. Keep local ADR notes under the ignored `docs/adr/` directory rather than committing them.

## Scope

For v0.1, implement only the framework-agnostic `searchsuite` SDK and its five initial search providers. Do not implement a dsh plugin, `web_fetch`, Extract, Crawl, Router, operational layer, composition layer, gateway, or SaaS features.
