# Providers

SearchSuite v0.1 implements five thin search Provider adapters and two content
Provider adapters. Select a Provider by name; the operation (`search()` or
`fetch()`) determines the upstream request mapping. Provider-specific modes are
semantic `providerOptions`, not endpoint names.

## Quick reference

| Provider | Search defaults | Page content | Credential environment variables | Default base URL | `maxResults` limit |
| --- | --- | --- | --- | --- | --- |
| Baidu | `web` | — | `BAIDU_API_KEY`, then `QIANFAN_API_KEY` | `https://qianfan.baidubce.com` | web: 50; AI: 20 |
| Doubao | `custom` | — | `DOUBAO_API_KEY`, then `DOUBAO_SEARCH_API_KEY` | `https://open.feedcoopapi.com` | custom: 50; global: 20 |
| Tavily | `basic` | Yes | `TAVILY_API_KEY` | `https://api.tavily.com` | 20 |
| Exa | `auto` | Yes | `EXA_API_KEY` | `https://api.exa.ai` | 100 |
| Serper | `google` | — | `SERPER_API_KEY` | `https://google.serper.dev` | 100 |

Every provider accepts explicit `apiKey` and `baseUrl` configuration. Each field
is resolved independently: an explicit `apiKey` overrides the provider's
environment variables, while an explicit `baseUrl` overrides the default
endpoint. Omitting one field does not change how another field is resolved. The
only compatibility exception is Doubao: the exact legacy base URL
`https://ark.cn-beijing.volces.com/api/v3` is remapped to
`https://open.feedcoopapi.com`; any other valid explicit HTTP(S) base URL is used
as provided.

```ts
import { SearchSuite } from 'searchsuite'

const client = new SearchSuite({
  providers: {
    exa: {
      apiKey: '<server-side-api-key>',
      baseUrl: 'https://api.exa.ai',
    },
  },
})
```

The Provider examples below use this `client`; the relevant environment credential
must be present for any provider without an explicit key.

Unknown provider option keys and invalid provider option values are rejected both
by TypeScript for typed calls and at runtime for untyped input.

## Baidu

Provider options:

- `mode?: 'web'` selects ordinary web search; it is the default.
- `mode: 'ai'` selects AI search and enables `model?: string`.

The Provider-first `BaiduSearchOptions` type is discriminated the same way, so
an AI model cannot accidentally be sent to ordinary web search.

The query limit is 72 weighted units: ASCII code points count as one unit and
non-ASCII code points count as two. Longer queries are truncated and emit a
`PROVIDER_LIMIT` warning. `maxResults` is capped at 50 for web search and 20 for
AI search.

The default AI model is `ernie-4.5-turbo-32k`. A request-level
`providerOptions.model` overrides `providers.baidu.model`, which overrides
`BAIDU_MODEL`, which overrides the default:

```ts
const response = await client.search({
  provider: 'baidu',
  query: 'Explain Node.js ESM package exports',
  maxResults: 5,
  providerOptions: {
    mode: 'ai',
    model: 'ernie-4.5-turbo-32k',
  },
})
```

Credentials use `BAIDU_API_KEY` and then `QIANFAN_API_KEY`. Explicit
`providers.baidu.apiKey` and `providers.baidu.baseUrl` override credential lookup
and the default endpoint respectively.

When Baidu AI returns non-empty message content, SearchSuite exposes it as the
top-level `answer`. Baidu web does not fabricate an answer.

## Doubao

Provider modes and typed options:

- `mode?: 'custom'` (default: `custom`) enables `needSummary?: boolean`.
- `mode: 'global'` enables `maxSnippetLength?: number`.

The Provider-first `DoubaoSearchOptions` type is discriminated by mode, so
custom-only and global-only options cannot be mixed accidentally.

```ts
const custom = await client.search({
  provider: 'doubao',
  query: 'TypeScript search SDKs',
  providerOptions: { mode: 'custom', needSummary: true },
})

const global = await client.search({
  provider: 'doubao',
  query: 'TypeScript search SDKs',
  providerOptions: { mode: 'global', maxSnippetLength: 800 },
})
```

Queries are limited to 100 code-point units, with each character counting as one;
longer queries are truncated with a warning. `maxResults` is capped at 50 for
custom search and 20 for global search.

Credentials use `DOUBAO_API_KEY` and then `DOUBAO_SEARCH_API_KEY`. Explicit
`providers.doubao.apiKey` and `providers.doubao.baseUrl` override credential
lookup and the default endpoint respectively. For compatibility, the exact
legacy base URL `https://ark.cn-beijing.volces.com/api/v3` is remapped to
`https://open.feedcoopapi.com`; other valid explicit HTTP(S) base URLs are used
as provided. The adapter does not synthesize a top-level answer.

## Tavily

Provider options:

- `searchDepth?: 'basic' | 'advanced' | 'fast' | 'ultra-fast'` (default: `basic`).

All four Tavily search modes accept:

```ts
interface TavilySearchOptions {
  topic?: 'general' | 'news' | 'finance'
  includeAnswer?: boolean | 'basic' | 'advanced'
  includeRawContent?: boolean | 'markdown' | 'text'
}
```

Only `tavily:advanced` additionally accepts `chunksPerSource?: 1 | 2 | 3`:

