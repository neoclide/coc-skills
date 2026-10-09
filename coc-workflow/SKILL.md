---
name: coc-workflow
description: Maintain coc.nvim extensions safely from investigation through implementation and verification. Use for routine maintenance, bug fixes, features, refactors, dependency or tooling updates, documentation, configuration, commands, providers, language-server integration, tests, CI, upstream synchronization, audits, issue work, release automation, and release preparation in coc.nvim plugin repositories. Route specialized work to coc-create, coc-issue, coc-test, coc-vscode-sync, coc-audit, coc-release-action, or coc-release-check while preserving coc.nvim-specific behavior and repository conventions. Use Full workflow mode when the user explicitly asks for a complete maintenance workflow or for every Full workflow phase to run in sequence.
---

# Maintain a coc.nvim Extension

Make the smallest complete change that solves the task. Preserve public behavior, coc.nvim integration, Vim/Neovim compatibility, and project conventions unless the task explicitly changes them.

## Routing

| Task | Skill |
| --- | --- |
| Create a new coc.nvim extension | `coc-create` |
| Triage or resolve GitHub issues | `coc-issue` |
| Port or compare changes from a VS Code or other upstream extension | `coc-vscode-sync` |
| Add, migrate, or repair coc-test integration tests | `coc-test` |
| Inspect the codebase for bugs, risks, or missing tests | `coc-audit` |
| Add or repair a scheduled npm release workflow | `coc-release-action` |
| Decide whether an extension is ready to publish | `coc-release-check` |

When tasks overlap, keep one requested outcome and apply each specialized skill only to its phase (for example, `coc-issue` governs an issue fix and `coc-test` only its integration tests). Do not turn a focused fix into an audit or release review. For other work (features, refactors, dependencies, docs, configuration, CI, build), follow the steps below directly.

## 1. Establish context

1. Read applicable `AGENTS.md`, `CONTRIBUTING.md`, `README.md`, `package.json`, the lockfile, build/TypeScript configuration, relevant tests, and CI.
2. Run `git status --short` and preserve unrelated staged, unstaged, and untracked changes.
3. Detect the package manager from `package.json#packageManager` and lockfiles; never rewrite a lockfile with a different manager.
4. Identify the activation entry, exports, contributed commands and configuration, selectors, providers, language clients or child processes, and disposal paths.
5. Determine supported Node.js, coc.nvim, Vim, and Neovim versions from repository evidence.

Do not run install, generation, formatting, or broad test commands before understanding their effects.

## 2. Define the outcome

Turn the request into observable acceptance criteria: what must change, which public contracts must not, likely files, and how to prove the result. Reproduce reported bugs with a focused failing test or minimal reproduction when practical; if the current code does not reproduce, report that instead of making a speculative change. Ask when interpretations would produce materially different behavior and the repository does not settle it.

## 3. Preserve the coc.nvim contract

Check what the change touches: activation/deactivation; disposal of commands, providers, events, timers, watchers, clients, processes, and sockets via `context.subscriptions`; command IDs, configuration keys and defaults, language IDs, selectors, and manifest contributions; workspace-folder and buffer lifecycle, cancellation, restart, shutdown; Vim vs. Neovim differences; LSP initialization, requests, errors, and cancellation; packaged runtime assets.

Use the coc.nvim APIs and types actually installed. Never assume a same-named VS Code API behaves the same, and do not add a `vscode` runtime dependency, host shim, or speculative fallback.

## 4. Implement

- Fix the root cause at the narrowest layer, following existing architecture, naming, error handling, module format, and dependency policy.
- Keep unrelated refactors, formatting churn, dependency upgrades, and generated changes out of the patch. Preserve public APIs and defaults unless they are part of the task.
- Handle async lifecycle explicitly: no fire-and-forget promises, duplicate initialization, stale updates, or leaked resources.
- Pass child-process arguments without shell interpolation; keep tokens, paths, and user content out of logs.
- Update the manifest, configuration schema, docs, and typings together when the public contract changes. Update `history.md` (or the changelog) only for user-visible changes when the repository uses it.

