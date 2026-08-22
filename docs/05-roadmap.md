# 路线图与任务拆分

状态：Approved for implementation

目标版本：v0.1.0

## 推进原则

- 每个 Milestone 形成可运行、可 typecheck、可测试的增量。
- 共享类型修改必须由至少两个形态不同的 Provider 证明。
- Provider 特有字段优先进入 typed `providerOptions` 和 `raw`。
- 三个 Provider 前不抽取复杂 HTTP 基类。
- dsh 集成、Router 和 Operational Layer 进入 backlog，不阻塞核心 SDK。

## Milestone 0：工程骨架与类型契约

目标：用 FakeProvider 跑通完整 async 链路，不接真实服务。

任务：

- 初始化 pnpm、package.json、TypeScript strict、tsdown、Vitest 和 lint。
- 配置 Node.js `>=24`、纯 ESM exports、零 runtime dependency 门禁。
- 实现 SearchEngine、request/response、usage、warning、error 类型。
- 实现 engine parser、公共校验、capability policy 和 redaction。
- 实现显式 lazy Registry、Client、fetch 注入、timeout/abort 组合。
- 添加 FakeProvider、Core Unit、Type Test 和初版 Contract Test。
- 建立 Node 24/Current CI。

退出条件：

- FakeProvider 下 `search()`、并发初始化、abort 和 timeout 全链路通过。
- engine/options 正反类型用例通过。
- `pnpm pack` 产物在干净 ESM consumer 可导入。

## Milestone 1：Tavily 参考 Adapter

目标：建立其他 Provider 可复制的 Adapter Pattern。

任务：

- 复核 Tavily 官方 API、认证、search depth、能力和错误。
- 实现 config、四个 engine、typed options、payload/response/error mapping。
- 保留 answer、raw content、score、usage 等安全 raw。
- 添加 injected-fetch Mapping、Contract 和 key-gated Live Test。
- 更新能力矩阵和示例。

退出条件：单一 async Contract、abort/timeout 和密钥保护全部通过。

## Milestone 2：Exa + Serper

目标：用语义搜索和 SERP 形态验证公共类型。

任务：

- 复核 Exa `auto/keyword/neural` 与 Serper `google` 官方契约。
- 实现 config、options 和完整映射测试。
- 评审 highlights/content/score 与 organic/answer box/knowledge graph 映射。
- 冻结 v0.1 `SearchResult` 字段。
- 评估是否存在值得抽取的小型 HTTP helper；无明确重复则不抽取。

退出条件：三家 Provider 通过同一 Contract 和 type suite，公共类型冻结。

## Milestone 3：Baidu + Doubao

目标：验证中文 Provider、不同鉴权、查询限制和响应结构。

任务：

- 复核 Baidu ordinary/AI Search 与 Doubao Custom/Global API。
- 实现四个 engine、配置、options、query/maxResults 限制与 warning。
- 覆盖中文字符、发布时间、缺 title、AI answer 与 URL recovery 边界。
- 完成五家 capability、环境变量和文档。

退出条件：五家通过 Contract，中文与限制 Fixture 完整，错误无密钥泄露。

## Milestone 4：v0.1.0 Release

目标：发布可安装、可理解、可扩展的 npm SDK。

任务：

- Public API、类型推导、错误、取消、安全与零依赖 Review。
- 完成 README、Provider 配置、示例、CHANGELOG 和 License。
- 运行 publint、类型包检查、pack consumer smoke test。
- 验证 test registry 后创建 `v0.1.0` release。

退出条件见 [Release Checklist](04-testing-and-release.md#10-v010-release-checklist)。

## v0.2：可移植性与 Provider 扩展

根据真实需求考虑：

- SearXNG、Serper News/Images 和更多 Provider
- 批量并发搜索 helper
- 第三方 Provider extension contract / package exports
- 更完整 usage、rate limit reset 和 observability hooks
- Browser/Deno/Bun 支持评估，但不默认承诺

## v0.3：Operational / Router Layer

在 Provider Contract 和 Eval 数据稳定后考虑：

- 可配置 retry policy
- capability filter、health 和 fallback
- quota/cost/quality/language/freshness routing
- Credential Pool、多 Key 与 `router:<name>` namespace

## v0.4+：Search Composition

- federated search
- URL canonicalization 与去重
- RRF/加权融合与 rerank
- Search Eval、Gateway、Multi-tenant、Billing 和 Dashboard

这些能力必须位于上层模块，不能改变 Adapter 的单一职责。

## 未来 dsh-web-search 迁移

不属于 SearchSuite v0.1 实现。SDK 稳定后可在原插件单独规划：以 SearchSuite 替换五家 Search HTTP Adapter，同时保留插件的 Settings UI、credentials、auto/failover、`web_fetch`、status/probe 和 `WebError` 映射。迁移不得让核心包依赖 dsh。
