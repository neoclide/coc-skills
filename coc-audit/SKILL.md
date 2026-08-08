---
description: Comprehensive code audit skill for coc.nvim extensions.
  Finds bugs, lifecycle issues, LSP problems, performance issues,
  compatibility risks, and missing tests.
name: coc-audit
---

# coc.nvim Plugin Code Audit Skill

## Purpose

Perform a comprehensive code audit for coc.nvim extensions.

The goal is to identify: - real bugs - lifecycle problems -
compatibility issues - performance problems - missing tests - unsafe
assumptions about coc.nvim APIs - maintainability issues

Do not refactor code unless explicitly requested. Focus on actionable
problems.

## Audit Workflow

### 1. Understand Plugin Architecture

Read: - package.json - README.md - activation entry - typings - test
configuration

Identify: - activation entry point - commands - configuration options -
providers - background processes - dependencies - supported coc.nvim
versions

Create a short architecture summary.

### 2. Activation Lifecycle Audit

Review: - activate() - deactivate() - ExtensionContext - subscriptions -
event listeners - timers - child processes - watchers - sockets

Find: - resource leaks - missing disposal - timers not cleared -
listeners not removed - processes not terminated

Every finding should include: - location - problem - impact - fix
direction

### 3. coc.nvim API Usage Audit

Check: - commands registration and disposal - workspace configuration -
event handling - window APIs - workspace APIs

Verify: - correct API usage - deprecated APIs - invalid assumptions -
missing error handling

### 4. LSP Audit

Review: - language client lifecycle - initialization - capabilities -
requests - responses - cancellation - progress handling - JSON-RPC
errors

Look for: - server leaks - initialization races - incorrect protocol
handling

### 5. Async Audit

Check: - unhandled promises - swallowed errors - race conditions -
duplicate initialization - stale async state updates

### 6. Node.js Runtime Audit

Review: - CommonJS/ESM compatibility - filesystem operations -
child_process usage - Node version compatibility

For processes check: - exit handling - stderr handling - cleanup -
zombie processes

### 7. Performance Audit

Prioritize editor responsiveness.

Review hot paths: - completion - diagnostics - hover - code actions -
document change handlers

Find: - blocking operations - repeated parsing - unnecessary scans -
missing caching

### 8. Memory Audit

Check: - unbounded caches - retained document objects - event listener
accumulation - global mutable state

### 9. Security Audit

Review: - external command execution - unsafe shell usage - file
access - temporary files

Prefer safe argument passing instead of shell concatenation.

### 10. Compatibility Audit

Check: - Vim compatibility - Neovim compatibility - coc.nvim version
compatibility - deprecated APIs

Avoid speculative compatibility layers.

### 11. Testing Audit

Review tests for: - activation - commands - configuration - errors -
disposal - LSP communication

Prefer integration tests using coc-test.

For every confirmed bug suggest: - reproduction case - regression test -
expected behavior

## Bug Classification

### Critical

-   crashes
-   data loss
-   security issues
-   broken activation

### High

-   unusable features
-   memory leaks
-   incorrect LSP behavior

### Medium

-   performance problems
-   missing cleanup
-   poor error handling

### Low

-   maintainability issues
-   minor improvements

## Output Format

Return findings only.

Use:

# Audit Summary

Plugin: Version: Audit date:

## Critical

### Issue title

File: Line:

Problem:

Impact:

Reproduction:

Suggested fix:

Suggested test:

## High

...

## Medium

...

## Low

...

# Missing Tests

-   test description
-   reason

# Overall Assessment

Short summary.

## Rules

1.  Do not praise code.
2.  Do not report theoretical problems without evidence.
3.  Every finding must include location, reason, impact, and fix
    direction.
4.  Prefer real bugs over style issues.
5.  Do not modify code during audit.
6.  Respect coc.nvim architecture.
7.  Treat editor responsiveness as a priority.
8.  Always check disposal and async lifecycle.
9.  Always suggest regression tests for confirmed bugs.
