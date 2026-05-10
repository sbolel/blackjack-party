# Architecture Notes

This note describes the current public-release shape of Blackjack 3D. It is intentionally short and reflects the repository as it exists now.

## Runtime Shape

- The app is a browser-based React/Vite game.
- The current playable flow is centered in `src/App.tsx`.
- Spark KV supports online room state.
- The UI presents a 3D-styled blackjack table experience.
- Local hot-seat QA is covered by `npm run qa:local`.

## Game Logic

The current release path keeps the playable `src/App.tsx` flow stable.

A pure engine exists in `src/lib/engine.ts`, with related type and validation work in `src/lib/types.ts` and `src/lib/validator.ts`. That engine migration is deferred until it can be validated without disrupting the current app flow.

For now:

- avoid mixing broad engine migration work into unrelated gameplay fixes
- keep source-of-truth behavior clear in reviews
- document whether a change affects the current `src/App.tsx` path, the deferred engine path, or both

## Online State

Online room state uses Spark KV. Treat multiplayer behavior as browser-game room state, not as a hardened authoritative server model.

Public docs and pull requests should avoid claiming conflict handling or synchronization guarantees beyond what the code and Playwright QA validate.

## Validation Commands

Use the package scripts as the source of truth:

```sh
npm run validate
npm run qa:local
```

`npm run validate` runs typecheck, lint, and build. `npm run qa:local` runs the local hot-seat Playwright smoke test.
