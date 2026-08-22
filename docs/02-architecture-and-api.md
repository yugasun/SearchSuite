# 架构与公共 API

状态：Approved for implementation

适用版本：v0.1.x

## 1. 分层与依赖方向

```text
Public API: SearchSuite + Types + Errors
                    │
       Parse / Validate / Capability
                    │
          Explicit Lazy Registry
                    │
           SearchProvider Contract
                    │
             Thin Adapters
                    │
        injected fetch / global fetch
```

依赖只能自上而下。Client 不依赖具体 Provider 模块；Provider 不调用其他 Provider；整个包不依赖 dsh 或官方 Provider SDK。

## 2. Package exports

根入口只导出稳定对象和类型：

```ts
export { SearchSuite } from './client.js'
export {
  AuthenticationError,
  ConfigurationError,
  InvalidEngineError,
  InvalidRequestError,
  ProviderError,
  ProviderUnavailableError,
  QuotaExceededError,
  RateLimitError,
  SearchAbortedError,
  SearchSuiteError,
  SearchTimeoutError,
  UnsupportedCapabilityError,
} from './errors.js'
export type {
  ProviderConfigMap,
  ProviderId,
  ProviderOptionsFor,
  SearchEngine,
  SearchRequest,
  SearchResponse,
  SearchResult,
  SearchSuiteOptions,
  SearchUsage,
  SearchWarning,
} from './types.js'
```

v0.1 不公开 Provider 内部类、不提供深层文件路径 import，也不承诺第三方 Provider 注册 API。

## 3. SearchSuite Client

```ts
export interface SearchSuiteOptions {
  providers?: ProviderConfigMap
  timeoutMs?: number
  unsupportedParamMode?: 'strict' | 'warn' | 'ignore'
  onWarning?: (warning: SearchWarning) => void
  fetch?: typeof globalThis.fetch
}

export class SearchSuite {
  constructor(options?: SearchSuiteOptions)

  search<E extends SearchEngine>(
    request: SearchRequest<E>,
  ): Promise<SearchResponse<E>>
}
```

要求：

- `options` 与 Provider config 在构造时浅复制并冻结顶层视图。
- Provider 第一次使用时动态 import、解析配置并缓存实例。
- `search()` 永远异步；不提供 `asearch`。
- Client 不持有需要关闭的 transport，不提供 `close()`。
- 注入 fetch 时保持与 `globalThis.fetch` 相同签名和 `this` 无关调用方式。
- 同一个 Client 可并发搜索；惰性创建同一 Provider 必须复用同一初始化 Promise，避免竞态重复初始化。

## 4. Engine 与类型推导

```ts
export type ProviderId = 'baidu' | 'doubao' | 'tavily' | 'exa' | 'serper'

export interface EngineMap {
  baidu: 'web' | 'ai'
  doubao: 'custom' | 'global'
  tavily: 'basic' | 'advanced' | 'fast' | 'ultra-fast'
  exa: 'auto' | 'keyword' | 'neural'
  serper: 'google'
}

export type SearchEngine = {
  [P in ProviderId]: `${P}:${EngineMap[P]}`
}[ProviderId]

export type NoProviderOptions = Record<string, never>

export type ProviderOptionsFor<E extends SearchEngine> =
  E extends 'baidu:web' ? NoProviderOptions
    : E extends 'baidu:ai' ? BaiduAiSearchOptions
      : E extends 'doubao:custom' ? DoubaoCustomSearchOptions
        : E extends 'doubao:global' ? DoubaoGlobalSearchOptions
          : E extends 'tavily:advanced' ? TavilyAdvancedSearchOptions
            : E extends `tavily:${string}` ? TavilySearchOptions
              : E extends `exa:${string}` ? ExaSearchOptions
                : E extends 'serper:google' ? SerperSearchOptions
                  : never
```

运行时解析只按第一个冒号分隔。provider 规范为小写 ASCII 标识符，engine 必须存在于对应 Provider 的 allowlist。动态 string 在编译期可能需要显式缩窄，但运行时仍完整校验。

## 5. Request 类型

```ts
export interface SearchRequest<E extends SearchEngine = SearchEngine> {
  engine: E
  query: string
  maxResults?: number
  includeDomains?: readonly string[]
  excludeDomains?: readonly string[]
  timeRange?: 'day' | 'week' | 'month' | 'year'
  providerOptions?: ProviderOptionsFor<E>
  signal?: AbortSignal
}
```

公共校验：

- `query.trim()` 不得为空；传给 Provider 的 normalized query 去除首尾空白。
- `maxResults` 必须是有限正整数；Provider 上限在 Adapter 层处理并 warning。
- domain 去空白、转小写、去协议和尾部点后去重；路径或 wildcard 是否允许由 Provider capability 决定。
- `includeDomains` 与 `excludeDomains` 冲突项是 `InvalidRequestError`。
- `timeRange` 只表达四种可移植相对时间；其他日期能力进入 Provider options。
- 输入 readonly array 必须复制，调用期间不受调用方修改影响。

## 6. Response 类型

```ts
export interface SearchResult {
  title: string
  url: string
  snippet?: string
  content?: string
  score?: number
  publishedAt?: string
  raw?: unknown
}

export interface SearchUsage {
  requests?: number
  credits?: number
  raw?: unknown
}

export interface SearchResponse<E extends SearchEngine = SearchEngine> {
  query: string
  engine: E
  answer?: string
  results: SearchResult[]
  usage?: SearchUsage
  latencyMs: number
  raw?: unknown
}
```

字段契约：

