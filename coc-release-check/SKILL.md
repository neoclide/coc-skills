---
name: coc-release-check
description: Validate a coc.nvim extension before an npm release. Use when preparing, reviewing, or approving a release; checking a release candidate, version bump, changelog, package contents, build artifacts, tests, compatibility, or publish readiness; or diagnosing why an extension package should not be published.
---

# Check a coc.nvim Extension Release

Decide whether the exact repository state is safe to release. Make no publication, tag, push, version bump, lockfile rewrite, or generated-file change unless the user explicitly requests it.

Return one of: **ready**, **ready with documented exceptions**, or **blocked**. A passing command alone is not a release decision.

## 1. Establish the release candidate

1. Read applicable `AGENTS.md`, `CONTRIBUTING.md`, release documentation, `package.json`, the package-manager lockfile, build/test configuration, and CI workflows.
2. Run `git status --short`, inspect the current branch and recent tags/commits, and preserve unrelated local changes.
3. Record the package name, manifest version, target registry, package manager, Node.js constraints, release ref/commit, and whether this is a stable, prerelease, or hotfix release.
4. Compare the manifest version with the latest relevant tag and registry version when network access and registry scope are available. Treat a duplicate or lower publish version as blocking unless the configured registry policy explicitly allows it.
5. If the intended package, registry, version, or release ref is ambiguous, report the ambiguity and stop before any state-changing command.

Do not infer that every changed file belongs in the release. Verify the requested candidate from the actual diff and package contents.

## 2. Review release-facing changes

Inspect the complete diff since the previous release (or the user-specified range), including package metadata and generated output required by the repository.

Verify:

- `package.json` has a valid name, version, `main`/exports/activation entry points, engine constraints, dependencies, and files/ignore policy;
- the changelog or release notes describe user-visible fixes, changes, migrations, and known limitations accurately;
- commands, configuration keys, language IDs, activation behavior, bundled language servers, and documentation remain consistent;
- dependency, lockfile, and license changes are intentional and compatible with the project's policy;
- no debug logging, local paths, credentials, test fixtures, editor logs, coverage output, or accidental generated artifacts are included;
- public behavior that changed has a corresponding test or a documented reason it cannot be automated.

For a hotfix, ensure the diff remains narrowly scoped. For a prerelease, ensure the version and release notes make the prerelease status clear.

## 3. Validate the build and tests

Use the repository's package manager. Start with the smallest relevant checks, then run the release-required checks defined by scripts or CI. Do not guess script names: inspect `package.json` first.

At minimum, run all applicable checks that the project declares for release quality:

1. clean install or dependency-integrity check when practical;
2. type check, lint, and formatting checks when configured;
3. production build;
4. targeted regression tests for the release changes;
5. full unit and integration suite, including `coc-test` tests when present;
6. Vim and Neovim compatibility checks when the extension supports both or changed editor-facing behavior;
7. `git diff --check`.

Use observable hooks/events for asynchronous editor tests; do not accept fixed sleeps as proof of reliability. Distinguish a pre-existing failure from a release-candidate failure, but do not call the release ready if a required check is failing without an approved exception.

## 4. Inspect the publish artifact

Build before packing if the package publishes compiled output. Then inspect the artifact without publishing:

```bash
npm pack --dry-run
```

Use the equivalent package-manager command only after verifying it produces the same npm package view. Inspect the reported file list and, when needed, create the tarball in a temporary directory and list it with `tar -tzf`.

Confirm that the package includes:

- the activation/runtime entry point and all referenced compiled files;
- runtime dependencies or bundled assets needed after installation;
- README, license, and other package metadata required by project policy;
- language-server binaries, data files, queries, snippets, or schemas when the extension needs them at runtime.

Confirm that it excludes:

- source-only test suites, coverage, editor logs, caches, local configuration, secrets, and development-only dependencies;
- oversized or duplicate binaries and unintended files admitted by broad `files` globs;
- stale build output that conflicts with the source or manifest version.

Do not rely only on `.npmignore`: `files`, `main`, `bin`, README, and license rules can change what npm packs.

## 5. Perform a fresh-install smoke test

When the extension's runtime shape, packaging, activation, or bundled server changed, install the packed tarball into a fresh temporary consumer directory and verify the actual installed contents.

Exercise the smallest meaningful coc.nvim path: install/load the extension, activate it in a matching buffer or workspace, and invoke an affected command, provider, or language-client operation. Use a real Vim/Neovim+coc environment when available. Never treat a successful `require()` or package install as proof that activation works.

If live editor execution is unavailable, state that clearly and retain the release risk rather than inventing a smoke-test result.

## 6. Check publication safety

Before recommending publication, verify:

- the working tree and candidate commit are the intended ones;
- the repository will not publish private credentials, private registries, or unintended provenance;
- the target registry and npm dist-tag are explicit and appropriate (`latest` versus a prerelease tag);
- release notes, version, and git tag convention agree;
- any required CI, signing, provenance, or maintainer approval is complete;
- an existing published version will not be overwritten or superseded accidentally.

Never run `npm publish`, create a git tag, push, create a GitHub release, or change registry/dist-tag configuration as part of this skill unless specifically authorized.

## Report

Give a concise release decision with evidence:

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

Never imply that a command was run, a package was inspected, or a release was published when it was not.
