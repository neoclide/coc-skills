---
name: coc-release-check
description: Validate a coc.nvim extension before an npm release. Use when preparing, reviewing, or approving a release; checking a release candidate, version bump, changelog, package contents, build artifacts, tests, compatibility, or publish readiness; or diagnosing why an extension package should not be published.
---

# Check a coc.nvim Extension Release

Decide whether the exact repository state is safe to release, and return **ready**, **ready with documented exceptions**, or **blocked**. A passing command alone is not a release decision.

Do not publish, tag, push, bump versions, rewrite lockfiles, or change generated files unless the user explicitly asks.

## 1. Identify the candidate

1. Read applicable `AGENTS.md`, `CONTRIBUTING.md`, release docs, `package.json`, the lockfile, build/test configuration, and CI.
2. Run `git status --short`, inspect the branch and recent tags/commits, and preserve unrelated changes.
3. Record package name, version, registry, package manager, Node.js constraints, release commit, and release type (stable, prerelease, hotfix).
4. Compare the version with the latest tag and the registry when available. A duplicate or lower version is blocking unless the registry policy allows it.
5. If the package, registry, version, or ref is ambiguous, report it and stop before any state-changing command.

## 2. Review release-facing changes

Inspect the full diff since the previous release (or the user's range) and verify:

- `package.json`: valid name, version, `main`/exports, activation events, `engines` (`node`, `coc`), dependencies, and `files`;
- changelog/`history.md` accurately describes user-visible changes, migrations, and known limitations;
- commands, configuration keys, language IDs, activation, bundled servers, and docs stay consistent;
- dependency, lockfile, and license changes are intentional;
- no debug logging, local paths, credentials, fixtures, logs, coverage, or stray generated files;
- changed public behavior has a test or a documented reason it cannot be automated.

Hotfixes must stay narrowly scoped; prereleases must be clearly marked in version and notes.

## 3. Build and test

Use the repository's package manager and the scripts declared in `package.json` and CI (never guess names). Run as applicable: clean install or integrity check, typecheck/lint/format checks, production build, targeted regression tests, the full unit and `coc-test` integration suites, Vim and Neovim runs when both are supported or editor-facing behavior changed, and `git diff --check`.

Async editor tests must synchronize on events or hooks, not fixed sleeps. Distinguish pre-existing failures from candidate failures, but a failing required check blocks the release unless an exception is approved.

## 4. Inspect the publish artifact

Build first if compiled output is published, then run `npm pack --dry-run` (or a verified equivalent). When needed, pack into a temporary directory and list it with `tar -tzf`. Remember that `files`, `main`, `bin`, README, and license rules affect contents, not just `.npmignore`.

The package must include the runtime entry and all referenced files, required runtime dependencies or bundled assets, required metadata (README, license), and any language-server binaries, schemas, snippets, or data needed at runtime. It must exclude tests, coverage, logs, caches, local config, secrets, dev-only files, oversized or duplicate binaries, and stale build output.

## 5. Smoke test

When runtime shape, packaging, activation, or a bundled server changed, install the tarball into a fresh temporary location and exercise the smallest meaningful coc.nvim path: load the extension, activate it in a matching buffer or workspace, and invoke an affected command, provider, or language-client request, using real Vim/Neovim with coc.nvim when available. A successful install or `require()` does not prove activation. If no editor is available, say so and keep the risk open.

## 6. Publication safety

Confirm the candidate commit is intended; no private credentials, registries, or unintended provenance leak; the registry and dist-tag (`latest` vs. prerelease) are explicit; version, notes, and tag convention agree; required CI, signing, provenance, or approvals are complete; and no published version is overwritten or superseded by accident.

Never run `npm publish`, create tags or GitHub releases, push, or change registry/dist-tag settings unless specifically authorized.

## Report

```text
Decision: ready | ready with documented exceptions | blocked
Candidate: <package>@<version>, commit <sha>, registry <registry>
Checks run: <command> — pass/fail/not run and concise result
Package inspection: <key inclusions/exclusions and size if available>
Smoke test: pass/fail/not run, with environment
Blocking issues: <none or numbered actionable items>
Exceptions and residual risks: <none or explicit owner/approval needed>
Recommended next action: <publish command only if authorized, otherwise request authorization>
```

Never imply that a command ran, a package was inspected, or a release was published when it was not.