| 字段 | 契约 |
|---|---|
| `query` | normalized query |
| `engine` | 已验证的完整 engine，保留泛型字面量 |
| `answer` | Provider 明确返回的顶层答案；不从结果片段人工拼接 |
| `title` | 非空；远端缺失时由 hostname/URL 生成稳定 fallback |
| `url` | 绝对 `http:` 或 `https:` URL；其他协议不进入 results |
| `snippet` | 搜索摘要或命中片段 |
| `content` | 单条结果明确提供的长内容，不与顶层 answer 混用 |
| `score` | Provider 本地数值，不标准化 |
| `publishedAt` | 可验证的 ISO 8601 string，否则省略 |
| `usage` | 远端未返回时省略，不推测 credits |
| `latencyMs` | `performance.now()` 测得的 Client 端到端毫秒数 |
| `raw` | JSON-compatible、已清理秘密的 `unknown` |

## 7. Provider Contract 与 Registry

```ts
interface SearchProvider<E extends SearchEngine = SearchEngine> {
  readonly id: ProviderId
  readonly capabilities: ProviderCapabilities
  search(request: NormalizedSearchRequest<E>): Promise<SearchResponse<E>>
}

type ProviderFactory = (
  context: ProviderContext,
) => Promise<SearchProvider> | SearchProvider
```

内置 Registry 使用静态 key 和动态 import：

```ts
const builtInProviders = {
  baidu: () => import('./providers/baidu.js'),
  doubao: () => import('./providers/doubao.js'),
  tavily: () => import('./providers/tavily.js'),
  exa: () => import('./providers/exa.js'),
  serper: () => import('./providers/serper.js'),
} satisfies Record<ProviderId, () => Promise<ProviderModule>>
```

字符串 import path 不暴露给用户，目录扫描和任意 module loading 禁止。

## 8. Capability 与兼容策略

```ts
export interface ProviderCapabilities {
  includeDomains: boolean
  excludeDomains: boolean
  timeRange: boolean
  content: boolean
  score: boolean
}
```

只有调用方传入非空公共字段时才检查 capability：

| 模式 | 不支持的公共参数 |
|---|---|
| `strict` | 抛出 `UnsupportedCapabilityError` |
| `warn` | 调用 `onWarning` 后丢弃 |
| `ignore` | 静默丢弃 |

默认 `warn`。SDK 不调用 `console.warn`；未传 `onWarning` 时 warning 被安全忽略。Provider options 由 TypeScript 类型和 Adapter allowlist 双重验证，未知字段抛 `InvalidRequestError`。

## 9. 配置模型

```ts
export interface ProviderConfig {
  apiKey?: string
  baseUrl?: string
}

export interface ProviderConfigMap {
  baidu?: BaiduConfig
  doubao?: DoubaoConfig
  tavily?: TavilyConfig
  exa?: ExaConfig
  serper?: SerperConfig
}
```

配置优先级：显式值 > Provider 环境变量 > 默认值。空字符串视为未配置。Provider 首次使用时解析一次；缺少密钥抛 `ConfigurationError`。base URL 必须是 HTTP(S)，尾部 slash 在内部规范化。

## 10. Timeout 与取消

Client 将默认 `timeoutMs` 与调用方 signal 组合；不修改调用方 signal。先 abort 的来源决定错误：

- 调用方 signal：`SearchAbortedError`，`retryable=false`。
- SDK timeout：`SearchTimeoutError`，`retryable=true`。
- Provider/网络抛出的 abort-like error 必须结合 signal 状态判断，不能只依赖浏览器式异常名称。

如果 request 开始前 signal 已 abort，不初始化 Provider、不发网络请求并立即失败。

## 11. 异常体系

```text
SearchSuiteError
├── ConfigurationError
├── InvalidEngineError
├── UnsupportedCapabilityError
├── SearchAbortedError
└── ProviderError
    ├── AuthenticationError
    ├── RateLimitError
    ├── QuotaExceededError
    ├── InvalidRequestError
    ├── ProviderUnavailableError
    └── SearchTimeoutError
```

每个错误有稳定 `code`。Provider Error 带 `provider`、`engine`、`statusCode`、`retryable`、安全 `raw` 和标准 `cause`。v0.1 不自动使用 `retryable` 执行重试。

推荐映射：

| 情况 | 错误 | retryable |
|---|---|---:|
| 缺少/无效凭据 | `AuthenticationError` 或本地 `ConfigurationError` | false |
| 429 短期限流 | `RateLimitError` | true |
| 明确配额耗尽 | `QuotaExceededError` | false，除非有可靠 reset |
| 400/422 | `InvalidRequestError` | false |
| SDK timeout | `SearchTimeoutError` | true |
| 5xx、DNS、连接失败 | `ProviderUnavailableError` | true |
| 畸形/不兼容响应 | `ProviderUnavailableError` | false |

## 12. 安全和序列化

- 禁止在错误、warning、raw 或公开格式化的 cause 中包含认证 Header、token 和凭据 URL。
- 只提取 JSON-compatible 原始字段；不直接暴露 `Response`、Request 或任意 SDK 对象。
- SDK 默认不记录 query、payload 或 response body。
- Redaction helper 必须处理大小写不敏感 Header、常见 key 字段和 URL query。
- Response 应能通过 `structuredClone` 与 `JSON.stringify`；`undefined` 字段自然省略。

## 13. API 变更控制

以下变化需要新 ADR 和符合 SemVer 的版本：engine 增删/改义、公共字段语义、默认兼容模式、取消/timeout 行为、第三方 Provider 扩展机制，以及会改变请求次数的 retry/fallback。
