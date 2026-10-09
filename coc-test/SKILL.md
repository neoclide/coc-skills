---
name: coc-test
description: Add, migrate, or repair coc-test integration-test support for a coc.nvim extension without breaking the extension's existing tests, build, Vim/Neovim compatibility, or coc-specific behavior. Use when a coc.nvim plugin needs to run integration tests through coc-test, replace ad-hoc coc.nvim test harness code, add package scripts/CI coverage for coc-test, or make existing integration tests compatible with coc-test.
---

# Add coc-test Integration Tests

Make the smallest reliable change that runs the extension's coc.nvim integration tests through `coc-test`, while preserving existing unit tests and project conventions.

## Rules

1. Inspect before modifying. Do not assume a package manager, test runner, test directory, or TypeScript layout.
2. Keep pure unit tests on their existing runner. Use coc-test only for tests that need a running coc.nvim with Vim/Neovim.
3. Migrate additively: remove an old harness only after coc-test covers and verifies the same behavior.
4. Use the project's package manager: `package.json#packageManager` first, then the lockfile (`package-lock.json` npm, `pnpm-lock.yaml` pnpm, `yarn.lock` yarn, `bun.lock`/`bun.lockb` bun).
5. Do not guess the coc-test API. Check `npx coc-test --help`, its README, or its types for the installed version before using anything not listed below.
6. Port test intent, not a VS Code test harness. Never add `vscode-test`, `@vscode/test-*`, Electron, or extension-host assumptions, and never replace coc.nvim APIs with VS Code APIs to reuse upstream tests.
7. Add a GitHub Actions workflow for the integration tests, plus a CI badge in `README.md`, when they are missing.

## coc-test essentials

```text
coc-test [options] <files ...>   # files or glob patterns
coc-test --init                  # interactive setup (config, starter test, script, CI)
```

| Option | Purpose |
| --- | --- |
| `--nvim` / `--vim` | Select the editor. Neovim is the default. |
| `-t, --test-name-pattern <pattern>` | Run only tests whose name matches. |
| `-u, --use <version>` | Use a specific coc.nvim release tag (latest by default). |
| `--coc-path <dir>` | Use an existing coc.nvim build; `COC_TEST_COC_PATH` does the same. |
| `-d, --download` | Force a fresh coc.nvim download. |
| `-w, --watch` | Rerun affected tests on change. |
| `--force-exit` | Force exit when the suite leaves handles alive. Prefer fixing the leak. |

- Each test file runs in its own child process with its own editor, coc.nvim instance, and data directory.
- Tests use `node:test` (`describe`, `it`, `before`, `after`, `beforeEach`, `afterEach`; there is no `beforeAll`/`afterAll`). Imports from `coc.nvim` refer to the live coc.nvim instance.
- `GITHUB_TOKEN` or `GH_TOKEN` authenticates the coc.nvim download and avoids GitHub API rate limits in CI.

### Prefer `entryFile`

```json
{
  "coc-test": {
    "entryFile": "src/index.ts"
  }
}
```

With `entryFile`, coc-test bundles the source in memory and activates it instead of `main`. Tests import source modules with relative paths and share the same module instances as the running extension:

```ts
import { store } from '../src/store.ts'
```

No build step is needed. coc-test scripts must not prepend `npm run build &&` (or an equivalent), and lifecycle hooks whose only purpose is building before those scripts should be removed.

Other `coc-test` keys: `user-settings` (initial coc.nvim settings), `setup` (a `.js`/`.cjs`/`.mjs` module run before the extension loads), `externals` (esbuild externals for the bundle), and `target` (`"commonjs"` by default, or `"esm"`, which requires Node.js 24+).

Test compiled output only when `entryFile` cannot be used: the installed coc-test lacks it, or tests must exercise the exact `main` artifact. Then build explicitly before running coc-test using the repository's existing build script and script style, and make the test import path resolve to the same file as `main`.

### Configuration in tests

`WorkspaceConfiguration.update(key, value)` defaults to the workspace-folder target, which writes a real `.vim/coc-settings.json` that persists across runs. In tests, pass `true` (or `ConfigurationTarget.Global`) to update the user configuration, which coc-test isolates in a per-process temporary directory, and reset every changed value in `after`/`afterEach`. Put fixed initial settings in `coc-test.user-settings`.

