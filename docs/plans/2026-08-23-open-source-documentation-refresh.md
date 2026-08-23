# SearchSuite Open-Source Documentation Refresh Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Replace the deleted internal-first documentation with a polished bilingual open-source SDK landing page, focused user guides, community health files, and accurate npm/GitHub metadata.

**Architecture:** Keep `README.md` and `README.zh-CN.md` as synchronized five-minute entry points, move stable user contracts into a small set of focused `docs/` guides, and keep contribution/security workflows in recognized root and `.github/` locations. Derive every engine, capability, environment variable, command, and package claim from the current source or package configuration.

**Tech Stack:** Markdown, GitHub Issue Forms/YAML, npm `package.json`, Node.js 24+, pnpm 10.32.1, TypeScript ESM, Vitest, tsdown, publint.

---

### Task 1: Complete package and repository metadata

**Objective:** Make npm and GitHub metadata accurate for the real `yugasun/SearchSuite` repository without changing runtime behavior.

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml` only if pnpm updates package metadata in the lockfile

**Steps:**
1. Add top-level `types: "./dist/index.d.ts"`.
2. Add focused `keywords`, `repository`, `homepage`, `bugs`, `packageManager: "pnpm@10.32.1"`, and `publishConfig.access: "public"`.
3. Add `README.zh-CN.md` to the package `files` allowlist so npm users can reach the language switch.
4. Keep `type: "module"`, Node `>=24`, import-only exports, and zero runtime dependencies unchanged.
5. Run `pnpm exec publint`; expect package metadata to lint without errors after a build.
6. Commit as `chore: complete package metadata`.

### Task 2: Rewrite the English README

**Objective:** Provide an accurate five-minute path from project discovery to a successful typed search.

**Files:**
- Replace: `README.md`
- Reference: `src/types.ts`, `src/errors.ts`, `src/providers/*.ts`, `examples/*.ts`

**Steps:**
1. Add the Chinese language link, value proposition, honest pre-release status, and maintained badges only.
2. Document Node.js 24+, ESM-only, native fetch, and zero runtime dependencies.
3. Add local tarball installation and a copyable quick start using the implemented public API.
4. Add provider switching, compact provider/engine/env matrix, configuration precedence, `.env`, provider options, cancellation, and error examples.
5. Add v0.1 non-goals and links to docs, support, contribution, security, changelog, and license.
6. Run a local Markdown-link scan and `pnpm typecheck`; expect all referenced paths and examples to be valid.
7. Commit as `docs: rewrite open-source README`.

### Task 3: Add the synchronized Chinese README

**Objective:** Give Chinese users the same onboarding path and factual contract as the canonical English README.

**Files:**
- Create: `README.zh-CN.md`
- Modify: `README.md` only if synchronization reveals an error

**Steps:**
1. Mirror the English section order, tables, commands, and code blocks.
2. Translate explanatory prose naturally while preserving public identifiers and error names.
3. Link back to `README.md` and the same canonical documentation files.
4. Compare Markdown headings and fenced-code counts between both READMEs.
5. Run the Markdown-link scan; expect no broken relative links.
6. Commit as `docs: add Chinese README`.

### Task 4: Rebuild onboarding and provider guides

**Objective:** Separate setup and provider selection details from the README while documenting only implemented behavior.

**Files:**
- Create: `docs/README.md`
- Create: `docs/getting-started.md`
- Create: `docs/providers.md`
- Reference: `src/types.ts`, `src/providers/*.ts`, `test/integration/*.ts`

**Steps:**
1. Create a task-oriented documentation index.
2. Document install/build/pack, API-key configuration, Node `--env-file`, first request, and opt-in Live Tests.
3. Build a five-provider matrix from current engines, environment variables, capabilities, limits, and typed options.
4. Explain normalized fields, safe raw data, provider-local scores, and unsupported common parameters.
5. Verify every command exists and every capability matches source constants.
6. Run `pnpm typecheck` and Markdown-link validation.
7. Commit as `docs: add onboarding and provider guides`.

### Task 5: Rebuild API, development, architecture, and roadmap guides

**Objective:** Document stable public contracts and maintainer boundaries without duplicating source declarations.

**Files:**
- Create: `docs/api-reference.md`
- Create: `docs/development.md`
- Create: `docs/architecture.md`
- Create: `docs/roadmap.md`
- Create: `docs/adr/0001-v0.1-architecture-baseline.md`
- Modify: `TECHNICAL_DESIGN.md`

**Steps:**
1. Document `SearchSuiteOptions`, `SearchRequest`, `SearchResponse`, warnings, errors, cancellation, timeout, and injected fetch.
2. Document Node/pnpm setup, offline tests, explicit Live Tests, build, publint, pack, and clean consumer verification.
3. Document Client/Registry/Adapter responsibilities, lazy imports, request flow, redaction, and v0.1 exclusions.
4. Rewrite the roadmap as completed v0.1 scope plus deferred provider/operational/composition work.
5. Preserve the v0.1 architectural reasoning in ADR-0001 and update technical-design navigation/status to match implemented reality.
6. Run Markdown-link validation and scan for stale references to deleted documents.
7. Commit as `docs: rebuild SDK reference and architecture guides`.

### Task 6: Add contribution, security, conduct, and support policies

**Objective:** Establish clear contribution and reporting contracts using recognized GitHub community files.

**Files:**
- Create: `CONTRIBUTING.md`
- Create: `SECURITY.md`
- Create: `CODE_OF_CONDUCT.md`
- Create: `SUPPORT.md`

**Steps:**
1. Document prerequisites, local setup, commands, offline/Live test separation, fixture redaction, provider checklist, public behavior review, and scope boundaries.
2. Document pre-release supported-version status, GitHub private reporting, required vulnerability details, and credential rotation guidance.
3. Add Contributor Covenant 2.1 with the repository maintainer and private repository reporting route as enforcement contact.
4. Route usage questions, bugs, provider compatibility issues, feature requests, and security reports to appropriate channels.
5. Scan all files for placeholder emails, credentials, and impossible response-time promises.
6. Commit as `docs: add community health policies`.

### Task 7: Add structured issue and pull request templates

**Objective:** Collect actionable, secret-safe bug, provider compatibility, feature, and PR reports.

**Files:**
- Create: `.github/ISSUE_TEMPLATE/bug.yml`
- Create: `.github/ISSUE_TEMPLATE/provider-compatibility.yml`
- Create: `.github/ISSUE_TEMPLATE/feature.yml`
- Create: `.github/ISSUE_TEMPLATE/config.yml`
- Create: `.github/PULL_REQUEST_TEMPLATE.md`

**Steps:**
1. Add required environment, reproduction, expected/actual, and redacted-error fields to the bug form.
2. Add provider, engine, account context, upstream documentation, sanitized response shape, and regression fields to the compatibility form.
3. Add problem, use case, proposed common/provider-specific behavior, alternatives, and public API impact fields to the feature form.
4. Disable blank issues and route security reports to `SECURITY.md`/private reporting.
5. Add PR checks for tests, docs, capability matrix, changelog, ADR, runtime dependencies, network isolation, and secrets.
6. Parse all YAML files with the available workspace YAML parser or a read-only Ruby/Python parser.
7. Commit as `docs: add GitHub contribution templates`.

### Task 8: Normalize changelog and maintainer checklist

**Objective:** Record the documentation refresh and make pre-release/release status unambiguous.

**Files:**
- Modify: `CHANGELOG.md`
- Create: `docs/maintainer-checklist.md`
- Modify: `docs/README.md`

**Steps:**
1. Keep `[Unreleased]`, normalize entries into Keep a Changelog categories, and record the documentation/community refresh.
2. Document the v0.x SemVer policy without claiming npm publication.
3. Add platform tasks for repository description/topics, social preview, private vulnerability reporting, branch protection, npm ownership, Trusted Publishing, and provenance.
4. Link the checklist from the docs index but distinguish local verification from platform state.
5. Run placeholder and stale-status scans.
6. Commit as `docs: add release and maintainer guidance`.

### Task 9: Validate the complete documentation and package

**Objective:** Prove that the refreshed documentation matches the buildable, packable SDK and contains no broken navigation.

**Files:**
- Modify only files required to fix validation findings

**Steps:**
1. Run `git diff --check`; expect no whitespace errors.
2. Scan every Markdown relative link; expect zero missing targets.
3. Compare English/Chinese README headings and fenced code blocks; expect aligned structure.
4. Run `pnpm typecheck`, `pnpm lint`, and offline `pnpm test`; expect all to pass without network access.
5. Run `pnpm build` and `pnpm exec publint`; expect valid ESM and declarations.
6. Run `pnpm pack --pack-destination .tmp` and inspect the tarball; expect only `dist`, both READMEs, LICENSE, CHANGELOG, and package metadata.
7. Install the tarball into a clean temporary Node.js 24 consumer and verify ESM import plus public declarations.
8. Scan tracked public files for placeholder owner/repository values, fake badges, secrets, stale deleted-doc references, and false npm publication claims.
9. Commit any final fixes as `docs: finalize open-source documentation`.

## Final review checklist

- [ ] `README.md` and `README.zh-CN.md` are synchronized five-minute entry points.
- [ ] All provider facts match implemented adapters and types.
- [ ] Public docs contain no speculative SDK behavior.
- [ ] Community files use real repository links and private security routing.
- [ ] Package metadata points to `https://github.com/yugasun/SearchSuite`.
- [ ] Zero runtime dependencies and ESM-only exports remain unchanged.
- [ ] Offline validation makes no network request.
- [ ] Packed artifact imports and resolves declarations in a clean Node.js 24 project.
