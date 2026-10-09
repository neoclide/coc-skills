---
name: coc-release-action
description: Add or repair a daily GitHub Actions OIDC npm release workflow for a coc.nvim extension. Use when creating `.github/workflows/release.yml`, automating patch releases, generating `history.md` entries from commits since the last tag, configuring scheduled npm publication, or reviewing an existing coc extension release Action for tag, version, permission, Trusted Publishing, concurrency, and failure-recovery problems.
---

# Add a Scheduled coc.nvim Release Action

Create `.github/workflows/release.yml` that, every day, builds and tests the extension and, when there are commits after the latest release tag (or the manifest version was bumped past it), prepends those commits to `history.md`, increments the patch version unless it was already bumped, commits, tags, pushes, and publishes to npm.

Start from [assets/release.yml](assets/release.yml) and adapt it from repository evidence; do not copy it blindly. Creating the workflow does not authorize running it, committing, pushing, tagging, or publishing.

## 1. Trusted Publishing only

Publish exclusively through npm Trusted Publishing (OIDC). Never add `NODE_AUTH_TOKEN`, `NPM_TOKEN`, or any long-lived npm token.

Trusted Publishing is configured only when both hold:

- the user confirms on npmjs.com that the package has a GitHub Actions trusted publisher matching the repository owner, repository, workflow filename `release.yml`, and environment (if any);
- the publishing job has `id-token: write` (the workflow also needs `contents: write` to push the release commit and tag).

Never run `npm whoami`, `npm login`, `npm adduser`, `npm trust`, `npm token`, `npm profile`, `npm access`, or any other command requiring an npm login, and never run `npm publish` locally. If the npm-side configuration cannot be confirmed, report it as an external prerequisite.

## 2. Inspect the repository

1. Read applicable `AGENTS.md`, release docs, `package.json`, `package-lock.json`, `history.md`, existing workflows, and recent tags.
2. Confirm npm is the package manager and `npm run build` and `npm run test` exist. Do not hide missing scripts with `--if-present`.
3. Determine the default branch, compatible Node.js version, registry, package access, `history.md` heading format, tag convention, and whether build output is tracked.
4. Require a release baseline: at least one reachable SemVer tag. The manifest version may equal it (automatic patch) or be newer (manual bump); reject an older one. Without any tag, stop for an explicit bootstrap decision.
5. Check branch/tag protection and Actions settings: `GITHUB_TOKEN` must be allowed to push the release commit and tag, or report the blocker.
6. Ensure `node_modules` is in `.gitignore`; otherwise the workflow's untracked-file check fails.
7. Preserve unrelated local changes.

The asset assumes bare SemVer tags (`1.2.3`), a tracked `history.md` and npm lockfile, and npmjs.org. If the repository uses `v1.2.3`, another changelog layout, a monorepo subdirectory, a prerelease channel, or another registry, adapt every affected step consistently.

## 3. Workflow requirements

- One daily `schedule` (cron is UTC; avoid the top of the hour) plus `workflow_dispatch`.
- Check out the default branch explicitly with `fetch-depth: 0` so tags and history are available.
- Use a Node.js version the repository supports. Trusted Publishing requires npm CLI 11.5.1 or newer; make sure the selected Node release bundles it or upgrade npm in the job.
- Install Vim/Neovim and expose a coc.nvim checkout through `COC_TEST_COC_PATH` (the asset downloads the `release` branch with `GITHUB_TOKEN`) when `npm run test` runs coc-test. Drop these steps when the tests do not need an editor.
- Run `npm ci`, `npm run build`, and `npm run test` before planning a release.
- Use workflow-level `concurrency` with `cancel-in-progress: false`.
- Grant only `contents: write` and `id-token: write`.
- Publish with plain `npm publish`.

## 4. Release invariants

1. Baseline = the newest SemVer tag (bare or `v`-prefixed), which must be an ancestor of `HEAD`. Do not pick a tag with a broad `git describe`.
2. Manifest newer than the baseline: release that exact version without incrementing (fail if its tag already exists). Older: fail.
3. Manifest equal to the baseline:
   - no commits in `<tag>..HEAD` and the version is on npm: exit successfully without changes;
   - no commits but the version is missing from npm: publish-only recovery; retry `npm publish` without bumping or rewriting history;
   - new commits: require npm `latest` to equal the manifest version, then run `npm version patch --no-git-tag-version`.
4. Write one bullet per commit in `<tag>..HEAD` (excluding the release commit) and prepend a new version section to `history.md`, matching the existing heading style.
5. Before creating Git state, run `npm pack --dry-run` and `git diff --check`, reject untracked files (`git commit -a` would omit them), and fail if the default branch moved during the run. Include tracked build output only when the repository versions it intentionally.
6. Release with exactly these commands, in this order, and never also let `npm version` commit or tag:

```bash
git commit -a -m "Release $version"
git tag -a "$version" -m "Release $version"
git push --tags
git push
npm publish
```

Pushes and publication are not atomic. Publish-only recovery covers a publish failure after both pushes. If the tag push succeeds but the branch push fails, stop and report the divergent remote state; never create another version automatically.

## 5. Validate without releasing

1. Review the workflow for placeholders and wrong branch, Node version, tag prefix, or history format.
2. Lint the YAML with existing tooling or `actionlint` when available, and check embedded shell with `bash -n`. Treat commit subjects as data (`printf`/files), never as shell code.
3. For nontrivial changes, exercise the planning and history logic in a disposable Git/npm fixture covering no-change, new-commit, manual-bump, missing-tag, and publish-only paths, without contacting a real registry or remote.
4. Run `git diff --check` and review `git status --short`. Never trigger the workflow or publish as validation.

## 6. Hand off

Report the UTC schedule and its local-time equivalent, Node version, tag convention, authentication mode, and validation performed. List the prerequisites code cannot perform:

- configure and confirm the npm trusted publisher for `release.yml`;
- allow Actions read/write contents and let the release identity pass branch/tag protection;
- confirm package name, registry, access level, and npm ownership;
- decide how to repair a pushed tag if the branch push fails.

Do not call the workflow operational until these are confirmed.
