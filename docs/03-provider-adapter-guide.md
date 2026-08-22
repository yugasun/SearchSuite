# Provider Adapter 开发规范

状态：Approved for implementation

适用版本：v0.1.x

## 1. Adapter 职责

每个 Provider 只负责：

1. 解析并校验自身配置。
2. 校验 Provider engine 和 `providerOptions`。
3. 将 normalized common request 映射为远端请求。
4. 通过注入的原生 fetch 执行 HTTP 调用。
5. 将远端响应标准化为 `SearchResponse`。
6. 将 HTTP、网络、timeout 和响应错误映射为 SearchSuite 错误。
7. 声明 capabilities 并安全保留 raw。

Adapter 不得实现路由、fallback、retry、多 Key、缓存、跨 Provider 去重、融合或重排。

## 2. 命名与注册

| 元素 | 约定 | 示例 |
|---|---|---|
| Provider id | 小写标识符 | `doubao` |
| 模块 | `<provider>.ts` | `doubao.ts` |
| engine | `<provider>:<mode>` | `doubao:global` |
| 配置类型 | `<Provider>Config` | `DoubaoConfig` |
| options 类型 | `<Provider>SearchOptions` | `DoubaoSearchOptions` |
| 环境变量 | 大写 Provider 前缀 | `DOUBAO_API_KEY` |

新增内置 Provider 必须修改 `ProviderId`、`EngineMap`、options conditional type 和显式 Registry。禁止目录扫描。

## 3. 推荐模块结构

```ts
export interface ExampleConfig extends ProviderConfig {
  apiKey?: string
  baseUrl?: string
}

export interface ExampleSearchOptions {
  exampleOption?: boolean
}

export const capabilities = {
  includeDomains: false,
  excludeDomains: false,
  timeRange: false,
  content: true,
  score: false,
} satisfies ProviderCapabilities

export function createProvider(context: ProviderContext): SearchProvider {
  const config = resolveConfig(context)

  return {
    id: 'example',
    capabilities,
    async search(request) {
      const payload = buildPayload(request, config)
      const raw = await requestJson(context, payload)
      return normalizeResponse(request, raw)
    },
  }
}
```

`buildPayload`、`normalizeResponse` 和 Provider-specific error classification 应保持为可独立测试的纯函数。不要创建继承层级深的基类。

## 4. Engine 规范

v0.1 engine：

| Provider | Engine | 远端语义 |
|---|---|---|
| Baidu | `web` | Qianfan ordinary web search |
| Baidu | `ai` | Qianfan intelligent search generation |
| Doubao | `custom` | Doubao Search Custom |
| Doubao | `global` | Doubao Global Search |
| Tavily | `basic`, `advanced`, `fast`, `ultra-fast` | `search_depth` |
| Exa | `auto`, `keyword`, `neural` | Exa search `type` |
| Serper | `google` | Google Search `/search` |

engine 表达稳定的搜索模式或端点，不用于编码普通参数。新增 engine 必须有官方 API 依据、类型测试、runtime allowlist、Fixture 和文档。

## 5. 公共参数映射

| SearchSuite 字段 | Provider 要求 |
|---|---|
| `query` | 必须映射，不静默改变语义 |
| `maxResults` | 映射到远端上限；clamp/truncate 必须 warning 和测试 |
| `includeDomains` | 只有 capability 为 true 时映射 |
| `excludeDomains` | 只有 capability 为 true 时映射 |
| `timeRange` | 只有语义等价时映射，否则声明不支持 |
| `providerOptions` | allowlist 校验，不得覆盖已验证的公共字段 |
| `signal` | 必须传入 fetch 并与 SDK timeout 组合 |

不要用 `providerOptions` 绕过公共字段校验。若远端字段与 common param 冲突，common param 是唯一来源。

## 6. Provider options

每家 options 采用公开 interface，并在 Provider 中维护等价 runtime schema/allowlist。v0.1 不引入 Schema runtime dependency。

v0.1 options 固定为：

```ts
type NoProviderOptions = Record<string, never>

interface BaiduAiSearchOptions {
  model?: string
}

interface DoubaoCustomSearchOptions {
  needSummary?: boolean
}

interface DoubaoGlobalSearchOptions {
  maxSnippetLength?: number
}

interface TavilySearchOptions {
  topic?: 'general' | 'news' | 'finance'
  includeAnswer?: boolean | 'basic' | 'advanced'
  includeRawContent?: boolean | 'markdown' | 'text'
}

interface TavilyAdvancedSearchOptions extends TavilySearchOptions {
  chunksPerSource?: 1 | 2 | 3
}

interface ExaSearchOptions {
  highlightsPerUrl?: number
}

interface SerperSearchOptions {
  gl?: string
  hl?: string
}
```

