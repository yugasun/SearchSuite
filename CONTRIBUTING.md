# Contributing to SearchSuite

Thank you for helping improve SearchSuite. Contributions are welcome for the
framework-independent TypeScript SDK, its five v0.1 providers, tests, examples,
and public documentation. Please keep changes within the current project scope
described in [TECHNICAL_DESIGN.md](TECHNICAL_DESIGN.md).

## Development setup

SearchSuite requires Node.js 24 or newer, Corepack, and the repository-pinned
pnpm 10.32.1.

```sh
git clone https://github.com/yugasun/SearchSuite.git
cd SearchSuite
corepack enable
corepack prepare pnpm@10.32.1 --activate
pnpm install --frozen-lockfile
```

The package is ESM-only, uses TypeScript strict mode and native Web Platform
APIs, and must retain zero runtime dependencies in v0.1.

## Validate a change

Run the offline checks before opening a pull request:

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm exec publint
pnpm pack:check
```

`pnpm test` is the offline default and must never contact a provider or consume
credits. `pnpm pack:check` currently builds the package and runs publint; see the
[development guide](docs/development.md) for the clean-consumer and tarball
checks used for release validation.

Live tests are optional, credential-gated, and must be invoked deliberately.
For example:

```sh
node --env-file=.env node_modules/vitest/vitest.mjs run \
  test/integration/exa.live.test.ts
```

This command sends a real request to Exa and may consume provider credits. Use
the matching `baidu`, `doubao`, `tavily`, or `serper` file only when you intend
to test that provider. Never run live tests in the offline suite.

## Contribution flow

1. Check existing issues and pull requests before starting overlapping work.
2. For a bug, propose a sanitized reproduction. For a larger behavior or API
   change, open a focused issue before investing in implementation.
3. Keep each pull request small, reviewable, and limited to one concern.
4. Add the tests and documentation required by the change.
5. Explain the user-visible behavior, tradeoffs, and validation performed in
   the pull request description.

Clear commit messages are appreciated. Conventional Commits are not required
unless repository automation explicitly begins enforcing them.

## Provider change checklist

When changing a provider adapter or its public options, verify all applicable
items:

- Keep the adapter thin and free of routing, fallback, retry, caching, or other
  cross-provider policy.
- Define exact engine and `providerOptions` types. Runtime validation must reject
  unknown option keys and invalid values, types, and ranges for untyped callers.
- Keep built-in provider discovery in the explicit lazy registry; do not add
  directory scanning or eager imports.
- Add mocked request mapping, response normalization, cancellation, and error
  mapping tests using injected `fetch`.
- Keep the provider passing the common contract suite.
- Add or update type-inference tests for engines and `providerOptions`.
- Add a sanitized regression fixture before fixing an upstream compatibility
  regression.
- Update the capability matrix in [Providers](docs/providers.md) when mapped
  capabilities change.
- Update [CHANGELOG.md](CHANGELOG.md) for provider-visible behavior.
- Update [TECHNICAL_DESIGN.md](TECHNICAL_DESIGN.md) when engine syntax, public
  types, defaults, cancellation semantics, or request-count behavior changes.

## Credentials, fixtures, and raw data

- Never commit API keys, authentication headers, `.env` files, provider account
  identifiers, or secret-bearing URLs.
- Keep credentials in server-side environment variables or a secret manager.
- Remove personal queries, user data, authorization material, cookies, and
  identifying metadata from fixtures and reproductions.
- Treat provider payloads and SearchSuite `raw` fields as sensitive even after
  known credential-shaped fields have been redacted. Include only the smallest
  safe fragment needed for a test.
- Before committing, review staged changes and generated artifacts for secrets.
  If a credential is exposed, revoke and rotate it immediately; deleting it from
  the latest commit is not sufficient.

## v0.1 boundaries

SearchSuite v0.1 is the unified Search SDK plus the Baidu, Doubao, Tavily, Exa,
and Serper adapters. Do not add a dsh plugin, `web_fetch`, Extract, Crawl,
automatic retry or fallback, provider routing, result fusion, reranking,
caching, gateway, operational layer, composition layer, or SaaS functionality.

Do not add runtime dependencies, CommonJS output, `require` exports, or
compatibility shims. Discuss any proposed scope or dependency change before
implementation.

## Review expectations

Maintainers may request smaller commits, additional tests, a sanitized fixture,
API changes, or documentation updates. Review considers public API stability,
type inference, provider contract fidelity, credential safety, offline test
isolation, and package output. Submission does not guarantee acceptance or a
particular review or response time.

For questions about where to report something, see [SUPPORT.md](SUPPORT.md). For
vulnerabilities or confidential conduct concerns, follow [SECURITY.md](SECURITY.md).
