# SearchSuite Open-Source Documentation Refresh Design

Status: Approved

Date: 2026-08-23

Repository: <https://github.com/yugasun/SearchSuite>

## 1. Objective

Rebuild SearchSuite's public documentation around the needs of npm users, contributors, and maintainers. The existing deleted `docs/` files are historical source material only; they will not be restored verbatim.

The result must make a new Node.js developer able to understand the project, configure one provider, and execute a search within five minutes. It must also establish credible contribution, security, support, and release conventions without adding a documentation site or runtime dependency.

## 2. Audience and language

- `README.md` is the English canonical landing page for GitHub and npm.
- `README.zh-CN.md` is a complete Chinese mirror with the same section order and executable examples.
- User, API, provider, contribution, security, and support documentation is English-first.
- ADRs and internal design records may remain Chinese when that better serves the maintainers.
- Code examples and factual tables must stay synchronized across languages.

## 3. Scope

### Included

- Rewrite the English README and add a Chinese mirror.
- Rebuild a concise user documentation set under `docs/`.
- Preserve the approved architecture baseline in a focused architecture guide and ADR.
- Add contribution, security, conduct, and support policies.
- Add structured GitHub issue forms and a pull request template.
- Complete npm and GitHub repository metadata using the real repository URL.
- Normalize the changelog and document v0.x release expectations.
- Validate links, examples, declarations, build output, and packed artifacts.

### Excluded

- TypeDoc generation or a hosted documentation site.
- GitHub Pages deployment.
- npm publishing or GitHub repository setting mutations.
- New SDK behavior, providers, engines, routing, retry, fallback, caching, dsh integration, Extract, or Crawl.
- Fake badges, placeholder contacts, unpublished npm version claims, or unverified coverage claims.

## 4. README design

Both READMEs use the same information order:

1. Project name, language switch, concise value proposition, and accurate project status.
2. Why SearchSuite: typed unified API, provider switching, native fetch, zero runtime dependencies, and framework independence.
3. Requirements and installation, explicitly distinguishing local pre-release installation from future npm installation.
4. A copyable ESM quick start using one provider and one search request.
5. A short provider-switching example.
6. A compact provider/engine/environment-variable matrix with a link to detailed capabilities.
7. Configuration precedence and local `.env` usage through Node.js `--env-file`.
8. Typed provider options, timeout, caller cancellation, and unified error handling.
9. Explicit v0.1 non-goals.
10. Documentation, support, contribution, security, changelog, and MIT license links.

The README remains a five-minute entry point. Architecture history, full public type declarations, provider mapping details, and release procedures belong in dedicated documents.

## 5. Documentation architecture

```text
docs/
├── README.md
├── getting-started.md
├── providers.md
├── api-reference.md
├── development.md
├── architecture.md
├── roadmap.md
├── adr/
│   └── 0001-v0.1-architecture-baseline.md
├── research/
│   └── 2026-08-23-open-source-documentation-practices.md
└── superpowers/specs/
    └── 2026-08-23-open-source-documentation-refresh-design.md
```

Each document has one responsibility:

- `getting-started.md`: installation, provider credentials, `.env`, first search, and first Live Test.
- `providers.md`: supported engines, configuration, options, limits, normalization behavior, and conservative capability matrix.
- `api-reference.md`: public client, request/response types, errors, warnings, cancellation, injected fetch, and safe raw data.
- `development.md`: Node/pnpm setup, offline tests, opt-in Live Tests, build, lint, publint, pack, and release checklist.
- `architecture.md`: Client/Registry/Adapter boundaries, request flow, security model, and v0.1 scope constraints.
- `roadmap.md`: completed v0.1 scope and explicitly deferred work.
- ADR: durable reasoning for public architecture decisions.

Documents describe public contracts and link to source rather than duplicating every TypeScript declaration. Historical implementation plans and the earlier broad design spec are not part of the user-facing navigation.

