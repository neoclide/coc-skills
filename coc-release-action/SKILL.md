---
name: coc-release-action
description: Add or repair a daily GitHub Actions OIDC npm release workflow for a coc.nvim extension. Use when creating `.github/workflows/release.yml`, automating patch releases, generating `history.md` entries from commits since the last tag, configuring scheduled npm publication, or reviewing an existing coc extension release Action for tag, version, permission, Trusted Publishing, concurrency, and failure-recovery problems.
---

# Add a Scheduled coc.nvim Release Action

Create a repository-specific `.github/workflows/release.yml` that builds and tests a coc.nvim extension every day, releases when commits exist after the latest release tag or the manifest version was bumped past it, prepends those commits to `history.md`, increments the patch version (unless the manifest already bumped it), commits and tags the release, pushes it, and publishes it to npm.

Use [assets/release.yml](assets/release.yml) as the baseline. Adapt it from repository evidence; do not copy it blindly.

## 1. Require npm Trusted Publishing

Use npm Trusted Publishing (OIDC) as the only npm publication method. Do not add or use `NODE_AUTH_TOKEN`, `NPM_TOKEN`, automation tokens, granular access tokens, or other long-lived npm credentials.

1. Determine the npm package name from `package.json`.

2. Ask the user to verify on the npm website that a GitHub Actions trusted publisher exists and matches the current repository and publishing workflow:
   - GitHub owner/organization matches the repository owner.
   - Repository matches the current repository.
   - Workflow filename matches the workflow that performs `npm publish`.
   - Environment matches the workflow environment if one is configured.
   - The trusted publisher is allowed to perform `npm publish`.

3. Inspect the publishing workflow and verify that the publishing job can request an OIDC token:

```yaml
permissions:
  contents: read
  id-token: write
```

4. Treat Trusted Publishing as correctly configured only when both conditions are satisfied:
   - the user confirms the matching GitHub Actions trusted publisher on npm;
   - the GitHub Actions publishing job has `id-token: write`.

Never run `npm whoami`, `npm login`, `npm adduser`, `npm trust`, `npm token`, `npm profile`, `npm access`, or any other command that requires an npm login. Do not run `npm publish` from the agent's local environment. The generated GitHub Actions workflow may run `npm publish` only through OIDC. If the npm-side Trusted Publisher cannot be confirmed without an authenticated command, report it as an external prerequisite instead of probing it.

## 2. Inspect the target repository

1. Read applicable `AGENTS.md`, release documentation, `package.json`, `package-lock.json`, `history.md`, existing workflows, and recent release tags.
2. Confirm that npm is the repository's package manager and that `npm run build` and `npm run test` exist. Keep these commands exact when the user requires them; do not hide missing scripts with `--if-present`.
3. Determine the default branch, compatible Node.js version, npm registry, package access, history heading format, release tag convention, and whether build output is intentionally tracked.
4. Require an existing release baseline: at least one reachable SemVer release tag. The manifest version may equal the baseline (automatic patch flow) or be newer than it (intentional version bump / skip-level release); reject a manifest version older than the baseline. Stop for an explicit bootstrap decision when there is no prior tag.
5. Inspect branch/tag protection and Actions settings. The workflow must be allowed to push a release commit and tag with `GITHUB_TOKEN`; otherwise use an approved release credential or report the blocker.
6. Preserve unrelated local changes. Creating the workflow does not authorize running it, committing, pushing, tagging, or publishing.
7. Make sure `node_modules` added to file `.gitignore`.

The baseline assumes bare SemVer tags such as `1.2.3`, a tracked `history.md`, a tracked npm lockfile, and npmjs.org. Adapt every affected check consistently if the repository uses `v1.2.3`, another changelog layout, a monorepo subdirectory, a prerelease channel, or a different registry.

## 3. Create the workflow

Create `.github/workflows/release.yml` from the bundled asset, then make these repository-specific choices:

