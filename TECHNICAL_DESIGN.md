# SearchSuite 技术设计总览

状态：已实现（pre-release，尚未发布到 npm）

目标版本：v0.1.0

最后更新：2026-08-23

## 1. 问题与方案

搜索服务在参数、结果结构、认证、异常、能力和计费信息上均不一致。SearchSuite 在应用与 Provider 之间增加一个纯 TypeScript 兼容层，使开发者通过同一个 npm SDK 接入和切换搜索服务。

项目源于 `dsh-web-search` 的 DeepSeek Harness 插件实践，但核心 SDK 不依赖 dsh。未来 `dsh-web-search` 可以作为 SearchSuite 的消费者，继续独立维护 UI、credentials、auto/failover 和 `web_fetch`。

```text
Application / Agent / RAG / dsh-web-search
                     │
              SearchSuite.search()
                     │
       Parse / Normalize / Capability Policy
                     │
           Explicit Lazy Registry
                     │
 ┌──────────┬──────────┬──────────┬────────┬────────┐
 Baidu     Doubao     Tavily      Exa     Serper
                     │
              Native fetch API
```

v0.1 只实现统一 Search API 和五个 Provider Adapter。自动选择、fallback、retry、路由、搜索组合与框架插件均不在当前版本内。

## 2. v0.1 设计基线

| 主题 | 决策 |
| --- | --- |
| 产品定位 | “aisuite for Search” |
| 包名 | `searchsuite` |
| 语言 | TypeScript strict |
| 最低运行时 | Node.js 24 |
| 模块格式 | ESM only，`"type": "module"` |
| 主接口 | `await client.search({...})` |
| Provider 选择 | `<provider>:<engine>` |
| HTTP | Node 原生 `fetch` / `AbortSignal` |
| runtime dependency | 0 |
| 内置 Provider 发现 | 显式注册表 + 动态 import |
| Provider 独有参数 | engine 感知的 `providerOptions`，同时做运行时白名单校验 |
| 原始数据 | Response、Result、Usage、Error 可保留经清理的安全 `raw` |
| 默认兼容模式 | `warn`，通过 `onWarning` 输出 |
| dsh 集成 | 不进入 v0.1；核心保持框架无关 |

`package.json` 固定 `engines.node: ">=24"`，不使用会随时间变化的“当前 LTS”作为安装条件。

## 3. 公共 API

```ts
import { SearchSuite } from 'searchsuite'

const client = new SearchSuite({
  providers: {
    tavily: { apiKey: process.env.TAVILY_API_KEY },
    serper: { apiKey: process.env.SERPER_API_KEY },
  },
  timeoutMs: 30_000,
  unsupportedParamMode: 'warn',
  onWarning: (warning) => console.warn(warning),
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

TypeScript 根据 `engine` 字面量推导合法 `providerOptions` 与响应 engine 类型。SDK 只有异步 `search()`，不提供冗余 `asearch`，也不提供无资源可释放的 `close()`。

构造器默认值与约束：

- `timeoutMs` 默认 `30_000`，必须为正的有限数；
- `unsupportedParamMode` 默认 `warn`；
- `providers` 默认空配置，Provider 首次使用时再解析显式配置与环境变量；
- `fetch` 默认 `globalThis.fetch`，可注入用于测试或受控运行时；
- `onWarning` 默认不设置。

完整公共契约见 [API reference](docs/api-reference.md)。

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

不得在缺少真实需求、适配实现、mock contract 与类型测试时增加 speculative engine。

## 5. 实际代码结构

```text
src/
├── index.ts
├── client.ts
├── provider.ts
├── types.ts
├── capabilities.ts
├── errors.ts
├── registry.ts
├── warnings.ts
├── internal/
│   ├── engine.ts
│   ├── http.ts
│   ├── normalize.ts
│   ├── provider-utils.ts
│   ├── redact.ts
│   └── signal.ts
└── providers/
    ├── baidu.ts
    ├── doubao.ts
    ├── tavily.ts
    ├── exa.ts
    └── serper.ts

