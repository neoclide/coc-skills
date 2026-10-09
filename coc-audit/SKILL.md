---
name: coc-audit
description: Comprehensive code audit of a coc.nvim extension. Finds real bugs, lifecycle and disposal problems, LSP issues, async races, performance and memory risks, security risks, Vim/Neovim and coc.nvim compatibility problems, unsafe coc.nvim API assumptions, and missing tests. Use when asked to audit, review, or inspect a coc.nvim extension codebase; reports findings without modifying code.
---

# Audit a coc.nvim Extension

Report actionable, evidence-backed problems. Do not modify code or refactor during an audit unless explicitly asked.

## Rules

1. Report only problems with evidence in the code; no theoretical issues, no praise, no style nitpicks over real bugs.
2. Every finding includes location, problem, impact, and fix direction.
3. Respect coc.nvim architecture; do not recommend VS Code APIs or speculative compatibility layers.
4. Treat editor responsiveness, disposal, and async lifecycle as priorities.
5. Suggest a regression test for every confirmed bug, preferably a `coc-test` integration test.

## Checklist

1. **Architecture**: read `package.json`, `README.md`, the activation entry, typings, and test configuration. Identify commands, configuration, providers, background processes, dependencies, and the supported coc.nvim (`engines.coc`), Node.js, Vim, and Neovim versions. Write a short summary.
2. **Lifecycle**: `activate()`/`deactivate()`, `context.subscriptions`, event listeners, timers, watchers, child processes, sockets. Look for missing disposal, uncleared timers, unremoved listeners, and unterminated processes.
3. **coc.nvim API usage**: command registration, configuration reads and updates, events, `window`/`workspace` APIs. Look for incorrect or deprecated usage, invalid assumptions, and missing error handling.
4. **LSP**: language-client lifecycle, initialization, capabilities, requests, cancellation, progress, JSON-RPC errors. Look for server leaks, initialization races, and protocol mistakes.
5. **Async**: unhandled promises, swallowed errors, races, duplicate initialization, stale state updates.
6. **Node.js runtime**: CommonJS/ESM compatibility, filesystem use, `child_process` exit/stderr handling and cleanup, zombie processes, Node version compatibility.
7. **Performance**: hot paths (completion, diagnostics, hover, code actions, document-change handlers). Look for blocking work, repeated parsing, unnecessary scans, missing caching.
8. **Memory**: unbounded caches, retained documents, accumulating listeners, global mutable state.
9. **Security**: external command execution, shell concatenation (prefer argument arrays), file access, temporary files.
10. **Compatibility**: Vim vs. Neovim differences and the declared coc.nvim version range.
11. **Tests**: coverage of activation, commands, configuration, errors, disposal, and LSP communication.

## Severity

- **Critical**: crashes, data loss, security issues, broken activation.
- **High**: unusable features, memory leaks, incorrect LSP behavior.
- **Medium**: performance problems, missing cleanup, poor error handling.
- **Low**: maintainability issues, minor improvements.

## Output

Return findings only, in this structure (omit empty severity sections):

```markdown
# Audit Summary

Plugin: <name>  Version: <version>  Audit date: <date>

## Critical

### <Issue title>

- Location: <file>:<line>
- Problem:
- Impact:
- Reproduction:
- Suggested fix:
- Suggested test:

## High / Medium / Low

...

## Missing Tests

- <test description> — <reason>

## Overall Assessment

<short summary>
```