```ts
const response = await client.search({
  provider: 'tavily',
  query: 'Recent retrieval-augmented generation research',
  maxResults: 10,
  includeDomains: ['arxiv.org'],
  excludeDomains: ['example.com'],
  timeRange: 'month',
  providerOptions: {
    searchDepth: 'advanced',
    topic: 'general',
    includeAnswer: 'advanced',
    includeRawContent: 'markdown',
    chunksPerSource: 2,
  },
})
```

`maxResults` is capped at 20. Credentials use `TAVILY_API_KEY`; explicit
`providers.tavily.apiKey` and `providers.tavily.baseUrl` override credential
lookup and the default endpoint respectively.

`includeAnswer` controls whether the request asks Tavily to generate an answer.
Independently of that request option, the adapter exposes any non-empty `answer`
returned by Tavily as the top-level `answer`. SearchSuite does not construct an
answer from result snippets.

## Exa

Provider options:

- `searchType?: 'auto' | 'keyword' | 'neural'` (default: `auto`).

Every Exa search mode accepts `highlightsPerUrl?: number`. The adapter floors the
value and uses at least one highlight per URL:

```ts
const response = await client.search({
  provider: 'exa',
  query: 'Search provider adapter architecture',
  maxResults: 10,
  providerOptions: {
    searchType: 'neural',
    highlightsPerUrl: 2,
  },
})
```

`maxResults` is capped at 100. Credentials use `EXA_API_KEY`; explicit
`providers.exa.apiKey` and `providers.exa.baseUrl` override credential lookup and
the default endpoint respectively. The adapter does not synthesize a top-level
answer.

## Serper

The default Serper search mode is `google`. It accepts `gl?: string` for country and
`hl?: string` for language:

```ts
const response = await client.search({
  provider: 'serper',
  query: 'Node.js TypeScript libraries',
  maxResults: 10,
  providerOptions: {
    gl: 'us',
    hl: 'en',
  },
})
```

`maxResults` is capped at 100. Credentials use `SERPER_API_KEY`; explicit
`providers.serper.apiKey` and `providers.serper.baseUrl` override credential
lookup and the default endpoint respectively.

A non-empty answer-box snippet is exposed as the top-level `answer`; otherwise a
non-empty knowledge-graph description is used. SearchSuite does not construct an
answer from organic snippets.

## Page content fetching

Only Tavily and Exa currently implement `client.fetch()`:

```ts
const tavilyPage = await client.fetch({
  provider: 'tavily',
  url: 'https://example.com/article',
  providerOptions: { extractDepth: 'advanced', format: 'markdown' },
})

const exaPage = await client.fetch({
  provider: 'exa',
  url: 'https://example.com/article',
  providerOptions: { maxCharacters: 100_000 },
})
```

Tavily maps to its Extract capability and Exa maps to Contents internally. The
caller chooses only `tavily` or `exa`; endpoint names are not part of the
public API. DSH's direct HTTP fetch remains outside this SDK and can still be
selected by an integration layer.

## Common capability matrix

| Common adapter capability | Baidu | Doubao | Tavily | Exa | Serper |
| --- | :---: | :---: | :---: | :---: | :---: |
| `includeDomains` | — | — | Yes | — | — |
| `excludeDomains` | — | — | Yes | — | — |
| `timeRange` | — | — | Yes | — | — |
| `content` capability flag | — | Yes | Yes | Yes | Yes |
| Provider score mapping | — | — | Yes | — | — |

A capability means that the current SearchSuite adapter maps the common contract
for that provider. It is not a claim about every feature available in the
upstream provider API. The `content` row reports the adapter-declared common
capability flag; individual adapters may still map ordinary result snippets when
that flag is false.

Unsupported common parameters follow `unsupportedParamMode`, which defaults to
`'warn'`:

- `'strict'` throws `UnsupportedCapabilityError`.
- `'warn'` emits an `UNSUPPORTED_CAPABILITY` warning through `onWarning` and
  removes the parameter before the provider request.
- `'ignore'` silently removes the unsupported parameter.

## Limits, warnings, and normalized output

When `maxResults` exceeds an adapter limit, SearchSuite clamps it and emits a
`PROVIDER_LIMIT` warning through `onWarning`. Baidu and Doubao also warn when they
truncate overlong queries. These limit warnings are independent of
`unsupportedParamMode`.

All adapters return the same `SearchResponse` contract:

- Every retained result has a non-empty title and an absolute HTTP(S) URL. Items
  without a valid absolute URL are discarded; missing titles receive a stable URL
  hostname fallback.
- Parseable provider dates become ISO 8601 `publishedAt` strings. Unparseable
  values are omitted from normalized fields and may remain in safe `raw`.
- `score`, when present, retains provider-local semantics. Core code does not
  compare or normalize scores across providers.
- JSON-compatible provider data may be preserved in response, result, or usage
  `raw` after credential redaction. Authentication headers and credentials must
  never be copied into `raw`.
- `answer` is present only when the provider explicitly returns one through the
  mappings documented above; snippets are never fused into an answer.

SearchSuite v0.1 does not route between providers, retry requests, fall back to a
second provider, or merge results. See the [API reference](api-reference.md) for
the full common contract and [Getting started](getting-started.md) for local and
live-test setup.
