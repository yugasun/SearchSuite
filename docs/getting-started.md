# Getting started

SearchSuite requires Node.js 24 or newer and an ESM application. It does not
provide CommonJS or `require()` exports.

> **Pre-release status:** SearchSuite v0.1 is available for local evaluation but
> has not been published to npm. Build and install the repository tarball while
> the public API is being finalized.

## Build a local package

Clone the source, use the repository's pinned pnpm version through Corepack, and
create the same tarball shape that will eventually be published:

```sh
git clone https://github.com/yugasun/SearchSuite.git
cd SearchSuite
corepack enable
pnpm install --frozen-lockfile
pnpm build
pnpm pack --pack-destination .tmp
```

Install the tarball in a clean consumer project:

```sh
cd ..
mkdir searchsuite-consumer
cd searchsuite-consumer
npm init -y
npm install ../SearchSuite/.tmp/searchsuite-0.1.0.tgz
```

Use the filename printed by `pnpm pack` if the package version has changed.

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

Create `.env` in the repository or consumer project:

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

Create `app.mjs` in the clean consumer project. No constructor configuration is
needed when the matching environment variable is present:

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

## Tests: offline by default, live by request

The default test command runs mocked unit and common contract suites. It does not
make network requests or consume provider credits:

```sh
pnpm test
```

Live integration tests are separate, credential-gated, and may consume provider
credits. To run exactly one provider test with a local `.env` file:

```sh
node --env-file=.env node_modules/vitest/vitest.mjs run \
  test/integration/tavily.live.test.ts
```

Replace `tavily` with `baidu`, `doubao`, `exa`, or `serper`. A test is skipped
when none of its recognized credential variables is available. Use
`pnpm test:live` only when you intentionally want to exercise every configured
provider.

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
[development guide](development.md).
