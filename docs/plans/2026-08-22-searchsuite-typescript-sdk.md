# SearchSuite TypeScript SDK Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build the v0.1 `searchsuite` ESM-only TypeScript SDK for Baidu, Doubao, Tavily, Exa, and Serper.

**Architecture:** A single `SearchSuite` client validates typed `provider:engine` requests, lazily loads an explicit Provider registry, maps requests through thin HTTP adapters using native `fetch`, and returns JSON-friendly normalized responses. The package has no dsh dependency, no runtime dependency, one async `search()` API, injected fetch for tests, and explicit abort/timeout/error semantics.

**Tech Stack:** Node.js 24+, TypeScript strict, pnpm, tsdown, Vitest, native `fetch`/`AbortSignal`, ESM-only package exports.

---

## Milestone 0 — package and core contract

### Task 1: Create package and build configuration

**Objective:** Make the empty repository a buildable, testable, ESM-only TypeScript package.

**Files:** Create `package.json`, `pnpm-workspace.yaml`, `tsconfig.json`, `tsdown.config.ts`, `vitest.config.ts`, `.gitignore`, `src/index.ts`, and `test/setup.ts`.

**Implementation:** Configure package name `searchsuite`, `type: module`, `engines.node: >=24`, exports with only `types` and `import`, `sideEffects: false`, build/typecheck/test/lint scripts, and dev dependencies for TypeScript, tsdown, Vitest, and linting. Keep `dependencies` absent. Use `moduleResolution: Bundler`, `noEmit: true`, strict mode, and declaration output through tsdown.

**Verification:** Run `pnpm install`, `pnpm typecheck`, `pnpm build`, and `pnpm test -- --run`; expect an empty test suite and a `dist/` ESM artifact.

### Task 2: Add core type model and engine-sensitive options

**Objective:** Define public request, response, configuration, capability, warning, and Provider option types.

**Files:** Create `src/types.ts`, `src/capabilities.ts`; test `test/unit/types.test.ts`.

**TDD:** First add `expectTypeOf` and `@ts-expect-error` cases for `SearchEngine`, `SearchResponse.engine`, `tavily:advanced` `chunksPerSource`, and invalid options. Then implement `ProviderId`, `EngineMap`, template-literal `SearchEngine`, exact `ProviderOptionsFor<E>`, `SearchRequest<E>`, `SearchResult`, `SearchResponse` (including optional `answer`), `SearchUsage`, Provider config interfaces, `SearchSuiteOptions`, and `SearchWarning`.

**Verification:** `pnpm vitest run test/unit/types.test.ts` and `pnpm typecheck`.

### Task 3: Implement stable errors, redaction, and warning policy

**Objective:** Establish machine-readable errors and safe public metadata before Provider code exists.

**Files:** Create `src/errors.ts`, `src/internal/redact.ts`, `src/warnings.ts`; test `test/unit/errors.test.ts` and `test/unit/redact.test.ts`.

**TDD:** Cover error codes, `instanceof`, Provider/engine/status/retryable metadata, caller abort versus timeout, and removal of API keys from headers, URL query, and nested raw values. Implement `SearchSuiteError`, `ConfigurationError`, `InvalidEngineError`, `UnsupportedCapabilityError`, `SearchAbortedError`, `ProviderError` subclasses, stable codes, `SearchWarning`, and JSON-compatible redaction.

**Verification:** `pnpm vitest run test/unit/errors.test.ts test/unit/redact.test.ts`; secrets must never appear in message, serialized metadata, or safe raw output.

### Task 4: Implement engine parser, common validation, timeout, and HTTP helper

**Objective:** Normalize requests and provide a small fetch boundary shared by all adapters.

**Files:** Create `src/internal/engine.ts`, `src/internal/normalize.ts`, `src/internal/http.ts`, `src/internal/signal.ts`; test `test/unit/engine.test.ts`, `test/unit/normalize.test.ts`, `test/unit/http.test.ts`.

**Implementation:** Parse on the first colon, validate Provider and engine allowlists, normalize query/domains, reject invalid input, combine default timeout with caller signal without mutating it, call injected/global fetch, enforce JSON/status handling, and classify abort/network/HTTP errors without retries.

**Verification:** `pnpm vitest run test/unit/engine.test.ts test/unit/normalize.test.ts test/unit/http.test.ts`; pre-aborted requests must make no fetch call, and timeout/caller abort must map to distinct errors.

## Milestone 1 — Client and registry

### Task 5: Add explicit lazy Provider registry and Client

**Objective:** Connect public `SearchSuite.search()` to a lazy Provider factory and unified latency/warning policy.

**Files:** Create `src/provider.ts`, `src/registry.ts`, `src/client.ts`; modify `src/index.ts`; test `test/unit/registry.test.ts`, `test/unit/client.test.ts`.

