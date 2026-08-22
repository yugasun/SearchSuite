# SearchSuite 技术设计总览

状态：Approved for implementation

目标版本：v0.1.0

最后更新：2026-08-22

## 1. 问题与方案

搜索服务在参数、结果结构、认证、异常、能力和计费信息上均不一致。SearchSuite 在应用与 Provider 之间增加一个纯 TypeScript 兼容层，使开发者通过同一个 npm SDK 接入和切换搜索服务。

项目源于 `dsh-web-search` 的 DeepSeek Harness 插件实践，但核心 SDK 不依赖 dsh。未来 `dsh-web-search` 可以复用 SearchSuite 的 Provider 层，同时继续独立维护 UI、credentials、auto/failover 和 `web_fetch`。

```text
Application / Agent / RAG / dsh-web-search
                     │
              SearchSuite.search()
                     │
          Validate / Normalize / Warn
                     │
           Explicit Lazy Registry
                     │
 ┌──────────┬──────────┬──────────┬────────┬────────┐
 Baidu     Doubao     Tavily      Exa     Serper
                     │
              Native fetch API
```

v0.1 只实现统一 Search API 和 Provider Adapter。自动选择、fallback、retry、路由和搜索组合属于后续上层能力。

## 2. v0.1 设计基线

| 主题 | 决策 |
|---|---|
| 产品定位 | “aisuite for Search” |
| 包名 | `searchsuite` |
| 语言 | TypeScript strict |
| 最低运行时 | Node.js 24 LTS |
| 模块格式 | ESM only，`"type": "module"` |
| 主接口 | `await client.search({...})` |
| Provider 选择 | `<provider>:<engine>` |
| HTTP | Node 原生 `fetch` / `AbortSignal` |
| runtime dependency | 0 |
| 内置 Provider 发现 | 显式注册表 + 动态 import |
| Provider 独有参数 | engine 感知的 `providerOptions` |
| 原始数据 | Response、Result、Usage 均可保留安全 `raw` |
| 默认兼容模式 | `warn`，通过 `onWarning` 输出 |
| dsh 集成 | 不进入 v0.1；核心保持框架无关 |

