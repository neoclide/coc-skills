---
name: coc-create
description: Create a new TypeScript coc.nvim extension project with a minimal command, build configuration, coc-test integration tests, and Vim/Neovim CI. Use when starting a coc.nvim extension from scratch; do not use to retrofit tests into an existing extension.
---

# Create a coc.nvim Extension

Create the smallest working extension that matches the user's requested behavior. The
bundled scaffold provides a disposable hello-command example; replace that example when
the user has specified real functionality.

## Establish the inputs

Before writing files, determine:

- the target directory;
- the lowercase npm package name, normally beginning with `coc-`;
- a one-line package description;
- the first command or feature the extension should expose, when specified;
- optional author, license, repository, and activation constraints only from user input
  or existing project evidence.

Ask only for required values that cannot be inferred safely. Never invent author,
license, repository, publisher, language-server, or upstream metadata. Refuse to
overwrite a non-empty target directory unless the user explicitly requests an in-place
adaptation, in which case inspect and preserve its contents instead of running the
scaffolder.

## Generate the baseline

Run the bundled generator from this skill directory:

```bash
node scripts/scaffold.mjs \
  --output /absolute/path/to/coc-example \
  --name coc-example \
  --description "Example extension for coc.nvim"
```

Use `--command-id example.hello` only when the derived command identifier is unsuitable.
The generator creates source, manifest, build, test, CI, README, and ignore files, but it
does not install dependencies, initialize Git, commit, push, or publish.

The baseline deliberately includes:

- `src/index.ts` with a command registered through `ExtensionContext.subscriptions`;
- `esbuild.mjs` producing the CommonJS `lib/index.js` declared by `package.json#main`;
- strict TypeScript type checking without emitting duplicate build output;
- `coc-test.entryFile: src/index.ts`, so tests load source in memory and share the
  extension's module instances;
- explicit Neovim and Vim test scripts;
- a GitHub Actions matrix that runs the integration test in both editors.

## Install compatible development dependencies

The generated project defaults to npm. Verify current package requirements before
installing; do not guess versions from memory. The currently established dependency
shape is:

```bash
npm install --save-dev \
  coc.nvim@next \
  coc-test \
  'typescript@^6' \
  'esbuild@^0.28' \
  '@types/node@^22'
```

Keep the generated lockfile. If current package metadata makes these ranges
incompatible, select a mutually compatible set from authoritative package metadata and
explain the deviation. Do not add `vscode`, `@vscode/test-*`, or another editor host.

## Adapt the example to the requested extension

Keep `package.json`, source, and tests synchronized:

- every contributed command must use the same identifier as its registration;
- activation events should be no broader than the feature requires;
- all registrations, listeners, processes, clients, timers, and channels must be owned
  by `context.subscriptions` or explicitly disposed;
- user-facing settings and commands belong in `contributes` with real descriptions and
  conservative defaults;
- language-server extensions must await shutdown and dispose all client/process state;
- preserve the `coc-test.entryFile` path unless testing the compiled artifact is an
  explicit requirement.

Replace the hello-command regression with an observable test of the requested behavior.
Use `node:test` assertions and coc.nvim APIs from the live coc-test runtime. Keep at least
one editor communication assertion so the suite proves it is not a source-only unit test.

## Verify the generated extension

Run, in order:

```bash
npm run typecheck
npm run build
npm run test:nvim
npm run test:vim
npm pack --dry-run
```

Also run `git diff --check` when the target is in a Git worktree. Treat teardown errors,
unhandled rejections, missing commands, and editor RPC failures as test failures even if
an outer command reports exit code zero. If Vim or Neovim is unavailable, report the
missing executable and do not claim that lane passed.

Finish by reporting the generated path, chosen identifiers, files created, installed
dependency versions, checks actually run, and any remaining metadata or product behavior
the user still needs to decide. Creation does not authorize commit, push, npm publication,
or GitHub repository creation.
