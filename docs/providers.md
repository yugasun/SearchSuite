# Providers

SearchSuite v0.1 implements nine thin search Provider adapters and four content
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
| DeepSeek | `web` | Yes | `DEEPSEEK_API_KEY` | `https://api.deepseek.com` | 50 |
| Zhipu | `web` | Yes | `ZHIPU_API_KEY` | `https://open.bigmodel.cn/api` | 50 |
| Bocha | `web` | — | `BOCHA_API_KEY` | `https://api.bochaai.com` | 50 |
| Alibaba | `web` | — | `DASHSCOPE_API_KEY` | Required workspace origin | Local source cap |

Every provider accepts explicit `apiKey` and `baseUrl` configuration. Each field
is resolved independently: an explicit `apiKey` overrides the provider's
environment variables, while an explicit `baseUrl` overrides the default
endpoint. Omitting one field does not change how another field is resolved. The
only compatibility exception is Doubao: the exact legacy base URL
`https://ark.cn-beijing.volces.com/api/v3` is remapped to
`https://open.feedcoopapi.com`; any other valid explicit HTTP(S) base URL is used
as provided.

Alibaba is the exception to default endpoint resolution: configure its workspace
origin explicitly with `providers.alibaba.baseUrl` (see below).

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

## DeepSeek

Uses `deepseek:web` with `DEEPSEEK_API_KEY` and `https://api.deepseek.com`.
`maxResults` is capped at 50. Options are `needContent?: boolean`,
`originalQuestion?: string`, and `localization?: string`:

```ts
const response = await client.search({
  provider: 'deepseek',
  query: 'TypeScript search SDKs',
  maxResults: 5,
  providerOptions: { needContent: true, originalQuestion: 'Which SDK should I use?' },
})
```

This adapter uses the dedicated search capability; it does not generate a chat
answer. Search access must be enabled for the account; possession of a model API
key alone does not guarantee access.

## Zhipu

Uses `zhipu:web`, `ZHIPU_API_KEY`, and
`POST https://open.bigmodel.cn/api/paas/v4/web_search`.
`maxResults` is capped at 50. Options are `searchEngine` (default `search_std`;
accepted values: `search_std`, `search_pro`, `search_pro_sogou`, and
`search_pro_quark`), `contentSize?: 'medium' | 'high'`, and
`searchIntent?: boolean` (default false). The upstream documentation describes
medium content as the default; the adapter leaves `contentSize` unset unless
requested. With `search_pro_sogou`, requested counts from 10 through 49 are
rounded up to the next multiple of 10 (up to 50), then normalized results are
still limited to the requested `maxResults`.

```ts
const response = await client.search({
  provider: 'zhipu',
  query: 'Recent AI research',
  maxResults: 12,
  providerOptions: { searchEngine: 'search_pro_sogou' },
})
```

