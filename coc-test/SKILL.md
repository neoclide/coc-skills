---
name: coc-test
description: Add, migrate, or repair coc-test integration-test support for a coc.nvim extension without breaking the extension's existing tests, build, Vim/Neovim compatibility, or coc-specific behavior. Use when a coc.nvim plugin needs to run integration tests through coc-test, replace ad-hoc coc.nvim test harness code, add package scripts/CI coverage for coc-test, or make existing integration tests compatible with coc-test.
---

# coc-test integration skill

Use this skill for **coc.nvim extension repositories** that need integration-test support through `coc-test`.

The goal is to make the smallest reliable change that lets the plugin execute its coc.nvim integration tests through `coc-test`, while preserving existing unit tests and project-specific behavior.

## Core rules

1. **Inspect before modifying.**
   Never assume the repository uses npm, Jest, Vitest, Mocha, a specific test directory, or a specific TypeScript layout.

2. **Do not replace working unit tests with coc-test.**
   `coc-test` is for tests that require a running coc.nvim + Vim/Neovim environment.
   Keep pure unit tests on the existing test runner unless there is a concrete reason to move them.

3. **Prefer additive migration.**
   Add coc-test support first. Remove an old integration harness only after the same behavior is covered and verified through coc-test.

4. **Preserve coc-specific behavior.**
   Do not copy VSCode test infrastructure into the project when coc.nvim provides a different runtime, API, lifecycle, or editor model.

5. **Do not introduce compatibility wrappers without need.**
   Use the repository's current Node.js, TypeScript, package-manager, and module conventions.

6. **Use the project's package manager.**
   Detect it from lockfiles and `packageManager`:
   - `package-lock.json` -> npm
   - `pnpm-lock.yaml` -> pnpm
   - `yarn.lock` -> yarn
   - `bun.lock` / `bun.lockb` -> bun
   - `package.json#packageManager` takes precedence when intentional and consistent.

7. **Do not guess the installed coc-test API.**
   Inspect the installed package, its CLI help, package metadata, README, or type definitions before relying on options that are not already established in the repository.

8. Add github CI and the CI icon to file README.md when missing.

## coc-test CLI model

The expected coc-test command shape is:

```text
coc-test [options] <files ...>
```

Known supported options:

```text
-v, --version
-u, --use <version>
--test-name-pattern <pattern>
--nvim
--vim
--force-exit
-h, --help
```

Behavior to rely on:

- `<files ...>` identifies integration-test files and may support glob/fuzzy-style file matching.
- Neovim is the default editor unless the project deliberately selects Vim.
- `--vim` runs the integration suite with Vim.
- `--nvim` explicitly runs with Neovim.
- `-u, --use <version>` selects the coc.nvim version/tag used by the test harness.
- `--test-name-pattern <pattern>` narrows execution to matching test names.
- `--force-exit` is for suites that otherwise leave resources or handles alive.

Before using additional flags or programmatic APIs, verify them from the actual coc-test version used by the project.

# Workflow

## 1. Inspect the repository

Read at least:

```text
package.json
tsconfig.json
the package-manager lockfile
existing test-runner configuration
existing integration-test files
CI workflow files
```

Search for:

```text
coc.nvim
@chemzqm/neovim
helper.setup
beforeAll
afterAll
jest
vitest
mocha
node:test
NVIM
VIM
integration
e2e
```

Determine:

- package manager
- Node.js version constraints
- TypeScript/module format
- current unit-test runner
- current integration-test runner or harness
- integration-test file patterns
- whether tests currently spawn/connect to Vim or Neovim themselves
- whether CI already provides Vim/Neovim
- whether tests depend on locally built plugin output

Do not modify files until these are understood.

## 2. Classify tests

Separate tests into two groups.

### Unit tests

Keep on the existing runner when they test pure logic such as:

