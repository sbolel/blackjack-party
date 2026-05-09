# Release Readiness Checklist

Use this checklist for the first public open-source release and near-term stabilization work.

## Public Docs

- README describes the current app without overclaiming multiplayer hardening.
- `CONTRIBUTING.md` explains setup, validation, branch, commit, issue, and pull request expectations.
- `SECURITY.md` gives project-specific vulnerability reporting guidance.
- `CODE_OF_CONDUCT.md` sets basic participation expectations.
- License remains MIT with the current project copyright.

## Validation

- `npm run validate` passes on the release branch.
- `npm run qa:local` passes on the release branch.
- Any CI workflow added in a separate lane runs the same documented validation commands.
- Documentation-only changes have their changed Markdown inspected.

## Gameplay Scope

- Current playable flow in `src/App.tsx` remains stable.
- Pure engine migration in `src/lib/engine.ts` is not required for the first public release unless validation proves the current path is untenable.
- Multiplayer conflict handling is described conservatively until hardened.
- No real-money gambling, wagering, payouts, or gambling-service integrations are added.

## Release Notes

- List notable gameplay, docs, test, and dependency changes.
- Call out known limitations directly.
- Link to validation results when available.
- Keep Spark runtime requirements visible.

## Deferred Work

- Full pure-engine migration.
- Stronger multiplayer conflict handling.
- Broader Playwright coverage beyond the local hot-seat smoke test.
- Additional contributor automation after issue and pull request templates land.