Node.js 24 是本文档编写时的最新 LTS；`package.json` 固定 `engines.node: ">=24"`，而不是使用随时间变化的“当前 LTS”文字条件。参见 [Node.js Releases](https://nodejs.org/en/about/previous-releases)。

## 3. 目标 API

```ts
import { SearchSuite } from 'searchsuite'

const client = new SearchSuite({
  providers: {
    tavily: { apiKey: process.env.TAVILY_API_KEY },
    serper: { apiKey: process.env.SERPER_API_KEY },
  },
  timeoutMs: 30_000,
  unsupportedParamMode: 'warn',
  onWarning: (warning) => logger.warn(warning),
})

const response = await client.search({
  engine: 'tavily:advanced',
  query: 'Latest AI Agent research',
  maxResults: 10,
  includeDomains: ['arxiv.org'],
  timeRange: 'month',
  providerOptions: {
    includeAnswer: true,
    includeRawContent: 'markdown',
  },
  signal: AbortSignal.timeout(20_000),
})
```

TypeScript 根据 `engine` 推导合法 `providerOptions`。SDK 只有异步 API，不提供 `asearch` 别名，也不提供无资源可释放的 `close()`。

## 4. 首发 engine

```text
baidu:web
baidu:ai

doubao:custom
doubao:global

tavily:basic
tavily:advanced
tavily:fast
tavily:ultra-fast

exa:auto
exa:keyword
exa:neural

serper:google
```

这些 engine 来自现有 `dsh-web-search` 已验证的 API 模式。Serper News/Images、SearXNG 和其他 Provider 后续按真实需求增加。

## 5. 包结构

```text
src/
├── index.ts
├── client.ts
├── types.ts
├── capabilities.ts
├── config.ts
├── errors.ts
├── registry.ts
├── warnings.ts
├── internal/
│   ├── engine.ts
│   ├── http.ts
│   ├── normalize.ts
│   └── redact.ts
└── providers/
    ├── baidu.ts
    ├── doubao.ts
    ├── tavily.ts
    ├── exa.ts
    └── serper.ts

test/
├── contract/
├── integration/
└── unit/
    └── providers/

examples/
├── basic-search.ts
├── switch-providers.ts
├── cancellation.ts
└── provider-options.ts
```

不要在完成至少三个 Provider 前抽取复杂 HTTP 基类。可以共享小型纯函数，例如 JSON 解析、状态码映射和秘密清理。

## 6. 请求处理链路

```text
SearchRequest<E>
    │ parse engine + validate common fields
    ▼
NormalizedSearchRequest<E>
    │ capability / providerOptions validation
    ▼
lazy provider factory
    │ map provider request
    ▼
injected or global fetch
    │ map HTTP / abort / timeout error
    ▼
provider response normalization
    │ client measures monotonic latency
    ▼
SearchResponse<E>
```

职责：

- Client：公共校验、惰性缓存 Provider、兼容策略、组合 signal、测量端到端延迟。
- Registry：维护受支持 Provider 与动态 import factory。
- Provider：配置、engine/options 校验、请求映射、HTTP 调用、响应归一化、错误映射。
- Types：只表达跨 Provider 可迁移的搜索概念，并提供 engine 级类型推导。
- Router（未来）：选择 Provider；不得渗入 Adapter。

## 7. 关键契约

- engine 格式必须为 `<provider>:<engine>`，只按第一个冒号分隔。
- provider 名统一小写并由显式 Registry 验证；engine 由对应 Provider 验证。
- `query.trim()` 不得为空；`maxResults` 必须是正整数。
- `SearchResponse.answer` 保存 Provider 明确生成或返回的顶层答案；不存在时省略，不从 snippets 拼接伪造。
- 每个结果必须有非空 `title` 和绝对 HTTP(S) URL；缺标题时使用 hostname/URL 生成稳定 fallback。
- `score` 保留 Provider 本地语义，不做跨 Provider 标准化。
- `publishedAt` 是可靠解析后的 ISO 8601 string，否则省略并保留原值在 `raw`。
- `raw` 使用 `unknown`，只保存 JSON-compatible、安全清理后的数据。
- v0.1 不自动 retry。错误上的 `retryable` 只是元数据。
- 调用方取消产生 `SearchAbortedError`；SDK timeout 产生 `SearchTimeoutError`。

## 8. 配置、安全与网络

配置优先级：

```text
显式 providers 配置 > 环境变量 > Provider 默认值
```

Provider 在第一次使用时解析配置。支持注入 `fetch`，便于测试、代理和受控运行时；默认使用 `globalThis.fetch`。

安全基线：

- 错误、warning、`cause` 摘要、URL 和 `raw` 不得暴露 API Key、token 或认证 Header。
- SDK 不默认记录 query 或 response body。
- Provider option 使用类型与运行时白名单双重校验。
- timeout 和调用方 signal 都必须生效；先发生者决定取消原因。

## 9. 构建与测试

- pnpm 管理依赖。
- TypeScript strict + tsdown 构建 ESM、`.d.ts` 和 sourcemap。
- Vitest 覆盖 Core、Provider Mapping、Type Inference 和公共 Contract。
- Live Test 由 Provider 环境变量保护，默认跳过。
- CI 在 Node.js 24 和 Node Current 执行 typecheck、lint、test、build、publint、类型包检查和 pack smoke test。
- 发布包必须保持零 runtime dependency。

## 10. v0.1 完成定义

- [ ] `searchsuite` 可在 Node.js 24+ 纯 ESM 项目安装和导入
- [ ] `SearchSuite.search()` 与 engine/options 类型推导稳定
- [ ] 五个首发 Provider 可调用并惰性加载
- [ ] 统一请求、answer、results、usage、capability、warning 和异常契约
- [ ] 支持显式配置、环境变量、注入 fetch 与 AbortSignal
- [ ] Provider/Response/Result 的 safe raw 得到保留
- [ ] Unit、Contract、类型和可选 Live Test 完成
- [ ] `pnpm pack` 后在干净环境通过 ESM 与类型 smoke test
- [ ] README、示例、能力矩阵、CHANGELOG 与 MIT License 完成
- [ ] 不包含 v0.1 明确排除的 Router、dsh plugin 等能力

## 11. 文档导航

实现细节见 [docs/README.md](docs/README.md)，完整批准设计见 [TypeScript SDK Design](docs/superpowers/specs/2026-08-22-typescript-sdk-design.md)。
