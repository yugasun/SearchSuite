# SearchSuite 开源项目说明与文档最佳实践调研

日期：2026-08-23

## 结论摘要

SearchSuite 的文档应明确分成三层：

1. 根目录 `README.md` 是用户入口，负责在最短路径内回答“它解决什么问题、如何安装、如何完成第一次搜索、支持哪些 Provider、去哪里查详细资料”。
2. `docs/` 是用户与 Provider 开发者手册，负责公共 API、配置、错误、Provider 能力差异、真实测试和架构约束。
3. `CONTRIBUTING.md`、`SECURITY.md`、`CODE_OF_CONDUCT.md` 与 `.github/` 模板是社区契约，负责贡献流程、安全披露和高质量 Issue/PR 输入。

GitHub 官方建议 README 至少说明项目用途、价值、入门方式、求助渠道和维护者，并将较长资料移出 README；npm 又会直接把包根目录 README 渲染到 npm 包页面。因此，SearchSuite 的 README 应同时服务 GitHub 访客和 npm 使用者，而不应承担完整技术设计文档的职责。[GitHub：About the repository README file](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes) [npm：About package README files](https://docs.npmjs.com/about-package-readme-files/)

## 调研对象与可复用模式

本次只参考规范所有者的官方文档与成熟项目的原始仓库文件：

- GitHub 官方 README、社区健康文件、Issue Form、PR 模板、安全披露和 Release 文档。
- npm 官方 package metadata、打包、发布、Trusted Publishing 和 provenance 文档。
- Node.js 官方 package/ESM 文档与 TypeScript 官方 module/declaration 发布文档。
- TypeDoc 官方文档。
- OpenAI 官方 TypeScript SDK、GitHub 官方 Octokit SDK、Elastic 官方 Node.js Client 的仓库文件。
- Semantic Versioning 规范与 Keep a Changelog 约定。

成熟 SDK 中可直接复用的模式包括：

- OpenAI Node SDK 的 README 从一句定位直接进入 Installation 和可运行 Usage，再链接 API reference 与 examples；后部单独说明错误、超时、运行时要求、版本兼容和贡献方式。[openai-node README](https://github.com/openai/openai-node/blob/main/README.md)
- Octokit README 先声明范围与特性，再按运行时给安装/导入方式，并明确 TypeScript module resolution 要求、构造参数和错误处理。[octokit.js README](https://github.com/octokit/octokit.js#readme)
- Elastic Node.js Client 把服务端兼容关系和 Node.js 支持策略做成表格，并将认证、配置、TypeScript、测试与 examples 作为独立文档入口。[elasticsearch-js README](https://github.com/elastic/elasticsearch-js#readme)
- OpenAI Node SDK 的贡献指南明确开发工具版本、安装/构建命令、测试分层、examples 运行方式、凭据与日志脱敏要求，以及发布权限边界。[openai-node CONTRIBUTING](https://github.com/openai/openai-node/blob/main/.github/CONTRIBUTING.md)

这些项目不必被逐字模仿；SearchSuite 更小，应该采用同样的信息顺序，但保持 README 精练。

## README 推荐结构

建议按以下顺序重写根 README：

1. 项目名、一句话价值主张、简短状态说明。
2. 3–5 个可信且可维护的徽章：CI、npm version、Node 24+、MIT；在仓库或 npm 包尚不存在时不要放失效或假链接。
3. `Why SearchSuite`：用 3–5 条说明统一 API、类型安全、Provider 可切换、零 runtime dependency、框架无关。不要在这里展开内部架构历史。
4. `Installation`：发布前给本地 tarball 安装方式；正式发布后以 `npm install searchsuite` 为主，可并列 pnpm/yarn。
5. `Quick start`：一个可以复制运行的最小 ESM 示例，最多展示一个 Provider、一种认证方式、一次 `search()` 和结果遍历。
6. `Switch providers`：用第二个极短示例证明只改 `engine` 即可切换，而不是重复完整初始化代码。
7. `Supported providers`：直接展示 Provider/Engine/环境变量/关键能力的表格，并链接详细 Provider 文档。
8. `Configuration`：说明显式配置优先于环境变量、`.env` 只适合本地开发、SDK 本身不负责加载 `.env`、Key 不得进入前端或日志。
9. `Errors, timeouts, and cancellation`：展示 `SearchTimeoutError` 与 `SearchAbortedError` 的区分和一个 `AbortSignal` 示例；明确 v0.1 没有自动 retry/fallback。
10. `Documentation`：链接 Getting Started、API Reference、Provider Guides、Testing、Architecture、Roadmap、Changelog。
11. `Requirements and package format`：Node.js 24+、ESM-only、TypeScript declarations、native fetch、zero runtime dependencies。
12. `Contributing / Security / License`：每项一两句话并链接对应文件。

README 中应删除或下沉的内容：

- 长篇项目起源、内部抽象原则和完整 v0.1 非目标，移入产品定位或架构文档；README 仅保留一句来源和精简 scope 提示。
- “建议使用 MIT License”一类未定措辞。如果仓库已有 MIT `LICENSE` 且 `package.json#license` 为 MIT，应直接声明 MIT。
- 尚未发布时不能展示会让用户误以为可从 npm 安装的命令或 npm version badge；发布后应及时删除“工作区首版、尚未发布”的状态文字。
- 不在 README 重复所有公共类型声明；保留最常见调用，将完整声明放进 API Reference。

GitHub 会正确转换相对链接，使它们在分支和 fork 中继续工作，因此仓库内文档链接应使用相对路径，而不是硬编码默认分支 URL。[GitHub README relative links](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes#relative-links-and-image-paths-in-readme-files)

### Provider 能力矩阵

README 的矩阵应面向选型，不应只列 Provider 名字。建议字段：

| 字段 | 说明 |
| --- | --- |
| Provider | `baidu`、`doubao`、`tavily`、`exa`、`serper` |
| Engines | v0.1 真实支持的 `provider:engine` 字面量 |
| Credential env | 默认读取的环境变量 |
| Domain filters | include/exclude 是否可移植支持 |
| Time range | 是否支持统一 `timeRange` |
| Answer/content/score | 响应中可能出现的标准化能力 |
| Provider options | 链接到该 engine 的 typed `providerOptions` |
| Notes | 上游限制、最大结果数或区域/账户要求 |

矩阵必须区分“SDK 支持”“上游 Provider 支持”和“当前 engine 支持”，不要用单个笼统的 Yes 掩盖限制。每个能力符号都应在表下定义；Provider score 保留本地语义，不应暗示跨 Provider 可比较。Elastic 官方 Client 使用显式兼容矩阵表达服务版本、Client 分支与 Node 支持关系，是这一做法的成熟先例。[elasticsearch-js compatibility and Node.js support](https://github.com/elastic/elasticsearch-js#compatibility)

## 文档信息架构

建议用户文档采用下面的稳定结构：

```text
README.md
CONTRIBUTING.md
SECURITY.md
CODE_OF_CONDUCT.md
CHANGELOG.md
docs/
  README.md
  getting-started.md
  configuration.md
  api-reference.md           # 或 TypeDoc 生成站点的入口
  errors-and-cancellation.md
  providers/
    README.md                # 能力矩阵与通用约定
    baidu.md
    doubao.md
    tavily.md
    exa.md
    serper.md
  testing.md
  architecture.md
  roadmap.md
  adr/
```

每份 Provider 文档固定包含：支持的 engine、认证配置和环境变量、公共参数映射、typed `providerOptions`、上游限制、标准化字段、错误映射、最小示例、Live Test 方法以及上游官方 API 链接。固定模板能降低五个 Provider 文档逐渐漂移的风险。

`TECHNICAL_DESIGN.md` 应保留为设计基线，不充当用户 API 文档。公共行为变更由 API/Provider 文档面向用户说明，架构决策由 ADR 解释原因，CHANGELOG 面向版本列出结果，避免同一事实在四个地方以不同措辞维护。

### API Reference

短期可以维护一份手写 `docs/api-reference.md`，完整覆盖：

- `SearchSuite` 构造参数与默认值。
- `search()` 请求/响应结构。
- engine 与 `providerOptions` 的类型关联。
- 错误类、`code`、`retryable`、安全 `raw`。
- warning policy、timeout、caller cancellation 和 injected fetch。

中期建议给所有 public exports 添加有意义的 TSDoc/JSDoc，再用 TypeDoc 从 `src/index.ts`/package exports 生成 API reference。TypeDoc 会跟随 re-export，并可从 `package.json` 的 `exports`/`main` 自动发现入口；它也支持把独立 Markdown 指南纳入同一文档站点。[TypeDoc Quick Start](https://typedoc.org/) [TypeDoc input options](https://typedoc.org/documents/Options.Input.html) [TypeDoc external documents](https://typedoc.org/documents/External_Documents.html)

不要把自动生成文档提交为另一个手工维护的真相来源。CI 应生成并检查文档，发布站点或 Release artifact 可以承载生成结果。

## CONTRIBUTING.md

GitHub 会识别根目录、`docs/` 或 `.github/` 下的 `CONTRIBUTING.md` 并在贡献入口展示。贡献指南应减少 Issue/PR 来回补充信息的成本。[GitHub：Setting guidelines for repository contributors](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/setting-guidelines-for-repository-contributors)

SearchSuite 的贡献指南建议包含：

- 前置条件：Node.js 24+，仓库唯一受支持的包管理器及其固定版本。
- 初始化：fork/clone、安装、build 的完整命令。
- 常用验证：`typecheck`、`lint`、offline tests、build、publint/pack check；说明普通测试不得联网。
- Live tests：显式 opt-in、需要哪些环境变量、如何用 Node `--env-file=.env`、为什么不能把凭据或完整原始响应贴进 Issue/CI 日志。
- 新 Provider/engine 的贡献流程：先对齐设计范围，再实现 typed options、runtime validation、mock request/response/error/cancellation、common contract、能力矩阵与 changelog。
- 公共行为变更清单：何时必须更新 API 文档、Provider matrix、CHANGELOG 和新增 ADR。
- 代码规范：ESM、严格 TypeScript、native Web APIs、零 runtime dependency、thin adapter，以及 v0.1 禁止的 routing/retry/cache 等范围。
- PR 约定：小而聚焦、关联 Issue、说明测试证据、标出 breaking change；不要要求某种提交格式，除非 release automation 实际验证它。
- 维护者期望：review 时效可以不承诺具体 SLA，但应说明 maintainer 可能关闭无复现、含凭据或超范围请求。

贡献文档里的命令必须调用真实存在的 scripts。OpenAI Node SDK 把开发环境、源码构建、examples、测试分层和发布流程放入贡献指南而非 README，可作为信息分层的直接参考。[openai-node CONTRIBUTING](https://github.com/openai/openai-node/blob/main/.github/CONTRIBUTING.md)

## SECURITY.md

GitHub 官方要求安全策略至少说明受支持版本和私密报告方式；公开仓库还可启用 Private Vulnerability Reporting，为研究者提供结构化私密渠道。[GitHub：Adding a security policy](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/add-security-policy) [GitHub：Private vulnerability reporting](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository)

SearchSuite 的安全策略建议包含：

- Supported versions 表格。发布前可明确“尚无受支持的正式版本”；发布后只承诺当前受支持 release line。
- 首选 GitHub Private Vulnerability Reporting；未启用时使用维护者真实可达的专用邮箱。不能提交占位邮箱。
- 明确不要开公开 Issue，不要在报告里提供 Provider API Key、Authorization header、`.env`、用户查询或未脱敏 raw response。
- 报告应包含受影响版本、provider/engine、影响、最小复现和建议缓解方式。
- 确认/响应流程可描述阶段，但不要承诺维护者无法稳定做到的固定 SLA。
- SDK 特有威胁说明：凭据仅用于对应 Provider 请求；错误和 `raw` 必须脱敏；服务端 Key 不得进入浏览器包；怀疑泄露时先在 Provider 控制台吊销/轮换。

安全邮件和 Code of Conduct 执法邮箱属于真实运营承诺。在维护者提供有效渠道之前，应先启用 GitHub 私密报告功能，不能凭空写一个不可达地址。

## CODE_OF_CONDUCT.md

GitHub 将 Code of Conduct 视为社区标准与执行程序，并提醒维护者只采用愿意且能够执行的规范。[GitHub：Adding a code of conduct](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/adding-a-code-of-conduct-to-your-project)

建议采用完整、未经删改的 [Contributor Covenant 2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/)；只替换模板要求的执行联系人，并确保联系人真实可用。若暂时无法提供私密且可执行的投诉渠道，宁可先完成维护责任和联系人决策，再加入文件，不能发布带占位符的行为准则。

## Issue 与 PR 模板

GitHub Issue Forms 可以定义必填字段、下拉项和确认框；模板必须放在默认分支的 `.github/ISSUE_TEMPLATE/`，`config.yml` 可以控制模板选择器。PR template 会自动填入新 PR 的正文。[GitHub：About issue and pull request templates](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/about-issue-and-pull-request-templates) [GitHub：Issue form syntax](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms) [GitHub：Creating a PR template](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository)

建议新增：

```text
.github/
  ISSUE_TEMPLATE/
    bug.yml
    provider-compatibility.yml
    feature.yml
    config.yml
  pull_request_template.md
```

`bug.yml` 必填：SearchSuite 版本、Node 版本、操作系统、安装方式、最小复现、期望/实际行为、脱敏错误。要求确认已在最新版本复现、未包含凭据、不是上游 Provider 服务故障。

`provider-compatibility.yml` 必填：provider、engine、账户区域/计划（允许“不清楚”）、请求参数、上游响应形状的脱敏片段、上游文档链接、回归与否。单独设模板比通用 bug 更容易收集兼容性 fixture 所需材料。

`feature.yml` 必填：问题陈述、使用场景、期望的统一能力或 provider-specific 行为、替代方案、是否会改变公共 API。提醒 Router、fallback、retry、cache、Crawl/Extract 和 dsh integration 不属于 v0.1。

`config.yml`：关闭空白 Issue，提供文档/讨论链接；安全问题必须指向 `SECURITY.md`，不能流入普通 Issue。

PR 模板建议检查：

- 关联 Issue 与变更摘要。
- 测试证据；offline tests 未联网、未消耗 Provider credits。
- 新 Provider/兼容性修复是否含 regression fixture 和 contract tests。
- 公共行为是否更新 API 文档、Provider matrix、CHANGELOG；需要时是否新增 ADR。
- 是否保持 ESM-only、Node 24+、零 runtime dependency 和薄 Adapter。
- 是否检查示例、fixture、日志和 `raw` 中没有凭据或用户敏感数据。

## Release、版本与 CHANGELOG

SemVer 将版本拆成 MAJOR/MINOR/PATCH，对应破坏性 API、向后兼容功能和向后兼容修复；`0.y.z` 表示初始开发阶段，公共 API 仍可能变化。[Semantic Versioning 2.0.0](https://semver.org/)

SearchSuite 应公开写明自己的 v0.x 规则，例如：

- `0.y.0` 可以包含明确记录的 breaking public API change。
- `0.y.z` 的 patch 只包含兼容修复和文档/内部变更。
- engine syntax、公开模型、默认模式、取消语义或请求次数发生变化时，除 CHANGELOG 外必须新增 ADR。

CHANGELOG 建议遵循当前 Keep a Changelog 2.0.0：保留 `[Unreleased]`，每个版本使用 `YYYY-MM-DD` 日期，按 Added/Changed/Deprecated/Removed/Fixed/Security 分组，最新版本在上，给版本和 compare 链接，并显式标记 breaking entries。仓库内 CHANGELOG 应是规范来源，GitHub Release notes 是发布视图而不是唯一历史。[Keep a Changelog 2.0.0](https://keepachangelog.com/en/2.0.0/)

发布流程建议：

1. 在干净的 Node.js 24 环境执行 install、typecheck、lint、offline tests、build。
2. 执行 publint 与 `npm pack`，检查 tarball 内容；npm 官方明确建议发布前本地 pack，以验证真正会进入包的文件。[npm Developers Guide](https://docs.npmjs.com/cli/v11/using-npm/developers/#testing-whether-your-npmignore-or-files-config-works)
3. 把 tarball 安装到干净临时项目，验证 ESM import、声明解析和零 runtime dependency。
4. 视凭据可用性执行 credential-gated Live tests；Live tests 不应成为所有外部贡献者的必需条件。
5. 更新 package version 与 CHANGELOG，创建匹配的 `vX.Y.Z` tag 和 GitHub Release。GitHub Release 基于 tag，可附带 release notes 和关联变更。[GitHub：About releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)
6. npm 发布采用 OIDC Trusted Publishing，并限制 workflow permissions。Trusted Publishing 避免长期 npm write token，且公开仓库的公开包会自动生成 provenance。[npm：Trusted publishing](https://docs.npmjs.com/trusted-publishers/)

发布自动化必须等 GitHub remote、npm package ownership 与真实发布 workflow 决定后再加入，避免生成带假 owner/repository 的配置。

## package.json 与仓库元数据

npm 的 `package.json` 文档定义了 `description`、`keywords`、`homepage`、`bugs`、`license`、`repository`、`files`、`exports`、`type` 和 `engines` 等发布元数据。[npm package.json](https://docs.npmjs.com/files/package.json/)

SearchSuite 当前方向下的推荐字段：

```json
{
  "name": "searchsuite",
  "description": "One typed API for multiple web search providers.",
  "keywords": [
    "search",
    "web-search",
    "typescript",
    "sdk",
    "ai-agent",
    "rag",
    "baidu",
    "doubao",
    "tavily",
    "exa",
    "serper"
  ],
  "type": "module",
  "types": "./dist/index.d.ts",
  "engines": {
    "node": ">=24"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/yugasun/SearchSuite.git"
  },
  "bugs": {
    "url": "https://github.com/yugasun/SearchSuite/issues"
  },
  "homepage": "https://github.com/yugasun/SearchSuite#readme",
  "publishConfig": {
    "access": "public"
  }
}
```

仓库地址已经确认为 `yugasun/SearchSuite`。还应增加准确的 `author`（或维护组织）、精确 `packageManager` 版本；`funding` 只有在真实赞助渠道存在时添加。

现有设计中应继续保留：

- `"type": "module"` 与仅 `import` 的 `exports`，不增加 `require` 条件。Node 官方说明 `type: module` 决定 `.js` 的 ESM 解释方式，`exports` 可明确封装公共入口。[Node.js Packages](https://nodejs.org/api/packages.html)
- `exports["."].types` 放在运行时条件之前，并指向实际声明文件。TypeScript 会识别 `exports` 的 `types` 条件；官方仍建议 typed npm package 同时提供顶层 `types`，也有利于 npm 展示 TypeScript 标识。[TypeScript module resolution](https://www.typescriptlang.org/docs/handbook/modules/reference.html#packagejson-exports) [TypeScript declaration publishing](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html)
- `files` allowlist，只发布 `dist`、README、LICENSE、CHANGELOG 等必要文件。
- `sideEffects: false`，前提是所有公开入口确实没有 import-time side effects。
- `engines.node: ">=24"`，并在 README、CI、贡献指南保持同一事实。

在 GitHub 仓库建立后，建议填写 repository description、website、topics（`typescript`、`search`、`sdk`、`ai-agent`、五个 Provider 名），启用 Issues 和 Private Vulnerability Reporting，并配置默认分支保护。npm provenance 要求 `package.json#repository.url` 与真实 GitHub 仓库准确匹配，这也是尽早补全该字段的安全理由。[npm provenance](https://docs.npmjs.com/generating-provenance-statements/)

## 推荐实施优先级

### P0：公开前必须完成

- 重写 README：安装、quick start、Provider matrix、配置、错误/取消、要求、文档入口、License。
- 增加 `CONTRIBUTING.md` 与 `SECURITY.md`；确认真实安全报告渠道。
- 增加 bug/provider compatibility/feature Issue Forms 和 PR template。
- 修正 `package.json` 的 `types`、repository、bugs、homepage、keywords、author、packageManager；仓库地址未定时暂缓 URL 字段。
- 将 README 中 License 和发布状态改成事实表述。
- 规范 CHANGELOG 的 v0.x 版本策略和 `[Unreleased]`。

### P1：首次公开发布同步完成

- 五份 Provider guides 与完整能力矩阵。
- 公共 API reference；为 public exports 补齐 TSDoc/JSDoc。
- 干净 Node.js 24 tarball consumer test。
- GitHub Release 与 npm OIDC Trusted Publishing/provenance。
- 采用 Code of Conduct，并填写真实执法联系人。

### P2：社区增长后再做

- TypeDoc 自动生成/部署文档站点。
- `SUPPORT.md`、GOVERNANCE、CODEOWNERS、release notes automation。GitHub 会用 `SUPPORT.md` 将使用问题导向合适渠道，CODEOWNERS 可把 Provider 相关变更路由给对应维护者。[GitHub：Adding support resources](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/adding-support-resources-to-your-project) [GitHub：About code owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- 中英文双语文档。如果面向全球 npm 用户，建议英语 `README.md` 为主、`README.zh-CN.md` 为中文版本；这是面向目标受众的产品判断，不是 GitHub/npm 的强制要求。

## 验收清单

- 新用户从 README 复制代码后，能在 5 分钟内完成一个 Provider 的搜索。
- README 的每个命令都在 Node.js 24、ESM consumer 环境真实执行过。
- Provider matrix 与实现中的 engine/capability 常量一致。
- 所有仓库相对链接可用；没有未来仓库地址、邮箱、npm 版本或徽章占位符。
- 普通测试说明明确离线；Live tests 显式 opt-in 且不会打印凭据。
- Issue 表单不会诱导用户提交 Key、Authorization header 或未脱敏 raw response。
- 公共 API、Provider 行为、CHANGELOG 和 ADR 的更新责任边界清晰。
- `npm pack` 产物只含预期文件，干净项目可 ESM import 且能解析 `.d.ts`。
- `SECURITY.md` 的私密报告渠道真实可达。
- npm 发布工作流使用最小权限与 Trusted Publishing，并产生 provenance。