- parsers
- configuration transforms
- utilities
- protocol conversion
- data structures
- filesystem-independent logic
- mocked APIs

### coc integration tests

Use coc-test when they depend on:

- `coc.nvim`
- `workspace`
- `window`
- `commands`
- `languages`
- `services`
- `extensions`
- actual buffers/documents
- actual Vim/Neovim RPC
- coc.nvim activation/deactivation
- editor commands or state

Do not migrate unrelated unit tests merely to standardize tooling.

Note that coc.nvim test mode disables config-file writes and the
`/tmp/.vim/coc-settings.json` workspace-folder config persists across test runs,
so integration tests should use User-target configuration updates and explicit
resets them.

## 3. Add coc-test as a development dependency

First check whether `coc-test` is already declared.

If missing, install it with the repository's package manager as a **dev dependency**.

Examples only; use the detected package manager:

```bash
npm install -D coc-test
pnpm add -D coc-test
yarn add -D coc-test
bun add -d coc-test
```

Do not manually invent a dependency version when the package manager can resolve the intended current version, unless the repository has an explicit pinning policy.

If the repository is a monorepo, add it to the package that owns the coc extension integration tests, not automatically to the workspace root.

## 4. Add explicit package scripts

Prefer scripts with clear responsibilities.

Recommended naming:

```json
{
  "scripts": {
    "test": "...existing unit-test command...",
    "test:integration": "npm run build && coc-test <integration-test-files>",
    "test:integration:nvim": "npm run build && coc-test --nvim <integration-test-files>",
    "test:integration:vim": "npm run build && coc-test --vim <integration-test-files>"
  }
}
```

Add `"build": "tsc -p tsconfig.json"` to `scripts` when it's not exists.

Only add scripts that provide real value.

### Required behavior

- Preserve the current `test` script unless the repository already treats integration tests as part of `test`.
- Avoid silently making normal unit-test execution depend on Vim/Neovim.
- Prefer one canonical integration script.
- Add Vim/Neovim-specific scripts when both editors are intentionally supported or used by CI.
- Quote glob patterns when necessary so the package shell does not expand them differently across platforms.

Example:

```json
{
  "scripts": {
    "test:integration": "coc-test \"src/**/*.test.ts\""
  }
}
```

Use the repository's actual integration-test path instead of copying this example.

## 5. Adapt integration tests to coc-test

Reuse the project's existing assertions and test cases wherever possible.

Remove only harness code that coc-test makes redundant.

Typical obsolete responsibilities may include custom code that:

- downloads coc.nvim
- finds a coc.nvim release
- starts Vim/Neovim
- opens an RPC channel
- injects coc.nvim into runtimepath
- manually loads coc.nvim's `build/index.js`
- coordinates test files through a custom launcher
- implements test-name filtering already handled by coc-test
- force-kills the editor process when coc-test owns lifecycle management

Do **not** remove project-specific setup such as:

- fixture creation
- workspace initialization
- plugin configuration
- extension activation
- mocked external services
- language-server setup
- cleanup of plugin-owned resources

### Test lifecycle

Make lifecycle ownership explicit.

A typical integration test should have this shape conceptually:

```ts
beforeAll(async () => {
  // plugin-specific setup
})

afterAll(async () => {
  // plugin-specific cleanup only
})
```

Do not add a second independent Vim/Neovim lifecycle inside the tests when coc-test already owns it.

If the repository already has a shared helper, prefer adapting that helper once rather than patching every test file.

## 6. Preserve extension loading semantics

A coc.nvim extension is not a VSCode extension host.

When the plugin originated from or tracks a VSCode extension:

- keep coc.nvim activation semantics
- keep coc.nvim API imports
- keep coc.nvim configuration behavior
- keep Vim/Neovim-specific behavior
- do not introduce `vscode-test`, `@vscode/test-*`, Electron, or VSCode extension-host assumptions
- do not replace coc.nvim APIs with VSCode APIs just to reuse upstream tests