**Implementation:** Define the internal Provider contract, static dynamic-import registry for five IDs, concurrent initialization promise cache, Provider config resolution, Client options, capability mode handling, warning callback, injected fetch context, monotonic `latencyMs`, and safe response handling. Add a FakeProvider test hook without making third-party registration public.

**Verification:** `pnpm vitest run test/unit/registry.test.ts test/unit/client.test.ts` and `pnpm typecheck`; one Provider instance must be created for concurrent calls.

### Task 6: Add public exports and examples

**Objective:** Make the public package easy to consume and typecheck in a consumer-like fixture.

**Files:** Modify `src/index.ts`; create `examples/basic-search.ts`, `examples/switch-providers.ts`, `examples/cancellation.ts`, `examples/provider-options.ts`, and `test/typecheck/consumer.ts`.

**Verification:** `pnpm typecheck` and `pnpm build`; examples import only from `searchsuite` and use ESM syntax.

## Milestone 2 — Provider adapters

### Task 7: Implement Tavily adapter as the reference Provider

**Objective:** Add the first real adapter and establish request/response/error mapping conventions.

**Files:** Create `src/providers/tavily.ts`, `test/fixtures/tavily.ts`, `test/unit/providers/tavily.test.ts`, `test/contract/provider-contract.test.ts`.

**Implementation:** Support four Tavily engines, typed topic/answer/raw-content/chunks options, domain/time mapping, result title/URL/snippet/date/score mapping, top-level answer, safe raw, and status/timeout/error classification.

**Verification:** `pnpm vitest run test/unit/providers/tavily.test.ts test/contract/provider-contract.test.ts`.

### Task 8: Implement Exa and Serper adapters

**Objective:** Validate the shared model against semantic search and SERP response shapes.

**Files:** Create `src/providers/exa.ts`, `src/providers/serper.ts`, fixtures under `test/fixtures/`, unit tests under `test/unit/providers/`; modify `test/contract/provider-contract.test.ts`.

**Implementation:** Support Exa `auto`/`keyword`/`neural` and `highlightsPerUrl`; support Serper `google` and `gl`/`hl`; map highlights, organic results, answer box, knowledge graph, dates, raw, limits, and errors.

**Verification:** Run the two Provider unit suites and the shared Contract suite; all three adapters must pass one runtime contract.

### Task 9: Implement Baidu and Doubao adapters

**Objective:** Cover Chinese Provider APIs and distinct ordinary/AI search modes.

**Files:** Create `src/providers/baidu.ts`, `src/providers/doubao.ts`, fixtures under `test/fixtures/`, unit tests under `test/unit/providers/`; modify the Contract suite.

**Implementation:** Support Baidu `web`/`ai`, explicit query/maxResults limits, AI model, answer/reference recovery, and safe raw. Support Doubao `custom`/`global`, summary/snippet options, limits, dates, URL/title fallback, and error classification.

**Verification:** `pnpm vitest run test/unit/providers/baidu.test.ts test/unit/providers/doubao.test.ts test/contract/provider-contract.test.ts`; five Providers must pass the common contract.

## Milestone 3 — quality and release

### Task 10: Add optional Live tests and release checks

**Objective:** Verify real endpoints without making paid network calls part of normal CI.

**Files:** Create five credential-gated files under `test/integration/`; modify `package.json`; create `.github/workflows/ci.yml`.

**Implementation:** Gate each Live test by its key/base URL, assert only the common contract, add pack/ESM/type smoke commands, and configure Node 24 + Current CI.

**Verification:** Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm exec publint`, and `pnpm pack --pack-destination .tmp`; offline tests pass with Live tests skipped.

### Task 11: Complete documentation and release metadata

**Objective:** Make implementation and package metadata match the approved docs.

**Files:** Modify `README.md`, `TECHNICAL_DESIGN.md`, `docs/03-provider-adapter-guide.md`, `docs/04-testing-and-release.md`; create `CHANGELOG.md` and `LICENSE`.

**Implementation:** Replace initial-design wording when code is ready, document five configurations/env variables and engines, record known limits, and verify package files contain only intended artifacts.

**Verification:** Run the complete v0.1 release checklist and inspect packed tarball contents.

## Review checklist

- [ ] No Provider imports dsh or another Provider.
- [ ] No runtime dependency or CommonJS export was introduced.
- [ ] All examples are pure ESM and typecheck on Node 24.
- [ ] Each Provider has request, response, error, cancellation, and redaction tests.
- [ ] Common Contract passes for all five Providers.
- [ ] Capability table stays conservative until a mapping is implemented.
- [ ] No Router, retry, fallback, cache, dsh plugin, `web_fetch`, or composition code entered v0.1.
