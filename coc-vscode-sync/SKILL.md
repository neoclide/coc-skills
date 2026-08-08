---
name: coc-vscode-sync
description: Safely synchronize a coc.nvim extension with changes from a VS Code extension or another editor upstream while preserving coc-specific commands, settings, activation, language-server wiring, Vim/Neovim behavior, and lifecycle cleanup. Use for upstream syncs, ports, rebases, cherry-picks, dependency refreshes tied to upstream, parity updates, or reviews of proposed upstream-derived diffs in neoclide coc extension repositories.
---

# Synchronize Coc Extensions with VS Code Upstream

Port upstream behavior deliberately. Treat the existing coc extension as a maintained product, not as a generated downstream copy.

## 1. Establish the Sync Boundary

1. Read every applicable `AGENTS.md`, the repository documentation, `package.json`, lockfile, build configuration, and relevant tests.
2. Inspect `git status`; preserve unrelated changes.
3. Identify and record:
   - upstream repository;
   - last synchronized upstream ref, if discoverable;
   - target upstream ref;
   - requested feature, fix, or comparison range.
4. If the upstream or target ref is ambiguous, stop and ask. Do not sync against a guessed branch or release.
5. Run the smallest relevant baseline build or test. Record existing failures.

## 2. Capture the Coc Contract

Run the bundled inventory before editing:

```bash
node <skill-dir>/scripts/coc_contract_inventory.mjs \
  --root . --output /tmp/coc-contract-before.json
```

Read [references/preservation-checklist.md](references/preservation-checklist.md) before changing an activation file, manifest contribution, language-client setup, or server lifecycle.

Also inspect history and code to identify coc-only behavior that static scanning cannot prove: Vim/Neovim buffer semantics, workspace behavior, restart handling, middleware, module resolution, and intentional deviations documented in issues or comments.

## 3. Build a Change Ledger

Review the upstream range before editing. Classify every relevant change:

| Class | Treatment |
| --- | --- |
| Shared server/domain logic | Port closely, retaining downstream fixes and tests. |
| Editor-host adapter | Translate semantics to current coc.nvim APIs and lifecycle. |
| VS Code-only behavior | Omit with a reason unless coc.nvim has a real equivalent. |
| Manifest or configuration | Map manually; preserve existing coc keys, defaults, commands, selectors, and activation. |
| Dependency/build/test | Adopt only what the port needs; keep the coc toolchain coherent. |

Do not use a raw directory replacement as the change ledger. Use upstream diffs, commit messages, release notes, and source together.

## 4. Implement the Port

1. Port behavior in small, reviewable units.
2. Keep shared/server logic separate from editor-host glue when consistent with the repository architecture.
3. Translate VS Code APIs using the installed coc.nvim types and existing repository patterns. Never assume same-named APIs have identical semantics.
4. Preserve coc-specific branches during conflict resolution. Never accept an entire upstream adapter file to resolve a conflict.
5. Preserve commands, settings, defaults, language IDs, selectors, activation events, disposables, restart/deactivation cleanup, workspace behavior, and documented coc-only features unless the task explicitly changes them.
6. Do not add `vscode` as a production runtime dependency or add nonfunctional stubs for unsupported VS Code features.
7. Keep `package.json`, lockfile, build configuration, generated output, and bundled artifacts consistent with repository policy. Do not copy the upstream manifest wholesale.

Prefer semantic manual ports over cherry-picks when host-specific code is interleaved. Cherry-pick only when the commit boundary is clean enough to review every resulting conflict and host assumption.

## 5. Verify Preservation

Run the inventory comparison after editing:

```bash
node <skill-dir>/scripts/coc_contract_inventory.mjs \
  --root . --compare /tmp/coc-contract-before.json
```

Exit code `2` means a public identifier disappeared, a configuration/command/language contract changed, a Coc adapter surface was lost, the Coc engine changed, or a VS Code runtime dependency appeared. Treat it as a mandatory review signal, not proof of a bug. Restore unintended changes; explicitly explain intentional ones.

Then:

1. Add or update a regression test for the upstream behavior.
2. Add or update a regression test for each affected coc-only contract.
3. Run targeted tests, type-check/build, and the broader relevant suite.
4. Test activation, restart, and deactivation when client/server lifecycle changed.
5. Run `git diff --check` and inspect the complete diff for VS Code imports, deleted coc branches, manifest drift, generated files, debug output, and unrelated changes.

Do not weaken tests or snapshots merely to make upstream output pass. Update expectations only after verifying that the behavior is correct for coc.nvim.

## 6. Report the Result

Provide a short ledger containing:

- exact upstream range and adopted behavior;
- coc-specific behavior preserved or intentionally changed;
- VS Code-only changes omitted and why;
- checks actually run and pre-existing failures;
- remaining risks or unverified paths.

Never claim full upstream parity unless the full relevant range and behavior were verified.