test/
├── helpers.ts
├── setup.ts
├── contract/
│   └── provider-contract.test.ts
├── fixtures/
│   ├── baidu.ts
│   ├── doubao.ts
│   ├── tavily.ts
│   ├── exa.ts
│   └── serper.ts
├── integration/
│   ├── baidu.live.test.ts
│   ├── doubao.live.test.ts
│   ├── tavily.live.test.ts
│   ├── exa.live.test.ts
│   ├── serper.live.test.ts
│   └── live-timeout.ts
├── typecheck/
│   └── consumer.ts
└── unit/
    ├── client.test.ts
    ├── engine.test.ts
    ├── errors.test.ts
    ├── http.test.ts
    ├── normalize.test.ts
    ├── redact.test.ts
    ├── registry.test.ts
    ├── signal.test.ts
    ├── types.test.ts
    └── providers/

examples/
├── basic-search.ts
├── switch-providers.ts
├── cancellation.ts
└── provider-options.ts
```

保持 Provider Adapter 精简。只有在至少三个 Provider 已证明存在相同需求时，才考虑抽取更复杂的共享 HTTP 抽象；当前共享层只包含小型、可测试的函数。

## 6. 请求处理链路

```text
SearchRequest<E>
    │ parse engine + combine caller/timeout signals
    ▼
explicit lazy provider factory (cached per provider)
    │ resolve config snapshot + expose capabilities
    ▼
NormalizedSearchRequest<E>
    │ normalize common input + capability policy
    ▼
provider adapter
    │ validate providerOptions + map request
    ▼
injected or global fetch
    │ map HTTP / abort / timeout errors
    ▼
provider response normalization + safe raw
    │ client measures monotonic latency
    ▼
