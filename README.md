<p align="center">
  <img src="assets/icon.svg" width="120" alt="coc-skills icon">
</p>

<h1 align="center">coc-skills</h1>

<p align="center">Agent skills for maintaining <strong>coc.nvim</strong> extensions.</p>

This repository is a collection of playbooks (Agent Skills) that encode the coc.nvim
extension maintenance workflow: triaging GitHub issues, porting upstream changes from
VS Code extensions, adding integration-test support, auditing code, and preparing
releases. Each skill is a standard `SKILL.md` playbook with `name`/`description`
frontmatter, written to keep an AI coding agent working on coc extension repositories
safely — preserving coc-specific behavior, Vim/Neovim compatibility, and repository
conventions.

## Skills

| Skill | Purpose |
| --- | --- |
| [`coc-workflow`](coc-workflow/SKILL.md) | **Coordinator skill.** Maintain a coc.nvim extension from investigation through implementation and verification. Routes specialized work to the other skills below, or runs the full workflow in sequence when requested. |
| [`coc-issue`](coc-issue/SKILL.md) | Process open GitHub issues one at a time: reproduce bugs, implement valid feature requests, add regression or acceptance tests for every change, validate the repository, and explain clearly why an issue cannot be fixed. |
| [`coc-vscode-sync`](coc-vscode-sync/SKILL.md) | Safely synchronize a coc.nvim extension with changes from a VS Code (or other editor) upstream, while preserving coc-specific commands, settings, activation, language-server wiring, and lifecycle cleanup. |
| [`coc-test`](coc-test/SKILL.md) | Add, migrate, or repair `coc-test` integration-test support for a coc.nvim extension without breaking existing unit tests, the build, or coc-specific behavior. |
| [`coc-audit`](coc-audit/SKILL.md) | Comprehensive code audit of a coc.nvim extension: real bugs, lifecycle problems, LSP issues, performance and memory risks, compatibility problems, unsafe coc.nvim API assumptions, and missing tests. |
| [`coc-release-check`](coc-release-check/SKILL.md) | Decide whether a coc.nvim extension is safe to publish: validate the release candidate, build, tests, publish artifact, and publication safety. Returns **ready**, **ready with documented exceptions**, or **blocked**. |
| [`coc-release-action`](coc-release-action/SKILL.md) | Add a daily GitHub Actions workflow that builds, tests, records commits in `history.md`, increments the patch version, pushes a release commit/tag, and publishes a coc extension to npm. |

## Install

Use the [`skills`](https://skills.sh/) CLI to discover and install the skills directly
from this repository:

```bash
npx skills@latest add neoclide/coc-skills
```

The CLI discovers the repository's skills and detects supported coding agents,
prompting for a selection when needed. To inspect the available skills without
installing anything:

```bash
npx skills@latest add neoclide/coc-skills --list
```

Install only the coordinator skill globally for Codex:

```bash
npx skills@latest add neoclide/coc-skills --skill coc-workflow --agent codex --global --yes
```

Or install all skills globally for Codex without prompts:

```bash
npx skills@latest add neoclide/coc-skills --skill '*' --agent codex --global --yes
```

Omit `--global` to install into the current project instead.

## How to use

Each `coc-*` folder is a self-contained skill. Install the folders you need into your
agent's skills directory (or reference them from an orchestrating workflow). Start with
`coc-workflow` when a task spans investigation, implementation, and verification — it
dispatches to the specialized skills:

| Task | Specialized skill |
| --- | --- |
| Triage or resolve GitHub issues | `coc-issue` |
| Port or compare changes from a VS Code or other upstream extension | `coc-vscode-sync` |
| Add, migrate, or repair integration tests using `coc-test` | `coc-test` |
| Inspect the codebase for bugs, risks, or missing tests | `coc-audit` |
| Decide whether an extension is ready to publish | `coc-release-check` |
| Add or repair a scheduled npm release workflow | `coc-release-action` |

## Repository layout

```
coc-workflow/                  # coordinator skill
coc-issue/                     # GitHub issue worker
coc-vscode-sync/               # upstream sync skill + extras:
  references/preservation-checklist.md  #   coc contract preservation checklist
  scripts/coc_contract_inventory.mjs    #   inventory script for the coc contract surface
coc-test/                      # coc-test integration-test skill
coc-audit/                     # code audit skill
coc-release-check/             # release readiness skill
coc-release-action/            # scheduled GitHub Actions release skill + workflow asset
```

Every skill also includes `agents/openai.yaml` with its agent interface metadata.

## License

[MIT](LICENSE)
