# Contributing to Blackjack Party

Thanks for helping improve Blackjack Party.

This project is a casual browser blackjack game. It does not support real-money gambling, wagering, payouts, or gambling-service integrations.

## Local Setup

Install dependencies:

```sh
npm install
```

Start the app locally:

```sh
npm run dev
```

Build the app:

```sh
npm run build
```

Run the release validation gate:

```sh
npm run validate
```

Run the local Playwright QA smoke test:

```sh
npm run qa:local
```

## Development Scope

- Keep gameplay changes focused and easy to review.
- Preserve the current playable flow in `src/App.tsx` unless the change is explicitly part of the engine migration.
- Treat `src/lib/engine.ts` as the deferred pure-engine path until that migration is planned and validated.
- Keep Spark KV online room behavior honest in docs and tests. Do not claim stronger multiplayer guarantees than the code validates.
- Keep the project casual and browser-first. Do not add real-money gambling behavior.

## Branches and Commits

- Create focused branches from the latest `main`.
- Use conventional commit subjects, such as `docs: update setup guide` or `fix(game): correct dealer payout`.
- Keep commits scoped to one concern when practical.
- Include tests or validation output in the pull request when behavior changes.

## Issues and Pull Requests

- Before filing a large issue or PR, check whether the same work is already being discussed.
- Describe the user-visible behavior, reproduction steps, and expected behavior for bugs.
- For gameplay changes, include the affected mode: local hot-seat, online room flow, or shared game logic.
- For documentation changes, keep wording concise and avoid claims that are not validated by the current app.
- Do not include secrets, private room data, or local machine paths in issues, commits, or screenshots.

## Validation Expectations

For documentation-only changes, inspect the changed Markdown files before opening a pull request.

For code or config changes, run:

```sh
npm run validate
```

For user-flow changes, also run:

```sh
npm run qa:local
```

If a command cannot be run locally, note that clearly in the pull request.