Search-engine availability depends on the upstream service and account. Common
domain filters and `timeRange` are not mapped; provider result scores are not
mapped. See the official [Web Search reference](https://docs.bigmodel.cn/api-reference/%E5%B7%A5%E5%85%B7-api/%E7%BD%91%E7%BB%9C%E6%90%9C%E7%B4%A2).

## Bocha

Uses `bocha:web`, `BOCHA_API_KEY`, and `POST https://api.bochaai.com/v1/web-search`.
`maxResults` is capped at 50. Options are `summary?: boolean` (adapter default
false) and `freshness?: string`. Accepted freshness values are `noLimit`,
`oneYear`, `oneMonth`, `oneWeek`, `oneDay`, a date (`YYYY-MM-DD`), or a date
range (`YYYY-MM-DD..YYYY-MM-DD`). Common `timeRange` values map to the matching
`oneDay`, `oneWeek`, `oneMonth`, or `oneYear` setting. An explicit `freshness`
option takes precedence over `timeRange`.

```ts
const response = await client.search({
  provider: 'bocha',
  query: 'Recent AI research',
  providerOptions: { summary: true, freshness: 'oneYear' },
})
```

`summary` requests per-result summaries; it does not produce a top-level
`answer`. Common domain filters are not mapped. See the
[official Bocha documentation](https://open.bochaai.com/).

## Alibaba

Uses `alibaba:web` and `DASHSCOPE_API_KEY`. Configure the origin for the region
hosting your Model Studio workspace explicitly:

```ts
const alibaba = new SearchSuite({
  providers: {
    alibaba: {
      apiKey: process.env.DASHSCOPE_API_KEY,
      baseUrl: 'https://dashscope.aliyuncs.com', // Supported legacy origin; workspace origin is recommended.
    },
  },
})
const response = await alibaba.search({
  provider: 'alibaba',
  query: 'Recent AI research',
  maxResults: 5,
  providerOptions: { model: 'qwen-plus' },
})
```

`model?: string` defaults to `qwen-plus`. This adapter calls native DashScope
model generation with web search enabled, `forced_search: true`, and
`enable_source: true`; it is not an OpenAI-compatible endpoint or a standalone
search-only API. The provider-generated answer becomes `answer` and search
sources become results. The chosen model and account must support web search.
`maxResults` caps normalized sources locally; it does not limit model output,
token use, upstream search activity, or billing. Model/token charges and search
charges may both apply. See the official
[Model Studio web search guide](https://help.aliyun.com/zh/model-studio/web-search).
Configure an origin without `/api/v1`; SearchSuite appends the native API path.
The legacy origin `https://dashscope.aliyuncs.com` remains supported. A recommended
workspace origin has the form `https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com`;
use the region and API key belonging to your workspace. No page content Fetch provider is added.

## DeepSeek page content

DeepSeek uses `POST https://api.deepseek.com/v1/tools/fetch` with `{ url }` and
`DEEPSEEK_API_KEY`. The URL must be HTTP(S), contain no credentials, and be at
most 8192 characters after URL normalization. The API returns a title and Markdown
content; SearchSuite maps content as text and preserves the requested URL. The
API exposes no options. See the official [Fetch API](https://api-docs.deepseek.com/api/fetch.md).
The upstream API does not report the target page's HTTP status or truncation;
`statusCode: 200` represents non-empty extracted content and `truncated: false`
means SearchSuite did not apply a local limit. Empty content maps to `502`.

## Zhipu page content

Zhipu uses `POST https://open.bigmodel.cn/api/paas/v4/reader` with
`ZHIPU_API_KEY`. Optional fields map to `timeout`, `no_cache`, `return_format`,
`retain_images`, `no_gfm`, `keep_img_data_url`, `with_images_summary`, and
`with_links_summary`:

```ts
const page = await client.fetch({
  provider: 'zhipu',
  url: 'https://example.com/article',
  providerOptions: { format: 'text', noCache: true },
})
```

`timeoutSeconds` is a positive safe integer in seconds; `format` accepts
`'markdown'` or `'text'`. The response content is text and the input URL is
preserved. The upstream response has no truncation indicator; `truncated: false`
means SearchSuite did not apply a local content limit, not that upstream content
is guaranteed complete. Bocha's public API documents search and rerank, while
Alibaba's Web Extractor is a model tool, not an independent content API; neither
is exposed through `client.fetch()`.

## Page content fetching

All four currently implement `client.fetch()`:

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

Tavily maps to Extract, Exa to Contents, DeepSeek to its Fetch tool, and Zhipu
to its Reader API. DSH direct HTTP fetch remains outside this SDK.

All fetch URLs are parsed and normalized as absolute HTTP(S) URLs before provider
initialization. DeepSeek and Zhipu reject URL credentials; DeepSeek also applies
the serialized URL length limit above. Provider option value errors use the
shared `Provider option` wording and retain the provider and `operation: 'fetch'`
metadata.

## Common capability matrix

| Common adapter capability | Baidu | Doubao | Tavily | Exa | Serper | DeepSeek | Zhipu | Bocha | Alibaba |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `includeDomains` | — | — | Yes | — | — | — | — | — | — |
| `excludeDomains` | — | — | Yes | — | — | — | — | — | — |
| `timeRange` | — | — | Yes | — | — | — | — | Yes | — |
| `content` capability flag | — | Yes | Yes | Yes | Yes | Yes | Yes | Yes | — |
| Provider score mapping | — | — | Yes | — | — | Yes | — | — | — |

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