## 6. Provider documentation contract

The provider table is derived from implemented engine literals and capability declarations. It distinguishes SDK support from upstream provider capabilities and includes:

- provider and engine literals;
- accepted environment variables;
- maximum result handling and query limits;
- common domain/time-range support;
- answer, content, and score normalization;
- typed `providerOptions`;
- provider-specific notes and account requirements.

Scores retain provider-local semantics. A capability is marked supported only when the current adapter maps it into the common contract. Provider behavior changes require the capability matrix and changelog to change together.

## 7. Community health files

- `CONTRIBUTING.md` defines Node.js 24/pnpm setup, commands, test layers, fixture redaction, provider contribution requirements, documentation duties, and v0.1 scope boundaries.
- `SECURITY.md` uses GitHub Private Vulnerability Reporting as the private channel. It prohibits public vulnerability reports and submission of credentials, authorization headers, queries, or unsafe raw responses.
- `CODE_OF_CONDUCT.md` adopts Contributor Covenant 2.1 and names the repository maintainer as the enforcement contact. Confidential reports use the repository's private reporting form after the maintainer enables it; no invented email address is published.
- `SUPPORT.md` routes usage questions, reproducible bugs, provider compatibility reports, feature proposals, and security reports to the correct channel.
- `.github/ISSUE_TEMPLATE/` contains structured bug, provider compatibility, and feature forms plus selector configuration.
- `.github/PULL_REQUEST_TEMPLATE.md` collects scope, linked issue, test evidence, provider behavior, docs/ADR duties, and secret-safety confirmation.

Platform-only settings such as topics, social preview, branch protection, private vulnerability reporting, and npm Trusted Publishing are documented as maintainer actions, not claimed as completed locally.

## 8. Package and repository metadata

`package.json` will preserve ESM-only Node.js 24 behavior, zero runtime dependencies, and the existing export map while adding:

- top-level `types`;
- precise `repository`, `homepage`, and `bugs` URLs for `yugasun/SearchSuite`;
- focused npm keywords;
- exact `packageManager` version from the installed lockfile/tooling;
- `publishConfig.access: public` if compatible with the unscoped package release plan.

No author email, funding URL, npm badge, or release badge is added without a real and verifiable value.

## 9. Changelog and version policy

The changelog keeps an `[Unreleased]` section with Added, Changed, Deprecated, Removed, Fixed, and Security categories when needed. SearchSuite follows SemVer with an explicit v0.x policy:

- `0.y.0` may contain documented breaking public API changes.
- `0.y.z` is reserved for compatible fixes and documentation/internal changes.
- Engine syntax, public types, default modes, cancellation semantics, or request-count behavior require both a changelog entry and a new ADR.

The documentation refresh is recorded under `[Unreleased]`; it does not claim that `0.1.0` has been published.

## 10. Verification

The refresh is complete when:

- all Markdown relative links resolve;
- the English and Chinese README have matching sections and examples;
- commands refer only to existing scripts;
- examples typecheck against the public package surface;
- provider matrices match `src/types.ts` and provider capability constants;
- no placeholder URLs, emails, tokens, version badges, or release claims remain in public documentation or package metadata;
- issue forms and workflow YAML parse successfully;
- `pnpm typecheck`, `pnpm lint`, offline `pnpm test`, `pnpm build`, and `pnpm exec publint` pass;
- `pnpm pack` contains only intended artifacts;
- a clean Node.js 24 ESM consumer can import the packed package and resolve declarations;
- normal validation does not run credential-gated Live Tests or consume provider credits.

## 11. Source basis

The detailed research record is [Open-source documentation practices](../../research/2026-08-23-open-source-documentation-practices.md). Recommendations are grounded in primary documentation from GitHub, npm, Node.js, TypeScript, TypeDoc, Semantic Versioning, Keep a Changelog, and the source repositories of mature TypeScript SDKs.
