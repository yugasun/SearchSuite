# 产品定位与范围

状态：Approved for implementation

目标版本：v0.1.0

## 1. 背景与来源

AI Agent、Deep Research、RAG 和联网问答经常需要评估或接入多个搜索服务。Provider 在参数名、搜索模式、认证、响应结构、异常、正文、时间过滤和 usage 上缺少统一契约，使业务代码与具体 HTTP API 深度耦合。

SearchSuite 源于为 DeepSeek Harness 设计的 `dsh-web-search` 插件。该插件已经验证 Baidu、Doubao、Tavily、Exa 和 Serper 的接入，但 Provider 实现绑定在具体 Harness 内。SearchSuite 将搜索兼容层抽离为独立 TypeScript npm SDK，使 Agent、RAG、普通 Node 应用以及未来的 `dsh-web-search` 都能复用。

核心假设：

> 搜索 Provider 的高频能力可以形成稳定公共类型；剩余差异通过 engine 感知的 `providerOptions` 和安全 `raw` 保留，而不是削成最小公约数。

## 2. 产品定位

> A simple, unified TypeScript interface to multiple search providers.

核心价值：

- 应用开发者：通过一个 async API 接入和切换 Provider。
- TypeScript 开发者：获得 engine、options、response 与 error 的可靠类型推导。
- Agent/Harness 作者：获得框架无关、可取消、可注入网络实现的 Provider 层。
- Provider 贡献者：按明确 Contract 接入服务，不修改上层业务。
- 未来 Router：获得 capability、error 和 usage 元数据基础，但不污染 v0.1。

## 3. 目标用户与场景

### Agent / Harness 开发者

将 SearchSuite 包装为自身 Tool Schema。Harness 管理 UI、credentials、routing 和 Tool error；SearchSuite 只负责执行一个明确 engine 的搜索。

### RAG / Deep Research 开发者

在不同数据源间切换或比较，同时以统一结果消费 title、URL、snippet、content、score 和发布时间。

### Node.js 应用开发者

在纯 ESM 项目使用原生 Web API、AbortSignal 和严格类型，不额外安装每家 Provider SDK。

## 4. v0.1 目标

### 功能目标

- 发布纯 ESM npm 包 `searchsuite`，最低 Node.js 24。
- 提供 `await client.search({...})` 单一异步接口。
- 使用 `<provider>:<engine>` 选择 Baidu、Doubao、Tavily、Exa、Serper。
- 统一公共请求、顶层 answer、结果、usage、latency、warning、取消和错误。
- 根据 engine 推导 `providerOptions`，并在运行时等价校验。
- 支持显式 Provider 配置、环境变量和 BYOK。
- 使用原生 `fetch`，支持注入 fetch 和 AbortSignal。
- 提供能力声明、Unit、Contract、类型测试和可选 Live Test。

### 体验目标

- 改一个 engine 字符串即可切换 Provider。
- 非法 engine/options 在编译期尽可能报错，在运行时始终有明确错误。
- 缺少密钥、不支持公共参数、timeout、abort 和远端错误具有稳定语义。
- 发布包零 runtime dependency，不包含 dsh 或 Provider 官方 SDK。

## 5. v0.1 非目标

- dsh 插件、dsh UI、credentials overlay 或 `@deepseek-ai/*` 依赖
- `web_fetch`、Extract、Crawl、Research 或页面内容统一 API
- Provider 自动选择、fallback、round robin 或自动 retry
- 多账号、多 Key、Credential Pool、Vault
- quota/cost/quality-aware routing
- 联邦搜索、结果融合、去重、RRF、rerank
- 缓存、metrics/tracing/health 完整系统
- Browser、Deno、Bun 或 CommonJS 兼容承诺
- Dashboard、Gateway、SaaS、Multi-tenant、Billing

Provider Compatibility 与 Provider Selection 是不同层。v0.1 先稳定兼容层。

## 6. 首发范围

| Provider | v0.1 engine |
|---|---|
| Baidu | `web`, `ai` |
| Doubao | `custom`, `global` |
| Tavily | `basic`, `advanced`, `fast`, `ultra-fast` |
| Exa | `auto`, `keyword`, `neural` |
| Serper | `google` |

这组范围来自现有 `dsh-web-search` 已验证模式。SearXNG、Serper News/Images 等进入后续 roadmap。

## 7. 成功指标

- 五家 Provider 均通过公共 Contract Test。
- README 同一段消费代码可切换至少三家形态差异明显的 Provider。
- engine 对 `providerOptions` 的正确和错误用法都有类型测试。
- 离线测试零网络、零额度、可重复。
- 打包产物在干净 Node.js 24 ESM 项目成功导入、执行和获得类型提示。
- 错误、warning 和 raw 的密钥泄露测试覆盖五家认证方式。
- 基本结果展示不要求调用方读取 `raw`。

## 8. 兼容承诺

- Public export、engine、request/response 字段和 error code 遵循 Semantic Versioning。
- `providerOptions` 与 `raw` 由外部 API 决定，只承诺同一 Provider 内的版本兼容。
- score 不具备跨 Provider 可比性。
- 能力可能随服务端变化，能力表随 SearchSuite release 更新。
- Node 最低版本只在 major 版本或明确的 runtime policy 变更中提升。
