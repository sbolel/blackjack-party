# Blackjack 3D

Blackjack 3D is a browser-based blackjack game with local and online play, Spark KV-backed room state, and a 3D-styled table UI.

This repository is being stabilized for a first public release. The current playable game flow lives primarily in `src/App.tsx`. A fuller pure-engine migration exists in `src/lib/engine.ts`, but that migration is deferred until it can be validated without disrupting the current playable path.

## Current Status

- First public-release stabilization is in progress.
- The app is intended for casual browser play, not real-money gambling.
- Local play and Spark-backed online room flow are part of the current app direction.
- Multiplayer conflict handling may still need hardening before broader use.
- The pure blackjack engine work is present but not yet the main runtime path.

## Quick Start

```sh
npm install
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

Run the Playwright QA smoke test against the local preview build:

```sh
npm run qa:local
```

The Playwright config builds the app and serves it from `http://localhost:3000` by default. Override that with `HOST`, `PORT`, `PLAYWRIGHT_BASE_URL`, or `PLAYWRIGHT_CHANNEL` when needed.

## Known Limitations

- Requires the Spark runtime and Spark KV APIs for online room state.
- The current playable flow is still centered in `src/App.tsx`.
- Full migration to the pure engine in `src/lib/engine.ts` is pending.
- Multiplayer state conflict handling may need additional release hardening.
- No real-money gambling, wagering, payouts, or gambling services are supported.

## License

MIT. See [LICENSE](./LICENSE).
