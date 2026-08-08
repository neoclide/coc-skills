# Coc Preservation Checklist

Use only the sections touched by the upstream change. This checklist complements repository-specific tests; it does not replace them.

## Manifest and User-Facing Surface

- Extension entry point and activation events
- Command IDs, titles, arguments, and enablement behavior
- Configuration keys, scopes, defaults, enums, and deprecations
- Language IDs, aliases, extensions, filenames, and document selectors
- Snippets, schemas, root patterns, and contributed metadata
- Existing Vim/Neovim commands or documented setup

## Coc Host Adapter

- Imports come from supported coc.nvim packages, not the VS Code runtime
- Registrations use the current coc.nvim API and enter the correct disposable collection
- Configuration reads and change listeners retain coc scopes and reload behavior
- Workspace-folder, URI, buffer, and untitled-document handling remain correct
- UI actions use meaningful coc equivalents; unsupported VS Code UI is omitted explicitly
- Output channels, status items, notifications, quick picks, and progress are cleaned up

## Language Client and Server

- Server module/binary resolution order
- Node executable, environment, arguments, working directory, and transport
- Initialization options, capabilities, middleware, selectors, and synchronization
- Start, ready, restart, stop, crash, and deactivation behavior
- Multi-root and per-workspace server ownership
- File watchers, configuration notifications, and open-document replay
- Client/server protocol versions and shared type compatibility

## Coc-Only Behavior

- Features described under “Differences with VS Code” or equivalent documentation
- Commands and settings with no upstream equivalent
- Vim/Neovim buffer, filetype, byte-offset, virtual-text, quickfix, and window behavior
- Workarounds linked to coc.nvim issues or API limitations
- Downstream fixes carried in history but not merged upstream
- Compatibility required by the repository's documented Node.js, Vim, Neovim, and coc.nvim ranges

## Verification Matrix

For every touched contract, record one of:

| Status | Meaning |
| --- | --- |
| Preserved | Existing behavior remains and is covered by a check or direct inspection. |
| Adapted | Upstream behavior was translated to coc.nvim and verified. |
| Intentionally changed | The task authorizes a coc behavior change and regression coverage exists. |
| Omitted | The upstream behavior is VS Code-only or lacks a sound coc equivalent; reason recorded. |
| Unverified | Validation was impossible; risk and exact missing check recorded. |

## Stop Conditions

Stop and request direction when:

- the upstream repository or target ref cannot be identified confidently;
- licensing or provenance of copied code is unclear;
- the upstream change requires an unsupported host capability and product behavior would materially differ;
- preserving a coc contract conflicts with the requested upstream behavior;
- a breaking configuration or command change was not explicitly authorized;
- baseline failures prevent distinguishing the port's effects.