Port the **test intent**, not the VSCode test harness.

## 7. Handle build requirements

Determine whether integration tests execute:

- TypeScript source directly, or
- compiled JavaScript output.

If the plugin must be built before coc-test can load it, encode that dependency explicitly.

Examples:

```json
{
  "scripts": {
    "test:integration": "npm run build && coc-test \"src/**/*.test.ts\""
  }
}
```

or, when the repository already has a lifecycle hook convention:

```json
{
  "scripts": {
    "pretest:integration": "npm run build",
    "test:integration": "coc-test \"src/**/*.test.ts\""
  }
}
```

Prefer the project's existing script style.

Do not add redundant builds if the test tooling already compiles/transpiles the test sources.

## 8. CI integration

Only modify CI when the task includes CI support or existing CI should run integration tests.

When adding CI coverage:

- keep unit tests as a separate step
- run coc-test only after dependencies and required build artifacts are ready
- ensure the required editor binary exists
- prefer Neovim for the primary integration job when the project has no contrary convention
- add Vim coverage only when the plugin claims or actively maintains Vim compatibility
- avoid duplicating the same expensive integration suite across unrelated matrix dimensions

Conceptual structure:

```text
install
typecheck/build
unit tests
coc-test integration tests
```

If both Vim and Neovim are supported, a small explicit matrix is acceptable.

Do not assume OS package names; inspect the existing CI environment first.

## 9. Verify the migration

Run the narrowest useful checks first.

Recommended order:

```text
1. package manager install/lockfile consistency
2. typecheck or build
3. existing unit tests
4. one coc-test integration file
5. full coc-test integration suite
6. Vim variant, when supported
```

Useful coc-test debugging patterns:

```bash
coc-test --test-name-pattern "<specific test>" <file>
coc-test --nvim <file>
coc-test --vim <file>
coc-test --force-exit <file>
```

Use `--force-exit` only when needed. Prefer finding and cleaning up plugin-owned leaked resources when practical.

## 10. Diagnose failures by ownership

When coc-test fails, identify which layer owns the failure.

### Plugin failure

Examples:

- extension does not activate
- command is not registered
- expected buffer edit does not occur
- language service fails
- plugin leaves resources alive

Fix the plugin or test setup.

### Test migration failure

Examples:

- old harness setup was removed but still required
- test executes before extension activation completes
- fixtures assume old paths
- cleanup destroys coc-test-owned resources

Fix the test migration.

### coc-test/environment failure

Examples:

- Vim/Neovim executable missing
- selected coc.nvim version cannot be downloaded/resolved
- unsupported CLI option
- incompatible Node.js runtime

Fix configuration/environment rather than changing plugin behavior to hide the problem.

# Preferred change shape

For a normal coc.nvim extension, the ideal patch is small:

```text
package.json
lockfile
shared integration-test helper, if needed
CI workflow, if requested
```

Avoid large rewrites unless the existing test harness itself is the thing being replaced.

# Acceptance criteria

The task is complete only when all applicable items are true:

- `coc-test` is a development dependency.
- There is a clear package script for coc integration tests.
- Existing unit-test behavior remains intact.
- Integration tests no longer duplicate coc-test-owned editor/coc.nvim bootstrapping.
- Plugin-specific setup and cleanup are preserved.
- The extension still builds/typechecks.
- Existing unit tests pass.
- At least one representative coc-test integration test passes.
- The full integration suite passes when the environment permits it.
- Vim coverage still works if the repository actively supports Vim.
- No VSCode test-host dependency was introduced.
- No coc.nvim-specific behavior was removed merely to match an upstream VSCode plugin.

# Output requirements for the agent

After making changes, report only concrete results:

1. files changed
2. test command added
3. old harness code removed or retained, with reason
4. verification commands run and their result
5. any remaining blocker

Do not claim integration tests pass unless they were actually executed successfully.