- Keep one daily `schedule` trigger and add `workflow_dispatch` for diagnosis or recovery. State that cron is UTC. Avoid the top of the hour when choosing a schedule.
- Check out the default branch explicitly with full history and tags. Keep `fetch-depth: 0`.
- Select a Node.js version supported by the repository and its dependencies. Prefer the version already used by CI unless npm authentication imposes a higher minimum.
- Run `npm ci`, `npm run build`, and `npm run test` before planning a release.
- Serialize release runs with workflow-level `concurrency` and do not cancel a release already in progress.
- Grant only `contents: write` and `id-token: write`. Do not grant pull-request, issue, or administration permissions.
- Publish with plain `npm publish` in the GitHub Actions job so npm obtains the short-lived credential through OIDC. Do not configure or validate a long-lived npm credential.
- Ensure the npm Trusted Publisher workflow filename is exactly `release.yml`. Do not claim the npm-side trust configuration was created or verified when the user has not confirmed it.

## 4. Preserve the release invariants

Keep the following behavior in the generated workflow:

1. Treat the newest SemVer release tag (bare or `v`-prefixed) as the baseline and verify that it is an ancestor of `HEAD`. Do not select an unrelated tag with a broad `git describe`. When `package.json#version` equals the baseline, proceed with the automatic flow; when it is newer than the baseline, treat it as a manual version bump (skip-level release) and release that exact version without re-incrementing; reject versions older than the baseline.
2. Count commits in `<previous-tag>..HEAD`. Exit successfully without changing files when the count is zero and the current package version is already published.
3. If `HEAD` is already tagged with the manifest version but that version is absent from npm, enter publish-only recovery. Build and test again, then retry only `npm publish`; do not bump the version or rewrite history.
4. For a new release whose manifest version already matches the baseline, run `npm version patch --no-git-tag-version`. This increments the smallest SemVer component and updates the lockfile when npm manages it. When the manifest version was already bumped past the baseline, skip the increment and use the manifest version as-is.
5. Generate one bullet per commit from the previous tag through the source `HEAD`, excluding the new release commit. Prepend the new version section to `history.md` while preserving the repository's existing heading/date style.
6. Reject unexpected untracked files because `git commit -a` cannot include them. Inspect tracked build changes and include them only when the repository intentionally versions generated output.
7. Run `npm pack --dry-run` and `git diff --check` before creating permanent Git state.
8. Keep the requested release commands and order:

```bash
git commit -a -m "Release $version"
git tag -a "$version" -m "Release $version"
git push --tags
git push
npm publish
```

Do not use `npm version`'s automatic commit/tag behavior in addition to these commands.

The two Git pushes and npm publication cannot form one atomic transaction. Validate authentication and branch policy before the first push. Retain the publish-only recovery path for a failure after both Git pushes. If the tag push succeeds but the branch push fails, stop and report the divergent remote state for manual repair; do not create another version automatically.

## 5. Validate without releasing

1. Inspect the complete workflow and ensure it contains no placeholder, wrong branch, wrong Node version, wrong tag prefix, or mismatched history format.
2. Parse/lint the YAML with the repository's existing workflow tooling or `actionlint` when available.
3. Validate embedded shell with `bash -n` when practical and review all expansions as untrusted input. Keep commit subjects as data passed to `printf` or files; never evaluate them as shell code.
4. Exercise the release-planning and history-generation logic in a disposable temporary Git/npm fixture when making nontrivial adaptations. Cover no-change, new-commit, missing-tag, and publish-only paths without contacting a real registry or remote.
5. Run `git diff --check` and review `git status --short`. Do not trigger the workflow or publish a package as validation.

## 6. Hand off operational prerequisites

Report the chosen UTC schedule and its local-time equivalent, Node version, tag convention, authentication mode, and validation performed. Call out all setup that code cannot perform safely:

- configure and confirm the matching GitHub Actions Trusted Publisher on the npm website before running the workflow;
- allow GitHub Actions read/write repository contents and permit the release identity through applicable branch/tag protection;
- confirm the package name, registry, access level, and npm ownership;
- decide how to repair an already-pushed tag if the subsequent branch push fails.

Do not say the workflow is operational until these external prerequisites are confirmed.