engine 映射：`baidu:web` 使用 `NoProviderOptions`，`baidu:ai` 使用 `BaiduAiSearchOptions`；Doubao 两个 engine 使用各自 options；只有 `tavily:advanced` 接受 `chunksPerSource`；Exa 三个 engine 共用 Exa options；`serper:google` 使用 Serper options。

这些字段来自现有插件行为和已确认的 Tavily API。实现时若官方 API 已发生不兼容变化，必须先更新设计/ADR，而不是静默改变字段。

## 7. Response 归一化

- 保持远端结果顺序，不在 Adapter 内排序。
- 无 URL、非 HTTP(S) URL 或无法表示为搜索结果的块不进入 `results`，但可以保留在 response raw。
- 缺失 title 时使用 URL hostname；无法解析 hostname 时使用完整 URL。
- 顶层生成答案、answer box 或 knowledge graph 摘要进入 `SearchResponse.answer`。
- `snippet` 放搜索摘要/片段；`content` 只放单条结果明确提供的正文。
- score 原样保留数值，不截断、不标准化。
- 日期只有在可靠解析后输出 ISO 8601；失败不导致整个搜索失败。
- `SearchResponse.raw` 保存安全响应，`SearchResult.raw` 保存对应安全条目。
- 空结果是成功的 `results: []`，不是错误。

## 8. HTTP 与错误

Provider 使用共享的小型 `requestJson` helper，而不是复杂基类。helper 可负责：组合 signal、fetch 调用、响应大小保护、JSON 解析、常见状态码分类和秘密清理。Provider 仍负责解释自身错误 body 和配额语义。

每家必须覆盖：

- 缺失配置和非法 base URL
- 非法 engine、未知 option
- 401/403 认证语义
- 429 限流与可识别的 quota exhaustion
- 400/422 请求错误
- timeout、caller abort、DNS/连接失败
- 5xx、非 JSON、空 body、畸形 Schema

使用 `cause` 保留调试链，但公开错误格式不得泄露底层 Request/Header。

## 9. Raw 与秘密

可以保留 highlights、answer、sitelinks、knowledge graph、position、request id、usage 等 Provider 数据。

必须删除或遮盖：API Key、access token、Authorization/X-API-Key Header、带凭据 query string、远端回显的 credential 字段，以及底层错误对象中的完整请求。

raw 必须能 `structuredClone` 和 `JSON.stringify`。不要放入 `Response`、Headers、Error 实例或函数。

## 10. v0.1 能力矩阵

下表是实现基线；合并 Adapter 前以官方文档和 Live Test 复核。

| Provider | Include domains | Exclude domains | Time range | Content/answer | Score |
|---|---:|---:|---:|---:|---:|
| Baidu | 否 | 否 | 否 | `ai` 可有 answer | 否 |
| Doubao | 否 | 否 | 否 | snippet/summary | 否 |
| Tavily | 是 | 是 | 是 | 可选 | 是 |
| Exa | 否 | 否 | 否 | highlights | 否 |
| Serper | 否 | 否 | 否 | answer box/KG | 否 |

这是保守的 v0.1 公共能力承诺，不代表远端服务缺少对应功能。只有完成参数映射、Fixture 和 Contract Test 后才能在 minor 版本将 capability 改为 true。

## 11. 新增 Provider Checklist

- [ ] 确定 Provider id、engine、配置和官方文档
- [ ] 添加 EngineMap、options type、config type 和 Registry factory
- [ ] 声明经验证的 capabilities
- [ ] 实现配置、payload、fetch、response 和 error mapping
- [ ] 实现 runtime options allowlist
- [ ] 保留 JSON-compatible safe raw
- [ ] 添加类型测试与成功、空、缺失、异常 Fixture
- [ ] 通过公共 Contract Test
- [ ] 添加 credential-gated Live Test
- [ ] 更新能力矩阵、README、示例和 CHANGELOG
- [ ] 确认无路由、fallback、retry、缓存或 dsh 依赖

## 12. 外部参考

- [aisuite Provider 设计](https://github.com/andrewyng/aisuite)
- [Tavily Search API](https://docs.tavily.com/documentation/api-reference/endpoint/search)
- [现有 dsh-web-search](https://github.com/yugasun/dsh-plugins/tree/main/packages/dsh-web-search)

Baidu、Doubao、Exa、Serper 的准确官方文档链接在对应 Adapter 实现 PR 中补齐并记录复核日期。
