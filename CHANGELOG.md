# Changelog

## 0.1.2 - 2026-09-24

### Changed

- Refresh toolchain pins: `@biomejs/biome` 2.5.5 → 2.5.14, `vitest` ^4.1.8 → 5.0.1, `@types/node` ^25.9.2 → 26.6.2, `@typescript/native-preview` → 7.0.0-dev.20260707.2. `typescript` stays at 7.0.2.
- Add `@earendil-works/pi-coding-agent` 0.87.1 as an exact devDependency so tests typecheck against the current upstream runtime. Peer remains `@earendil-works/pi-coding-agent` `*`.
- Raise `engines.node` to `>=22.19.0`.
- CI uses Bun 1.4.2 (`oven-sh/setup-bun@v2`) with a Node 22/24 × ubuntu/macos matrix, plus an `npm-consumer` job (`npm ci` + `npm test`). Checkout/setup-node move to v7.
- Development docs prefer Bun while keeping npm consumer install instructions.

### Fixed

- Closes #1 (dependency refresh and Bun 1.4.2 CI).
