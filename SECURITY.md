# Security Policy

## Supported versions

SearchSuite has not published a stable release. The unreleased `main` branch is
pre-release software and receives security fixes on a best-effort basis; it is
not a supported production release. Historical commits and local builds are not
maintained as separate release lines.

When packages are published, this section will identify maintained versions.
Until then, do not infer support for a version from its presence in the
repository or changelog.

## Report a vulnerability privately

Do not open a public issue or pull request for a suspected vulnerability.

Use GitHub's private advisory form at
<https://github.com/yugasun/SearchSuite/security/advisories/new> if Private
Vulnerability Reporting is enabled for the repository. If that form is
unavailable, contact the maintainer [@yugasun](https://github.com/yugasun)
through private contact details published on the maintainer's GitHub profile.
Do not send exploit details through a public channel.

Include, when safely available:

- the affected commit, package version, provider, and engine;
- the impact and realistic attack scenario;
- minimal reproduction steps or a proof of concept;
- relevant Node.js and operating-system versions;
- suggested mitigations, if known; and
- whether the issue has been disclosed elsewhere.

Do not include live API keys, authorization headers, cookies, `.env` files,
provider account data, personal search queries, or unsanitized `raw` payloads.
Use placeholders and the smallest redacted excerpt that demonstrates the issue.

Maintainers will assess reports and coordinate remediation and disclosure when
possible. Because the project is currently pre-release and community-maintained,
no acknowledgement, fix, or disclosure service level is promised.

## Security considerations

SearchSuite is intended for server-side use. Provider credentials must remain
outside browser bundles, client-visible responses, source control, examples,
fixtures, and logs. Applications are responsible for access control around
their SearchSuite instance and returned search data.

Security-sensitive areas include:

- credential or authentication-header disclosure in errors, logs, fixtures, or
  `raw` data;
- forwarding a provider key to an untrusted explicitly configured `baseUrl`;
- unsafe handling of provider-controlled URLs, titles, snippets, content, and
  metadata by consuming applications;
- cancellation, timeout, or response-size behavior that can contribute to
  resource exhaustion; and
- provider response changes that bypass validation or redaction assumptions.

Redaction is defense in depth, not a guarantee that provider data is safe to
publish. Review all logs and payloads before sharing them. If a provider key may
have been exposed, revoke or rotate it with the provider immediately, then
remove the leaked material from every accessible location.
