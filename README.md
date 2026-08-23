# SearchSuite

[中文文档](README.zh-CN.md)

[![CI](https://github.com/yugasun/SearchSuite/actions/workflows/ci.yml/badge.svg)](https://github.com/yugasun/SearchSuite/actions/workflows/ci.yml)
![Node.js >=24](https://img.shields.io/badge/Node.js-%3E%3D24-339933?logo=node.js&logoColor=white)
![ESM only](https://img.shields.io/badge/modules-ESM--only-blue)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

One typed API for Baidu, Doubao, Tavily, Exa, and Serper search.

SearchSuite is a framework-independent TypeScript SDK. Choose a provider with
an engine such as `tavily:advanced`, then call the same API everywhere:

```ts
import { SearchSuite } from 'searchsuite'

const client = new SearchSuite()
const response = await client.search({
  engine: 'tavily:advanced',
  query: 'Recent advances in AI agent search',
  maxResults: 5,
})
```

## Highlights

- Engine-aware TypeScript inference for `providerOptions` and responses.
- Normalized results, usage, latency, warnings, and stable error classes.
- Native `fetch` and `AbortSignal`; ESM-only and zero runtime dependencies.
- Thin provider adapters with no hidden retries, fallback, routing, or caching.

## Requirements

- Node.js 24 or newer
- An ESM project; CommonJS and `require()` are not supported

## Installation

Install SearchSuite from npm:

```sh
npm install searchsuite
```

## Quick start

Set the provider credential in the server environment, then use the SDK:

```js
import { SearchSuite } from 'searchsuite'

// searchsuite reads the configured TAVILY_API_KEY
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

SearchSuite reads environment variables when a provider is first used. It does
not load `.env` files itself; use Node.js `--env-file=.env` or your deployment
environment. Never expose provider credentials in browser bundles or source
control.

## Providers

| Provider | Engines | Environment variable |
| --- | --- | --- |
| Baidu | `baidu:web`, `baidu:ai` | `BAIDU_API_KEY` or `QIANFAN_API_KEY` |
| Doubao | `doubao:custom`, `doubao:global` | `DOUBAO_API_KEY` or `DOUBAO_SEARCH_API_KEY` |
| Tavily | `tavily:basic`, `tavily:advanced`, `tavily:fast`, `tavily:ultra-fast` | `TAVILY_API_KEY` |
| Exa | `exa:auto`, `exa:keyword`, `exa:neural` | `EXA_API_KEY` |
| Serper | `serper:google` | `SERPER_API_KEY` |

Switching providers only requires changing `engine`:

```ts
const response = await client.search({
  engine: 'exa:auto',
  query: 'Recent advances in AI agent search',
})
```

Explicit provider configuration takes precedence over environment variables,
which take precedence over provider defaults. See the [provider guide](docs/providers.md)
for capabilities, limits, options, and normalized fields.

## Scope

v0.1 provides the framework-agnostic search SDK and five provider adapters. It
does not include routing, fallback, retries, multi-key selection, result
fusion, reranking, caching, Extract, Crawl, `web_fetch`, a gateway, SaaS
features, or a DeepSeek Harness plugin.

## Documentation

- [Getting started](docs/getting-started.md)
- [Providers and capability matrix](docs/providers.md)
- [API reference](docs/api-reference.md)
- [Development and release checks](docs/development.md)
- [Architecture](docs/architecture.md)
- [Roadmap](docs/roadmap.md)

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) for development and review guidelines,
[SUPPORT.md](SUPPORT.md) for questions and bug reports, and
[SECURITY.md](SECURITY.md) for private vulnerability reports. Do not include
API keys, authorization headers, `.env` files, or unredacted provider data in
issues or pull requests.

## License

SearchSuite is released under the [MIT License](LICENSE).
