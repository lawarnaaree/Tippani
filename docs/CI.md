# CI Pipeline

Tippani's CI is a single GitHub Actions workflow at [.github/workflows/ci.yml](../.github/workflows/ci.yml). It enforces every gate that should pass locally before code merges.

## Triggers

| Event          | Branches                |
| -------------- | ----------------------- |
| `push`         | `main`, `dev`, `staging`|
| `pull_request` | targeting `main`, `dev`, `staging` |
| Manual         | `workflow_dispatch`     |

In-progress runs for the same ref are cancelled when a new commit lands (`concurrency.cancel-in-progress: true`) so the queue stays current.

## Jobs

The workflow has three jobs. The first two run in parallel; the third gates merge by aggregating their statuses.

### `frontend` — Ubuntu, ~2 min

1. `actions/checkout@v4`
2. `actions/setup-node@v4` with Node 22 + npm cache
3. `npm ci` — strict lockfile install
4. `npx tsc --noEmit` — strict TypeScript type-check
5. `npm test` — Vitest (jsdom env, all suites under [tests/](../tests/))
6. `npm run build` — production Vite + tsc build (catches code that compiles in dev but breaks in prod)

### `rust` — Ubuntu + Windows matrix, ~5–10 min

Matrix with `fail-fast: false` so a Windows-only failure still surfaces the Linux result, and vice versa.

1. `actions/checkout@v4`
2. **Linux only** — install WebKit / GTK system headers (`libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`, `libsoup-3.0-dev`, `libjavascriptcoregtk-4.1-dev`, `build-essential`). Tauri 2 will not compile without them.
3. `dtolnay/rust-toolchain@stable` with `rustfmt` + `clippy`
4. `Swatinem/rust-cache@v2` — caches `~/.cargo/registry`, `~/.cargo/git`, and `src-tauri/target`
5. `cargo fmt --all -- --check` — formatting gate (no auto-fix)
6. `cargo clippy --all-targets -- -D warnings` — lint gate, warnings are errors
7. `cargo test` — every `#[test]` (currently all in [src-tauri/src/commands/vault.rs](../src-tauri/src/commands/vault.rs))

Both OSes are tested because Tippani's command surface is heavy on file paths — Windows-vs-Unix path edge cases must be caught early.

### `ci-success` — required status check

Aggregates `frontend` + `rust` results. Configure your branch protection rule to require **`CI success`** as the only check; jobs added later are picked up automatically.

## Reproducing locally

Run the same commands the CI runs:

```bash
npm ci
npx tsc --noEmit
npm test
npm run build

cd src-tauri
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
cargo test
```

If a gate fails locally, fix it before pushing — CI will reject the same way.

## Dependabot

Weekly dependency PRs are configured at [.github/dependabot.yml](../.github/dependabot.yml):
- npm — Mondays 06:00 UTC, dev/prod groups split
- cargo (under `src-tauri/`) — Mondays 06:00 UTC
- GitHub Actions — monthly

All dependabot PRs run through the same CI gates, so no manual reverification is needed when they're green.

## Not in CI yet

These belong to later features and will be added when those features land:
- **Tauri release bundles** (`.msi` / `.dmg` / `.AppImage`) — F7 will add `release.yml` with a release matrix.
- **E2E browser tests** (Playwright on the Tauri webview) — out of scope for v1.
- **Code coverage upload** — add when there's something actionable to track.

## Cost / runtime expectations

| Job                  | Cold cache | Warm cache |
| -------------------- | ---------- | ---------- |
| `frontend`           | ~3 min     | ~1.5 min   |
| `rust` (Ubuntu)      | ~10 min    | ~2 min     |
| `rust` (Windows)     | ~12 min    | ~3 min     |
| Total wall-clock     | ~12 min    | ~3 min     |

Rust matrix dominates cold runs because it has to compile Tauri once per OS. After `Swatinem/rust-cache` warms up, the dominant cost is the test compilation itself.
