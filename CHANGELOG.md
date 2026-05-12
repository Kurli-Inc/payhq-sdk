# Changelog

All notable changes to this project are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-05-12

Initial public release. This package is a minimal TypeScript wrapper around the
PayHQ (Payfirma) HTTP APIs—not a broad platform SDK.

Because the major version is **0**, minor and patch releases under `0.x` may
include breaking changes until **1.0.0**. Pin dependencies accordingly (for
example `^0.1.0` or an exact version).

### Added

- OAuth 2.0 (`sdk.auth`)
- [Customer API](https://developer.payfirma.com/api/customer) (`sdk.customers`)
- [Transaction API](https://developer.payfirma.com/api/transaction) (`sdk.transactions`)
- [Card Terminal API](https://developer.payfirma.com/api/card-terminal) (`sdk.terminals`)
- CommonJS and ESM builds with TypeScript declarations (`dist/index.js`,
  `dist/index.mjs`, `dist/index.d.ts`)

### Not included

Plans / recurring billing, Invoices, EFT, and other Payfirma endpoints are not
wrapped. Use the REST API directly with a bearer token from
`sdk.auth.getCredentials()` if you need those.

### Security

- Request bodies are not attached to thrown HTTP errors.
- Debug logging is opt-in (`debug: true`) and redacts PAN, CVV, and OAuth-style
  secrets.

[Unreleased]: https://github.com/Kurli-Inc/payhq-sdk/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Kurli-Inc/payhq-sdk/releases/tag/v0.1.0
