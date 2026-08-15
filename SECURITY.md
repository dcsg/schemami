# Security policy

## Supported versions

Schemami v1 receives security fixes on the latest `1.x` release. Pre-release
RCP history and unpublished development snapshots are unsupported.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use the repository's
GitHub Security Advisory flow to report it privately. If that flow is not
available, contact the `dcsg` maintainer privately through GitHub before public
disclosure.

Include the affected version, reproduction steps, impact, and any suggested
mitigation. Never include private recipe sources, credentials, or personal data
in a report.

## Scope

Security reports may cover strict parsing, admission bypass, canonical identity,
resource-budget enforcement, package integrity, the browser playground, and
release infrastructure. Application policies and third-party AI providers are
outside Schemami's security boundary unless the defect is in a Schemami-owned
artifact.
