# SearchSuite 研发文档

本目录将原始 Python 技术构想重构为已批准的 TypeScript SDK 研发文档。建议按以下顺序阅读：

1. [产品定位与范围](01-product-scope.md)：为什么做、为谁做、v0.1 做到哪里。
2. [架构与公共 API](02-architecture-and-api.md)：Client、类型、Registry、配置、warning、取消和异常。
3. [Provider Adapter 开发规范](03-provider-adapter-guide.md)：接入和维护五家 Provider。
4. [测试、CI 与发布](04-testing-and-release.md)：验证类型与运行时契约并发布 npm 包。
5. [路线图与任务拆分](05-roadmap.md)：按里程碑推进实现。
6. [ADR-0001](adr/0001-v0.1-architecture-baseline.md)：TypeScript v0.1 的关键取舍。
7. [批准设计规范](superpowers/specs/2026-08-22-typescript-sdk-design.md)：本轮设计确认记录。

根目录 [TECHNICAL_DESIGN.md](../TECHNICAL_DESIGN.md) 是技术总览，[README.md](../README.md) 面向首次访问项目的开发者。

## 文档维护规则

- 公共 API、类型、异常、取消语义或配置优先级变化时，更新 `02-architecture-and-api.md`。
- Provider engine、options、能力或映射变化时，更新 `03-provider-adapter-guide.md`。
- 已发布架构决策不得直接重写历史 ADR；新建 ADR 并声明替代关系。
- Provider API 易变化。合并 Adapter 修改前，以官方文档、脱敏 Fixture 和可选 Live Test 共同复核。
- 示例代码必须在对应版本通过 typecheck；尚未实现的目标 API 必须明确标注。
- 文档和代码统一使用 camelCase；只有 Provider HTTP payload 保留远端字段命名。

## 术语

| 术语 | 含义 |
|---|---|
| Provider | Baidu、Doubao 等搜索服务及其 SearchSuite Adapter |
| engine | Provider 内部搜索模式；完整形式为 `provider:engine` |
| common parameter | SearchSuite 公共请求字段 |
| provider option | 根据 engine 推导、仅对应 Provider 支持的请求字段 |
| normalize | 将 Provider 原始响应转换为公共类型 |
| contract test | 对所有 Provider 执行的同一组运行时契约测试 |
| type test | 验证 engine 与 `providerOptions` 推导的编译期测试 |
| raw | 经过秘密清理的 JSON-compatible Provider 原始数据 |