## 5. Test

- Add a focused regression test for each bug and confirm it exercises the former failure when practical.
- Test observable behavior and important error/cleanup paths. Keep pure logic on the existing unit-test runner; use coc-test for behavior that needs a live coc.nvim and Vim/Neovim.
- Synchronize async tests on events, promises, or state changes, never fixed sleeps. Do not weaken assertions or snapshots to make a change pass.
- Doc-only or mechanical metadata changes may skip new tests; state the deterministic validation used instead.

## 6. Validate

Inspect scripts and CI first, then run as applicable: the changed test, the nearest suite, typecheck/lint, the production build, the broader suite, Vim and Neovim integration when editor-facing behavior changed, and `git diff --check` plus a full diff review. After commands that generate files, keep only intended artifacts.

A passing assertion does not override a nonzero exit, unhandled rejection, transport failure, leaked process, or teardown error. When a broad check fails, isolate it and show whether it comes from the patch, pre-existing state, the environment, or test concurrency before calling it unrelated.

## 7. Report

Report what changed and why, affected files and coc.nvim contracts, checks run with results, checks not run and why, and remaining risks or decisions. Never claim a fix, compatibility, passing tests, or release readiness without evidence. Do not commit, push, publish, close issues, or create releases without explicit authorization.

## Full workflow mode

Enter only when the user explicitly asks for `Full workflow`, a "complete maintenance workflow", `完整维护流程`, or running every referenced coc skill.

After steps 1–2, run these skills strictly in order, completing and verifying each before the next:

1. `coc-issue`: process the requested issue scope one issue at a time.
2. `coc-vscode-sync`: inspect or sync the identified upstream range while preserving the coc contract.
3. `coc-test`: establish or repair coverage and verify behavior changed by earlier phases.
4. `coc-audit`: audit the resulting tree and report confirmed findings without unrelated refactoring.
5. `coc-release-check`: evaluate the final candidate and return the release decision.

`coc-create` and `coc-release-action` are not phases; apply them only on explicit request. Each skill's own safety and validation rules govern its phase. Full workflow mode does not authorize commits, GitHub writes, pushes, publication, issue closure, or releases.

Never skip a phase silently: when nothing applies, still inspect its required evidence and record `no change` with the reason. If a required input (issue number, upstream repository or ref, release candidate, authorization) cannot be discovered safely, report the blocker and ask before dependent work, marking unstarted dependent phases `blocked`.

Write the ledger to `<repository-root>/.codex/coc-workflow.md` (create `.codex` if needed) after all phases, or before pausing on a blocker. Read an existing file first: replace a previous ledger, but ask before overwriting unrelated content. Do not stage, commit, or package the ledger unless asked. Link it in the final response with the decision and blockers.

Use exactly this structure and phase order, replacing every placeholder with concrete evidence and choosing a single status/decision value. Use `not run` only with a reason.

```markdown
## Full workflow ledger

| Phase | Status | Evidence | Changes | Checks |
| --- | --- | --- | --- | --- |
| coc-issue | completed / no change / blocked | {issue scope and decisive evidence} | {files or behavior changed, or none} | {commands and results, or not run} |
| coc-vscode-sync | completed / no change / blocked | {upstream and target range evidence} | {ported or omitted changes, or none} | {commands and results, or not run} |
| coc-test | completed / no change / blocked | {test-support and coverage evidence} | {tests or harness changed, or none} | {commands and results, or not run} |
| coc-audit | completed / no change / blocked | {audit scope and confirmed findings} | {audit artifact, or none} | {reproductions and checks, or not run} |
| coc-release-check | completed / no change / blocked | {candidate and release evidence} | {release-facing changes, or none} | {release checks and results, or not run} |

Final decision: ready / ready with documented exceptions / blocked
Blocking items: {none or numbered blockers}
Next action: {one concrete next action}
```
