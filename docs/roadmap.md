# Roadmap

SearchSuite v0.1 is implemented locally and remains pre-release. This roadmap
describes possible directions, not commitments, dates, or reserved public APIs.

## Current: prepare v0.1 for release

The repository already contains the framework-independent TypeScript SDK, five
provider adapters, typed Provider options, normalized results, structured errors,
cancellation, offline tests, credential-gated live tests, examples, and an ESM
build.

Release readiness still requires:

- complete the public documentation and community-file review;
- run the full offline quality suite on Node.js 24;
- create and inspect the npm tarball;
- install that tarball in a clean Node.js 24 ESM and TypeScript consumer;
- confirm repository security and release settings;
- publish to npm and verify installation from the registry.

Until those checks and publication are complete, documentation should describe
v0.1 as locally testable rather than generally available.

## Later: provider coverage and portability

After v0.1 is stable, provider coverage can grow in response to concrete user
needs. Work in this phase should improve the portable search contract and
adapter quality without adding speculative engines or vendor-specific fields to
common types.

Possible work includes:

- compatibility fixtures for real provider response changes;
- clearer capability discovery based on implemented adapter behavior;
- additional providers or engines backed by maintained contract tests;
- stronger portability guidance for safe `raw` and provider options.

Each addition must preserve thin adapters, explicit lazy registration, offline
tests, and zero core routing behavior.

## Later: optional operational and routing layer

Applications may eventually need retry policies, fallback, multi-key handling,
quota awareness, or cost and quality selection. If implemented, these belong in
an optional layer above the single-provider SDK contract. The adapter core
should remain deterministic: one selected Provider and one provider request.

An operational layer must expose request-count and selection behavior rather
than hiding it inside adapters. It is not part of v0.1.

## Later: composition

Federated search, parallel queries, result fusion, reranking, extraction, and
crawling are separate composition concerns. They should be considered only
after the single-provider contracts are stable and there are concrete use cases
for their cost, cancellation, provenance, and partial-failure semantics.

No composition API is implemented or promised today.

## Later: ecosystem consumers

`dsh-web-search` consumes SearchSuite so its DeepSeek Harness integration can
reuse provider compatibility work. SearchSuite exports a `WebFetchProvider`
contract that is structurally compatible with dsh-web's content provider seam,
while `SearchSuite.fetch({ provider, url })` handles Tavily and Exa content
retrieval behind the provider-neutral API.
That dependency should point from the integration to SearchSuite; SearchSuite
core must remain independent of dsh and other agent frameworks.

A dsh plugin is not part of this package or the v0.1 release; the integration
remains a separate consumer.

## How roadmap items become work

A roadmap idea becomes a candidate only when it has a demonstrated user need,
a clear ownership boundary, testable behavior, and an understood impact on the
public contract. Accepted behavior changes must be recorded in
[`TECHNICAL_DESIGN.md`](../TECHNICAL_DESIGN.md) and the relevant public guide.
The roadmap itself does not confer support or compatibility guarantees.
