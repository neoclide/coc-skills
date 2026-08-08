---
name: coc-workflow
description: Maintain coc.nvim extensions safely from investigation through implementation and verification. Use for routine maintenance, bug fixes, features, refactors, dependency or tooling updates, documentation, configuration, commands, providers, language-server integration, tests, CI, upstream synchronization, audits, issue work, and release preparation in coc.nvim plugin repositories. Route specialized work to coc-issue, coc-test, coc-vscode-sync, coc-audit, or coc-release-check while preserving coc.nvim-specific behavior and repository conventions. Use Full workflow mode when the user explicitly asks for a complete maintenance workflow or for every referenced coc skill to run in sequence.
---

# Maintain a coc.nvim Extension

Make the smallest complete change that solves the requested maintenance task. Preserve the extension's public behavior, coc.nvim integration, Vim/Neovim compatibility, and existing project conventions unless the task explicitly changes them.

## Choose the workflow

Use this skill as the coordinator. Apply a specialized skill when the task matches one of these cases:

| Task | Specialized skill |
| --- | --- |
| Triage or resolve GitHub issues | `coc-issue` |
| Port or compare changes from a VS Code or other upstream extension | `coc-vscode-sync` |
| Add, migrate, or repair integration tests using coc-test | `coc-test` |
| Inspect the codebase for bugs, risks, or missing tests | `coc-audit` |
| Decide whether an extension is ready to publish | `coc-release-check` |

When tasks overlap, keep one requested outcome and apply specialized workflows only to their relevant phases. For example, use `coc-issue` to govern an issue fix and `coc-test` only for the integration-test work it requires. Do not turn a focused bug fix into a repository-wide audit or release review.

For ordinary feature work, refactors, dependency maintenance, documentation, configuration, CI, or build changes, follow the workflow below directly.

## Full workflow mode

Enter this mode only when the user explicitly requests `Full workflow`, a "complete maintenance workflow", `完整维护流程`, or execution of every referenced coc skill. Ordinary maintenance requests continue to use the conditional routing above.

First complete the repository-context and requested-outcome steps below. Then apply every specialized skill strictly in this order, without parallelizing phases:

1. `coc-issue` — process the explicitly requested issue scope one issue at a time and implement only authorized, evidence-backed changes.
2. `coc-vscode-sync` — inspect or synchronize the explicitly identified upstream and target range while preserving the coc.nvim contract.
3. `coc-test` — establish or repair the appropriate coc-test integration coverage and verify behavior changed by earlier phases.
4. `coc-audit` — audit the resulting tree and report confirmed remaining findings without silently turning the audit into unrelated refactoring.
5. `coc-release-check` — evaluate the final candidate and return the release decision last.

Complete and verify each phase before starting the next. Do not silently omit a phase. If a phase has no applicable change, still inspect its required evidence and record a `no change` result with the reason. If an issue number, upstream repository or ref, release candidate, authorization, or another required decision cannot be discovered safely, report the exact blocker and ask for the missing input before performing dependent changes.

The specialized skill governs its own phase, including its safety and validation rules. Full workflow mode does not authorize commits, GitHub writes, pushes, publication, issue closure, or release creation. End with a five-phase ledger showing `completed`, `no change`, or `blocked`, the evidence collected, changes made, and checks run for each phase.

Write the complete ledger to `<repository-root>/.codex/coc-workflow.md`. Create the `.codex` directory when needed. Write the file after all five phases so the report itself does not alter the candidate inspected by earlier phases. If the workflow must pause or stop early, write the partial ledger before asking for input or reporting the blocker, and mark every unstarted dependent phase as `blocked` with the reason.

Read an existing `.codex/coc-workflow.md` before replacing it. Replace it when it is a report from a previous Full workflow run; if it contains unrelated user-maintained content, preserve it and ask before overwriting. Treat the ledger as a workflow artifact: do not stage, commit, publish, or include it in the release package unless the user explicitly requests that. In the final response, link to the report file and summarize the final decision and blockers.

Use this exact final-report structure and keep the phase order unchanged:

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

Replace every placeholder with concrete evidence. Do not leave alternative status or decision values in the final output. Use `not run` only with a reason, and use `no change` only after completing the phase's required inspection.

## 1. Establish repository context

Before editing:

1. Find the repository root and read all applicable `AGENTS.md` files.
2. Read `CONTRIBUTING.md`, `README.md`, `package.json`, the package-manager lockfile, TypeScript/build configuration, relevant tests, and CI workflows as needed for the task.
3. Inspect `git status --short` and preserve unrelated staged, unstaged, and untracked changes.
4. Detect the package manager from `package.json#packageManager` and lockfiles. Use its existing commands; do not create or rewrite a lockfile with a different manager.
5. Identify the activation entry point, extension exports, contributed commands and configuration, language selectors, providers, language clients or child processes, and relevant disposal paths.
6. Determine supported Node.js, coc.nvim, Vim, and Neovim versions from repository evidence instead of assuming current versions.
7. Inspect nearby implementation and tests before proposing a new abstraction or API usage.

