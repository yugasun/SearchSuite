# Architecture

SearchSuite is a framework-independent compatibility layer between an
application and several search providers. Its core owns a portable search
contract; each adapter owns only the translation for one provider.

```text
Application
    │ SearchSuite.search(request)
    ▼
Client: engine parsing and caller/timeout signal composition
    ▼
Explicit lazy registry: import, provider config snapshot, instance cache
    ▼
Client: normalize with provider capabilities, then apply capability policy
    ▼
Thin provider adapter: option validation and request/response mapping
    ▼
Native or injected fetch
    ▼
Normalized SearchResponse
```

## Request flow

1. `SearchSuite.search()` parses and validates the literal
   `provider:engine` value.
2. The client combines the caller's `AbortSignal` with its configured deadline.
3. The explicit registry dynamically imports the selected built-in provider and
   calls its factory. Provider configuration is resolved during this first
   initialization, and the registry caches the initialization promise.
4. The client checks cancellation again, then normalizes the query, result count,
   and domain lists using the initialized provider's capability declaration.
5. The client applies the selected capability policy to portable parameters.
6. The adapter validates engine-specific `providerOptions` at runtime.
7. The adapter maps one upstream request and sends it through native or injected
   `fetch` with the combined signal.
8. HTTP errors and aborts are mapped to the public error hierarchy.
9. The adapter converts valid upstream items to normalized results and preserves
   selected safe `raw` data.
10. The client attaches the normalized query and engine and records end-to-end
    monotonic latency.

There is at most one upstream provider request per `search()` call in v0.1.
Engine parsing, cancellation, provider configuration, common normalization, or
option validation can fail before `fetch`, producing zero upstream requests.
There are no hidden retries, fallback requests, or composition calls.

## Component responsibilities

### Client

[`src/client.ts`](../src/client.ts) owns public orchestration: engine parsing,
deadline/caller-signal composition, provider acquisition, common normalization,
capability policy, and latency measurement. It does not understand provider
payload formats and does not select a provider on the caller's behalf.

### Explicit lazy registry

[`src/registry.ts`](../src/registry.ts) contains an explicit factory for every
built-in provider. It uses dynamic imports so an adapter is loaded on first use,
not through directory scanning or eager imports. Initialization promises are
cached per provider. A rejected initialization is removed from the cache so a
later call can try configuration again.

The registry is intentionally closed over the v0.1 provider set. Adding a
provider is an explicit source and documentation change.

### Provider adapters

[`src/provider.ts`](../src/provider.ts) defines the internal adapter boundary.
Each file under `src/providers/` owns only its provider's:

- supported engines and capability declaration;
- configuration and runtime option validation;
- request URL, headers, and body mapping;
- response, answer, usage, and result normalization;
- provider-specific limits and warnings.

Adapters do not implement retries, fallback, routing, result fusion, caching, or
multi-key policy. Shared code remains small and functional: the HTTP boundary,
signal combination, request normalization, safe raw handling, and result helpers.

### Portable types

[`src/types.ts`](../src/types.ts) contains common concepts that apply across
providers and maps each engine literal to its typed `providerOptions`. Features
that cannot be expressed portably remain in provider options or safe `raw`
instead of expanding the common schema around one vendor.

## Configuration lifecycle

Provider configuration is resolved by the factory on the provider's first
initialization, using this field-level precedence:

```text
explicit providers configuration > environment variable > provider default
```

Explicit configuration may supply an API key or HTTP(S) base URL. Environment
variables supply credentials; adapters define default endpoints and any
documented provider default such as the Baidu AI model. Missing credentials and
invalid base URLs fail with `ConfigurationError` before an upstream request is
sent.

The cached provider retains this resolved configuration snapshot. Later changes
to the environment or constructor configuration object do not affect that
provider instance. If initialization rejects, the registry removes the rejected
promise, so a later search can initialize the provider again with current
configuration.

The SDK itself does not load `.env` files. Applications and local commands own
environment loading.

## Error and cancellation boundary

[`src/internal/http.ts`](../src/internal/http.ts) maps shared HTTP conditions to
the public error hierarchy. Adapters may add a more specific mapping only when
the provider supplies reliable semantics. Errors include structured metadata
and a `retryable` hint, but core code does not act on that hint.

[`src/internal/signal.ts`](../src/internal/signal.ts) combines the caller signal
and SDK timeout while retaining which source fired first. Caller cancellation
becomes `SearchAbortedError`; the SDK deadline becomes `SearchTimeoutError`.
Cleanup removes listeners and clears the timer after every request.

## Raw data and redaction boundary

Adapters choose which upstream response fragments may enter response-, result-,
usage-, or error-level `raw`. [`src/internal/redact.ts`](../src/internal/redact.ts)
recursively converts retained values to JSON-compatible data and redacts known
credential-shaped keys, bearer values, authorization data, and query secrets.

The boundary guarantees that credentials and authentication headers are not
intentionally preserved. It does not make arbitrary provider content safe to
publish: queries, documents, or an unrecognized sensitive field can still be
private application data.

## Runtime and dependency direction

The package targets Node.js 24+, uses TypeScript strict mode, publishes ESM only,
and relies on Web Platform `fetch`, `Response`, and `AbortSignal`. The v0.1
published package has zero runtime dependencies.

Dependencies flow inward:

```text
application / optional integration
              ↓
       SearchSuite public API
              ↓
 client + registry + portable contracts
              ↓
       one provider adapter
              ↓
        native fetch / provider API
```

SearchSuite core must not depend on DeepSeek Harness or another agent framework.
An integration may consume SearchSuite, but the dependency never points back
from the SDK.

## v0.1 boundaries

The following are deliberate non-goals:

- automatic retry, fallback, or provider selection;
- quota, cost, quality, or multi-key routing;
- caching, reranking, result fusion, or federated search;
- extract, crawl, or `web_fetch` APIs;
- a gateway, operational control plane, or SaaS service;
- framework-specific plugins.

Future operational or routing behavior must remain above the adapter core and
must not change a single-provider search into hidden multi-request behavior.
New public APIs or engines require demonstrated use cases, tests, documentation,
and explicit design review; this document does not reserve speculative APIs.
