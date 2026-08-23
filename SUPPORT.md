# Support

SearchSuite is pre-release, community-maintained software. There is no guaranteed
support or response time.

## Start with the documentation

Before opening a report, check:

- [Getting started](docs/getting-started.md) for installation, credentials,
  `.env`, first-search, and live-test guidance;
- [Providers](docs/providers.md) for engines, options, limits, and capabilities;
- [API reference](docs/api-reference.md) for requests, responses, warnings,
  errors, timeouts, cancellation, and safe `raw` handling; and
- existing [GitHub issues](https://github.com/yugasun/SearchSuite/issues) for a
  matching report.

## SDK bugs, compatibility, and feature requests

Use the [GitHub issue chooser](https://github.com/yugasun/SearchSuite/issues/new/choose)
for:

- reproducible SearchSuite SDK bugs;
- provider request or response compatibility regressions; and
- focused feature or provider requests within the project scope.

Include the SearchSuite commit or package version, Node.js version, engine,
expected and actual behavior, and the smallest reproducible example. Sanitize
all examples and logs. Never include provider keys, authorization headers,
cookies, `.env` contents, personal queries, account details, or unsanitized
provider/`raw` payloads.

## Provider service and account issues

Contact the upstream provider for outages, dashboard or account access,
subscriptions, billing, quotas, credential issuance, and product availability.
SearchSuite maintainers cannot inspect or change a provider account.

If an upstream API change appears to break SearchSuite, open a sanitized
provider compatibility report through the issue chooser after checking the
provider's service status.

## Security and confidential conduct reports

Do not use a public issue for vulnerabilities or confidential conduct reports.
Follow the private reporting route in [SECURITY.md](SECURITY.md). Conduct
expectations and enforcement are described in
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