Do not run install, generation, formatting, or broad test commands until their effects and repository conventions are understood. Do not discard or rewrite user changes.

## 2. Define the requested outcome

Translate the request into observable acceptance criteria. Separate:

- behavior that must change;
- behavior and public contracts that must remain unchanged;
- files or subsystems likely involved;
- validation needed to prove the result;
- ambiguities that would materially change public behavior.

Use code, tests, documentation, issue discussion, and history as evidence. For a reported bug, reproduce it with a focused failing test or minimal reproduction when practical. If the current code does not reproduce the report, continue investigating and report that result; do not make a speculative production change.

If multiple interpretations would create materially different behavior and repository evidence does not resolve them, ask for direction before implementing that decision.

## 3. Preserve the coc.nvim contract

Review the parts relevant to the change:

- activation and deactivation behavior;
- `ExtensionContext.subscriptions` and disposal of commands, providers, events, timers, watchers, language clients, child processes, and sockets;
- command IDs, configuration keys and defaults, language IDs, document selectors, activation conditions, and manifest contributions;
- workspace folders, buffer/document lifecycle, cancellation, concurrent activation, restart, and shutdown behavior;
- Vim and Neovim differences and the repository's declared compatibility range;
- coc.nvim APIs and types actually installed by the repository;
- language-server protocol capabilities, initialization, requests, notifications, errors, and cancellation;
- packaged runtime files, bundled servers, schemas, snippets, queries, and other assets.

Do not assume a VS Code API with a similar name has the same semantics in coc.nvim. Do not introduce a `vscode` runtime dependency, host-compatibility shim, or speculative fallback unless the task requires it.

## 4. Implement the smallest complete change

1. Fix the root cause at the narrowest correct layer.
2. Follow existing architecture, naming, error handling, module format, and dependency policy.
3. Prefer existing abstractions and installed dependencies over new infrastructure.
4. Keep unrelated refactors, formatting churn, dependency upgrades, and generated changes out of the patch.
5. Preserve public APIs and defaults unless changing them is part of the acceptance criteria.
6. Handle asynchronous lifecycle and cleanup explicitly. Avoid fire-and-forget promises, duplicated initialization, stale state updates, and leaked resources.
7. Pass child-process arguments without shell interpolation when possible and avoid exposing tokens, paths, or user content in logs.
8. Update the manifest, configuration schema, documentation, typings, and generated artifacts together when they describe the changed public contract.
9. Update `history.md` or the repository's changelog only for user-visible changes and only when repository policy uses it. Do not create release notes for internal-only work unless requested.

Do not add compatibility layers, settings, or abstractions for hypothetical future needs.

## 5. Add proportionate tests

Add or update tests for changed behavior:

- Use a focused regression test for a bug and confirm it exercises the former failure when practical.
- Test observable behavior and important error or cleanup paths rather than private implementation details.
- Keep pure logic on the repository's existing unit-test runner.
- Use coc-test for behavior that requires a real coc.nvim and Vim/Neovim runtime.
- Use observable events, hooks, promises, or state transitions for asynchronous tests. Do not use fixed sleeps as synchronization.
- Preserve meaningful existing coverage; do not weaken assertions or snapshots merely to make a change pass.

Documentation-only, comment-only, or mechanical metadata changes may not need a new automated test. State the deterministic validation used instead. If behavior changes but automated coverage is genuinely impractical, explain why and perform the strongest available verification.

## 6. Validate in increasing scope

Inspect declared package scripts and CI before choosing commands. Run, as applicable:

1. the new or changed test;
2. the nearest relevant unit or integration suite;
3. type checking, linting, or formatting checks for affected code;
4. the production build;
5. the broader test suite when proportionate to the change;
6. Vim and Neovim integration checks when editor-facing behavior or compatibility changed;
7. `git diff --check` and a final review of the complete diff.

After commands that generate files, inspect `git status --short` and retain only intended artifacts. A passing assertion does not override a nonzero process exit, unhandled rejection, transport failure, leaked process, or teardown error.

If a broad check fails, isolate the relevant test or smaller batch and determine whether the failure is caused by the patch, pre-existing, environmental, or due to test concurrency. Do not claim a failure is unrelated without evidence, and do not change production code merely to hide a flaky harness.

## 7. Finish with an evidence-based report

Report:

- what behavior changed and why;
- the important files or coc.nvim contracts affected;
- tests and checks actually run, with pass/fail results;
- anything not run and why;
- remaining risks, pre-existing failures, or follow-up decisions.

Do not claim a bug is fixed, compatibility is preserved, tests pass, or a release is ready unless the reported evidence proves it. Do not commit, push, publish, close issues, or create releases unless the user explicitly authorized that action.
