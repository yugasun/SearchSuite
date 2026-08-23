# Getting started

SearchSuite requires Node.js 24 or newer and an ESM application. It does not
provide CommonJS or `require()` exports.

> **Pre-release status:** SearchSuite v0.1 is being prepared for its first npm
> release. Once published, install it with `npm install searchsuite`.

## Installation

```sh
npm install searchsuite
```

## Configure a provider

SearchSuite resolves credentials when a provider is first used:

| Provider | Environment variables, in lookup order |
| --- | --- |
| Baidu | `BAIDU_API_KEY`, `QIANFAN_API_KEY` |
| Doubao | `DOUBAO_API_KEY`, `DOUBAO_SEARCH_API_KEY` |
| Tavily | `TAVILY_API_KEY` |
| Exa | `EXA_API_KEY` |
| Serper | `SERPER_API_KEY` |

Configuration is resolved independently for each field:

```text
explicit provider configuration > corresponding environment variable > provider default
```

For example, an explicit `providers.tavily.apiKey` overrides
`TAVILY_API_KEY`, while omitting `providers.tavily.baseUrl` still selects the
Tavily default endpoint:

```js
import { SearchSuite } from 'searchsuite'

const client = new SearchSuite({
  providers: {
    tavily: {
      apiKey: '<server-side-api-key>',
      baseUrl: 'https://api.tavily.com',
    },
  },
})
```

Every provider accepts explicit `apiKey` and `baseUrl` fields. Doubao remaps one
exact legacy Ark endpoint for compatibility; Baidu also accepts an explicit
default `model`. See the [provider guide](providers.md) for those provider-specific
details.

## Use a `.env` file locally

Create `.env` in your application project:

```dotenv
TAVILY_API_KEY=your-api-key
```

Node.js 24 can load it without adding a dependency:

```sh
node --env-file=.env app.mjs
```

SearchSuite reads provider environment variables from `process.env`, but it does
**not** find or load `.env` files itself. Keep `.env` ignored by Git.

## Run the first search

Create `app.mjs` in your project. No constructor configuration is needed when
the matching environment variable is present:

```js
import { SearchSuite } from 'searchsuite'

const client = new SearchSuite()

const response = await client.search({
  engine: 'tavily:basic',
  query: 'Node.js ESM package design',
  maxResults: 5,
})

console.log(`Completed in ${response.latencyMs} ms`)
for (const result of response.results) {
  console.log(result.title, result.url)
}
```

Run it with either an exported environment variable or the `.env` file:

```sh
node --env-file=.env app.mjs
```

The same request shape works with any implemented engine once its credential is
available. See [Providers](providers.md) for exact engine literals and typed
`providerOptions`.

## Troubleshooting

- `ConfigurationError`: the selected provider has no usable API key, or its
  explicit `baseUrl` is not a valid HTTP(S) URL. Check the provider's recognized
  environment variable and the field-level precedence above.
- `AuthenticationError`: the upstream service returned HTTP 401 or 403. Verify
  the key, account permissions, and access to the selected product or engine.
- `RateLimitError`: the upstream service returned HTTP 429. SearchSuite marks the
  error retryable but v0.1 does not retry automatically; wait or manage the
  provider limit in application code.
- `SearchTimeoutError`: the SDK deadline expired or the provider returned HTTP
  408. Increase `new SearchSuite({ timeoutMs: ... })` only after checking network
  and provider latency. The default SDK deadline is 30 seconds.

Errors expose safe metadata such as `code`, `provider`, `engine`, `statusCode`,
and `retryable`. Do not publish full upstream payloads without reviewing them.

## Credential safety

- Store keys in server-side environment variables or a secret manager.
- Never commit `.env`, paste credentials into examples, or send them to a browser
  bundle.
- Remove authorization headers and keys before sharing logs or provider fixtures.
- Treat `raw` as sensitive application data even though SearchSuite redacts known
  credential fields.

Continue with the [API reference](api-reference.md) or the
[provider guide](providers.md). Contributors should continue with the
[development guide](development.md).