SearchResponse<E>
```

职责边界：

- Client：公共编排、signal 组合、通用输入归一化、capability 策略、Provider 获取与端到端延迟；
- Registry：显式维护五个动态 import factory，按 Provider 缓存初始化 Promise，失败时清除缓存；
- Provider：解析配置、校验 engine/options、映射一次 Provider 请求、归一化响应与 Provider 限制 warning；
- Types：表达跨 Provider 可迁移概念，并提供 engine 级类型推导；
- Router（未来可选上层）：选择 Provider；不得渗入 Adapter 或改变核心单次请求语义。

v0.1 中每次 `search()` 最多发起一次上游 Provider 请求。engine、取消、配置、通用参数或 `providerOptions` 校验都可能在 `fetch` 前失败，此时上游请求数为零；不存在隐藏 retry、fallback 或多请求组合。

## 7. 关键契约

- engine 格式必须为 `<provider>:<engine>`，只按第一个冒号分隔；
- provider 名统一小写并由显式 Registry 验证，engine 由允许列表验证；
- `query.trim()` 不得为空；`maxResults` 默认 10，必须是正安全整数；
- domain 统一为小写 hostname、去重并移除尾部点，同一 domain 不得同时 include 与 exclude；
- `SearchResponse.answer` 只保存 Provider 明确返回的顶层答案，不从 snippets 拼接；
- 每个保留结果必须有非空 title 和绝对 HTTP(S) URL，缺标题时生成稳定 fallback；
- `score` 保留 Provider 本地语义，不做跨 Provider 标准化；
- `publishedAt` 只保存可靠解析后的 ISO 8601 string，原值可留在安全 `raw`；
- `raw` 使用 `unknown`，只保存 Adapter 选择的 JSON-compatible、经清理数据；
- Provider option 同时使用编译期类型与运行时白名单；
- v0.1 不自动 retry，错误上的 `retryable` 仅为元数据；
- 调用方取消产生 `SearchAbortedError`，SDK deadline 产生 `SearchTimeoutError`。

## 8. 配置、安全与网络

每个配置字段按以下优先级解析：

```text
显式 providers 配置 > 环境变量 > Provider 默认值
```

Provider factory 在该 Provider 首次初始化时解析配置，并由 Registry 缓存包含该配置快照的实例。之后修改环境变量或构造器配置对象不会影响已缓存实例；若初始化失败，Registry 会移除失败 Promise，使下一次搜索可以按当前配置重新初始化。SDK 本身不加载 `.env`；应用或 Node.js `--env-file` 负责把变量放入 `process.env`。

安全边界：

- 错误 message、URL、raw 与可序列化 metadata 清理已知 API key、token、secret 与 authorization 数据；
- SDK 不默认记录 query 或 response body；
- Provider option 使用运行时白名单；
- timeout 和调用方 signal 同时生效，先发生者决定错误类型；
- redaction 不能替代数据分级，应用在日志或转发 `raw` 前仍需复核。

## 9. 构建、测试与发布检查

项目使用 pnpm 10.32.1、TypeScript strict、tsdown、Vitest 与 Oxlint。

默认 `pnpm test` 只运行 `test/unit` 与 `test/contract`，不得访问网络或消耗 Provider credits。`pnpm test:live` 只用于显式、凭据门控的真实集成检查。构建输出为 Node.js 24 ESM、`.d.ts` 与 source map；发布包只包含 ESM、声明和必要元数据，不包含 source map，并保持零 runtime dependency。

当前 GitHub Actions 在 Node.js 24.x 与 Node Current 上实际执行：

1. `pnpm install --frozen-lockfile`
2. `pnpm typecheck`
3. `pnpm lint`
4. `pnpm test`
5. `pnpm build`
6. `pnpm exec publint`

CI 不运行 Live Test，也不创建 tarball。以下是发布前手工检查：

- `pnpm pack` 并检查 tarball 文件清单；
- 在干净 Node.js 24 ESM consumer 中安装 tarball 并导入；
- 在干净 TypeScript consumer 中验证声明路径与 engine/options 推导；
- 发布后从 npm registry 安装并验证实际产物。

详见 [Development](docs/development.md)。

## 10. v0.1 状态与完成定义

- [x] `searchsuite` 本地包可构建为 Node.js 24+ 纯 ESM 产物；
- [x] `SearchSuite.search()` 与 engine/options 类型推导已实现；
- [x] Baidu、Doubao、Tavily、Exa、Serper 通过显式 Registry 惰性加载；
- [x] 统一请求、answer、result、usage、capability、warning 与异常契约；
- [x] 支持显式配置、环境变量、注入 fetch 与 AbortSignal；
- [x] Response、Result、Usage 与 Error 可保留安全 `raw`；
- [x] Unit、Contract、类型与凭据门控 Live Test 已提供；
- [x] ESM、类型声明、source map 构建与 publint 检查已提供；
- [x] README、示例、能力矩阵与 MIT License 已提供；
- [x] 未包含 Router、retry、fallback、dsh plugin 等排除能力；
- [x] 完成公开文档与社区文件的最终复核；
- [x] 在干净 Node.js 24 环境完成 tarball ESM 与声明 smoke test；
- [x] 发布 `searchsuite` 到 npm，并验证 registry 安装产物。

因此当前状态是“本地实现完成、发布准备中”，不是已正式发布。

## 11. 变更控制

修改 engine 语法、公共类型、默认模式、取消语义或请求次数时，必须同步：

- 更新单元、contract 与类型测试；
- 更新本文件与对应公开指南；
- 更新 Provider 行为时同时更新 capability matrix 与回归 fixture。

本地规划、设计过程与架构决策笔记不纳入版本控制，也不作为公开契约来源。

## 12. 公开文档导航

- [Getting started](docs/getting-started.md)
- [Providers](docs/providers.md)
- [API reference](docs/api-reference.md)
- [Development](docs/development.md)
- [Architecture](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
- [Documentation index](docs/README.md)