## Workflow

### 1. Inspect the repository

Read `package.json`, `tsconfig.json`, the lockfile, test-runner configuration, existing integration tests and helpers, and CI workflows. Search for `coc.nvim`, `@chemzqm/neovim`, `helper.setup`, `jest`, `vitest`, `mocha`, `node:test`, `integration`, and `e2e`.

Determine the Node.js constraint, module format, unit-test runner, any existing integration harness and file patterns, whether tests start Vim/Neovim themselves, whether CI provides editors, and whether tests depend on built output. Do not edit until these are known.

### 2. Classify tests

- **Unit tests** (parsers, config transforms, utilities, protocol conversion, mocked APIs): keep on the existing runner.
- **Integration tests** (anything needing `workspace`, `window`, `commands`, `languages`, `services`, real buffers, Vim/Neovim RPC, or activation/deactivation): run through coc-test.

Do not migrate unit tests merely to standardize tooling.

### 3. Add the dependency

If `coc-test` is not declared, add it as a dev dependency with the detected package manager (`npm install -D coc-test`, `pnpm add -D coc-test`, `yarn add -D coc-test`, `bun add -d coc-test`). Let the package manager resolve the version unless the repository pins versions. In a monorepo, add it to the package that owns the extension, not automatically to the root.

### 4. Add scripts

```json
{
  "scripts": {
    "test": "...existing unit-test command...",
    "test:integration": "coc-test \"test/**/*.test.ts\"",
    "test:integration:vim": "coc-test --vim \"test/**/*.test.ts\""
  }
}
```

- Use the repository's real test path and quote globs.
- Keep the existing `test` script unless the repository already treats integration tests as part of it; do not make unit tests silently depend on Vim/Neovim.
- Add a Vim script only when Vim is supported or used by CI.

### 5. Adapt the tests

Reuse existing assertions and test cases. Remove only harness code that coc-test now owns: downloading or locating coc.nvim, spawning Vim/Neovim, opening RPC channels, editing runtimepath, loading coc.nvim's `build/index.js`, custom launchers, name filtering, and force-killing the editor.

Keep project-specific setup: fixtures, workspace initialization, plugin configuration, activation, mocked services, language-server setup, and cleanup of plugin-owned resources. Do not start a second editor lifecycle inside tests. If a shared helper exists, adapt it once instead of patching every test file.

Keep coc.nvim activation, API imports, configuration behavior, and Vim/Neovim-specific behavior even when the extension tracks a VS Code upstream.

### 6. CI

Keep unit tests as a separate step. Run coc-test after dependencies (and build output, only when required) are ready, install the needed editor (inspect the existing environment; on Ubuntu, `sudo apt-get install -y neovim vim`), and pass `GITHUB_TOKEN` to the coc-test step. Use a small `nvim`/`vim` matrix only when the extension supports Vim; do not multiply the suite across unrelated matrix dimensions.

### 7. Verify

Run in order: install/lockfile consistency, typecheck or build, existing unit tests, one coc-test file, the full coc-test suite, then the Vim variant when supported. Narrow failures with `coc-test -t "<test name>" <file>`.

Attribute failures to the right layer before fixing:

- **Plugin**: activation fails, command missing, edit not applied, leaked resources. Fix the plugin or test setup.
- **Migration**: required setup was removed, tests run before activation completes, fixture paths changed, cleanup destroys coc-test-owned resources. Fix the migration.
- **Environment**: editor missing, coc.nvim version unresolved, unsupported option, incompatible Node.js. Fix configuration; do not change plugin behavior to hide it.

## Done when

- `coc-test` is a dev dependency with a clear integration script, and the existing unit-test behavior is unchanged.
- Tests no longer duplicate coc-test's editor/coc.nvim bootstrapping; plugin-specific setup and cleanup remain.
- Internal modules are imported via `entryFile` (preferred) or verified built output.
- Build/typecheck, unit tests, and the integration suite pass (Vim too when supported), or the environment blocker is reported.
- No VS Code test host or removal of coc-specific behavior was introduced.

Report the files changed, scripts added, harness code removed or kept (with reasons), commands run with results, and remaining blockers. Never claim integration tests pass unless they ran successfully.
