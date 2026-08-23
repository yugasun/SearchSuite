# SearchSuite

[中文文档](README.zh-CN.md)

[![CI](https://github.com/yugasun/SearchSuite/actions/workflows/ci.yml/badge.svg)](https://github.com/yugasun/SearchSuite/actions/workflows/ci.yml)
![Node.js >=24](https://img.shields.io/badge/Node.js-%3E%3D24-339933?logo=node.js&logoColor=white)
![ESM only](https://img.shields.io/badge/modules-ESM--only-blue)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

One typed API for Baidu, Doubao, Tavily, Exa, and Serper search.

SearchSuite is a framework-independent TypeScript SDK that normalizes the different APIs of web search providers behind `await client.search({ engine: 'provider:engine', ... })`. It originated from the provider layer of `dsh-web-search`, but the core SDK has no dependency on DeepSeek Harness or any other agent framework.

> **Status:** v0.1 is implemented and available for local evaluation, but is still pre-release and has not been published to npm. Public APIs may evolve before the first release.

## Why SearchSuite?

- **One typed API:** use the same request and response shape across five providers.
- **Engine-based switching:** select an implementation with literals such as `tavily:advanced` or `exa:auto`.
- **Engine-sensitive options:** TypeScript infers the valid `providerOptions` from the selected engine, with runtime validation at the provider boundary.
- **Portable results and errors:** receive normalized results, usage, latency, cancellation, timeout, and provider error metadata while retaining safe provider data in `raw`.
- **A small, independent core:** native `fetch`, ESM-only, zero runtime dependencies, and no agent-framework coupling.

## Requirements

- Node.js 24 or newer
- An ESM project; CommonJS and `require()` are not supported

SearchSuite ships TypeScript declarations and uses the Web Platform `fetch`, `AbortSignal`, and `AbortController` APIs provided by Node.js.

## Install from a local package

The package is not on npm yet. Clone the repository, build it, and create the same tarball that will eventually be published:

```sh
git clone https://github.com/yugasun/SearchSuite.git
cd SearchSuite
corepack enable
pnpm install --frozen-lockfile
pnpm build
pnpm pack --pack-destination .tmp
```

Install that tarball in a clean consumer project:

```sh
cd ..
mkdir searchsuite-consumer
cd searchsuite-consumer
npm init -y
npm install ../SearchSuite/.tmp/searchsuite-0.1.0.tgz
```

Keep the generated tarball path aligned with the version reported by `pnpm pack`.

## Quick start

Set the credential in the server process, then create `app.mjs`:

```sh
export TAVILY_API_KEY='your-api-key'
```

```js
import { SearchSuite } from 'searchsuite'

const client = new SearchSuite()

const response = await client.search({
  engine: 'tavily:advanced',
  query: 'Recent advances in AI agent search',
  maxResults: 5,
})

for (const result of response.results) {
  console.log(result.title, result.url)
}
```

```sh
node app.mjs
```

The SDK resolves `TAVILY_API_KEY` when the provider is first used. Keep provider credentials on the server; do not expose them in browser bundles or commit them to source control.

## Switch providers

Once the corresponding credential is available, changing providers only requires a different engine:

```js
const response = await client.search({
  engine: 'exa:auto',
  query: 'Recent advances in AI agent search',
  maxResults: 5,
})
```

## Supported providers

| Provider | Implemented engines | Credential environment variables |
| --- | --- | --- |
| Baidu | `baidu:web`, `baidu:ai` | `BAIDU_API_KEY` or `QIANFAN_API_KEY` |
| Doubao | `doubao:custom`, `doubao:global` | `DOUBAO_API_KEY` or `DOUBAO_SEARCH_API_KEY` |
| Tavily | `tavily:basic`, `tavily:advanced`, `tavily:fast`, `tavily:ultra-fast` | `TAVILY_API_KEY` |
| Exa | `exa:auto`, `exa:keyword`, `exa:neural` | `EXA_API_KEY` |
| Serper | `serper:google` | `SERPER_API_KEY` |

See the [provider guide and capability matrix](docs/providers.md) for common parameter support, limits, normalized fields, and provider-specific behavior. Scores retain provider-local semantics and must not be compared across providers.

## Configuration

Configuration is resolved in this order:

```text
explicit providers config > environment variables > provider defaults
```

Explicit configuration is useful for controlled server environments and compatible endpoints:

```js
const client = new SearchSuite({
  providers: {
    tavily: {
      apiKey: '<server-side-api-key>',
      baseUrl: 'https://api.tavily.com',
    },
  },
})
```

For local development, Node.js 24 can load a `.env` file without another package:

```dotenv
TAVILY_API_KEY=your-api-key
```

```sh
node --env-file=.env app.mjs
```

SearchSuite reads provider environment variables, but it does **not** discover or load `.env` files itself.

## Typed provider options

Provider-specific features stay under `providerOptions`. Their type is inferred from `engine` and the same allowlist is validated at runtime:

```ts
const response = await client.search({
  engine: 'tavily:advanced',
  query: 'Latest retrieval-augmented generation research',
  providerOptions: {
    topic: 'general',
    includeAnswer: 'advanced',
    includeRawContent: 'markdown',
    chunksPerSource: 2,
  },
})
```

For example, TypeScript rejects `chunksPerSource` for `tavily:basic` because that option belongs to the advanced engine.

## Errors, timeouts, and cancellation

`timeoutMs` is the SDK request deadline. A caller-provided `AbortSignal` remains a separate cancellation source:

```js
import {
  SearchAbortedError,
  SearchSuite,
  SearchSuiteError,
  SearchTimeoutError,
} from 'searchsuite'

const client = new SearchSuite({ timeoutMs: 30_000 })
const controller = new AbortController()
const cancellation = setTimeout(() => controller.abort(), 2_000)

try {
  const response = await client.search({
    engine: 'serper:google',
    query: 'Node.js ESM package design',
    signal: controller.signal,
  })
  console.log(response.results)
} catch (error) {
  if (error instanceof SearchTimeoutError) {
    console.error('The SearchSuite deadline expired')
  } else if (error instanceof SearchAbortedError) {
    console.error('The caller cancelled the search')
  } else if (error instanceof SearchSuiteError) {
    console.error(error.code, error.provider, error.retryable)
  } else {
    throw error
  }
} finally {
  clearTimeout(cancellation)
}
```

Provider failures are mapped to stable error classes with safe metadata. A `retryable` flag describes the failure; SearchSuite v0.1 does not automatically retry or fall back to another provider.

## v0.1 scope

SearchSuite v0.1 focuses on a unified search API and five thin provider adapters. It intentionally does not include:

- provider routing, fallback, retries, multi-key selection, quota or cost routing
- federated search, result fusion, reranking, or caching
- Extract, Crawl, or `web_fetch`
- a gateway, SaaS layer, or DeepSeek Harness plugin

These capabilities can be built above the SDK without coupling the provider compatibility layer to one orchestration model.

## Documentation

- [Documentation index](docs/README.md)
- [Getting started](docs/getting-started.md)
- [Providers and capability matrix](docs/providers.md)
- [API reference](docs/api-reference.md)
- [Development and testing](docs/development.md)
- [Architecture](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
- [Changelog](CHANGELOG.md)

The design baseline is recorded in [TECHNICAL_DESIGN.md](TECHNICAL_DESIGN.md).

## Contributing, support, and security

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing public API or provider behavior changes. For usage questions and bug-report guidance, see [SUPPORT.md](SUPPORT.md).

Please report vulnerabilities through the private process described in [SECURITY.md](SECURITY.md), and never include API keys, authorization headers, `.env` files, or unredacted provider responses in a public issue.

## License

SearchSuite is licensed under the [MIT License](LICENSE).
