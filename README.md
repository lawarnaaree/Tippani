# Tippani

[![CI](https://github.com/lawarnaaree/Tippani/actions/workflows/ci.yml/badge.svg)](https://github.com/lawarnaaree/Tippani/actions/workflows/ci.yml)

A local-first cross-platform desktop notes app — markdown notes, freeform canvas, diagram-as-code, and a `⌘K` command palette. Notes are plain `.md` files in a folder you choose; no lock-in.

**Stack:** Tauri 2 · React 19 · TypeScript · Vite · Tailwind CSS v4 · Zustand.

## Status

Early development. See [docs/FEATURES.md](docs/FEATURES.md) for the feature roadmap and current status.

## Develop

```bash
npm install
npm run tauri dev
```

## Build

```bash
npm run tauri build
```

Produces native installers under `src-tauri/target/release/bundle/`.

## Test

```bash
npm test                                                # frontend (Vitest)
cargo test --manifest-path src-tauri/Cargo.toml         # rust (Cargo)
```

See [tests/README.md](tests/README.md) for the test layout.

## CI

GitHub Actions runs on every push to `main` / `dev` / `staging` and on PRs targeting them. See [docs/CI.md](docs/CI.md) for the gate list.

## Recommended IDE setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
