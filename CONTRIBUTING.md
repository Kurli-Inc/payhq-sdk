# Contributing to `payhq-sdk`

Thanks for taking the time to contribute. This SDK is a thin TypeScript wrapper
around the [Payfirma developer API](https://developer.payfirma.com), maintained
by [Kurli Inc.](https://github.com/Kurli-Inc) and not affiliated with PayHQ /
Payfirma.

## Reporting bugs and security issues

- For bugs that don't involve credentials or unpatched vulnerabilities, open an
  issue at <https://github.com/Kurli-Inc/payhq-sdk/issues>.
- For anything that looks like a security issue (token leaks, payload leaks,
  authorization bypass, etc.) please email the maintainers privately rather
  than opening a public issue, so we have a chance to ship a fix.

## Local development

```bash
git clone https://github.com/Kurli-Inc/payhq-sdk.git
cd payhq-sdk
nvm use            # honours .nvmrc
npm install
npm run build
npm test           # unit tests; no credentials required
npm run lint
```

The repo includes a `.env.example`. To run integration tests against the
Payfirma sandbox you will need your own sandbox credentials:

```bash
cp .env.example .env
# fill in PAYHQ_CLIENT_ID and PAYHQ_CLIENT_SECRET
set -o allexport; . .env; set +o allexport
npm run test:integration
```

Never commit credentials, sandbox or production. `.env` is gitignored.

## Style

- TypeScript strict mode (see `tsconfig.json`).
- ESLint + Prettier (`npm run lint:fix`).
- Tests live in `tests/unit` (no network) and `tests/*.test.ts` (integration).
- Prefer test-first changes; for behavior changes, please add or update unit
  tests in `tests/unit`.

## Pull requests

- Keep changes small and focused. If you spot adjacent issues, mention them in
  the PR rather than expanding the diff.
- Update `CHANGELOG.md` under an `Unreleased` section for any user-visible
  change.
- Do not add new top-level public exports without an accompanying test in
  `tests/unit/publicApi.test.ts`.

## Scope of this version

`payhq-sdk@0.x` only wraps three Payfirma APIs (Customer, Transaction, Card
Terminal) plus OAuth. Broader coverage may land in future `0.x` or `1.x`
releases. Please open an issue to discuss before sending a large PR.
