# Tests

All automated tests for Tippani live in this folder, organized by layer.

```
tests/
├── setup.ts          Vitest setup (jest-dom matchers, RTL cleanup)
├── unit/             Pure logic + thin wrappers (Vitest)
└── component/        React component tests (Vitest + React Testing Library)
```

Rust-side tests for Tauri commands live next to the code they test, in `src-tauri/src/commands/*.rs` under `#[cfg(test)] mod tests`. They are run with `cargo test`.

## Running

```bash
# Frontend (Vitest, jsdom)
npm test               # one-shot
npm run test:watch     # watch mode
npm run test:ui        # browser UI (requires @vitest/ui, optional)

# Rust (Tauri commands)
cargo test --manifest-path src-tauri/Cargo.toml
```

## Conventions

- One `*.test.ts` / `*.test.tsx` file per unit / component.
- Module mocks (e.g. `@tauri-apps/api/core`) go at the top of the test file via `vi.mock(...)`.
- Component tests use Testing Library queries (`getByRole`, `getByText`); avoid testing implementation details (DOM structure, internal class names).
- Rust tests use `tempfile::TempDir` for filesystem isolation — never write into the real filesystem outside the temp dir.

## Adding a new test

1. Create `tests/unit/my-thing.test.ts` (or `tests/component/MyComponent.test.tsx`).
2. Import the unit under test with a relative path (`../../src/lib/...`).
3. Mock external boundaries (`@tauri-apps/*`, `src/lib/tauri.ts`) — never hit a real Tauri runtime.
4. Run `npm test` and verify it passes.
