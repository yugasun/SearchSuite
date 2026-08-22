# Changelog

## [Unreleased]

### Added

- Initial TypeScript ESM SDK design and implementation scaffolding.
- Unified async `SearchSuite.search()` API.
- Baidu, Doubao, Tavily, Exa, and Serper search adapters.
- Typed `provider:engine` requests, provider options, normalized responses, errors, cancellation, and contract tests.
- Offline `pnpm test` excludes credential-gated Live tests; run `pnpm test:live` explicitly.

### Known limitations

- v0.1 does not include dsh integration, `web_fetch`, Router, fallback, retry, caching, multi-key credentials, or search composition.
- Node.js 24+ and ESM-only are required.
