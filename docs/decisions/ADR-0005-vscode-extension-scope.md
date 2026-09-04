# ADR-0005 — VS Code extension: run-first custom editor, XML edits in the text editor

**Status**: accepted · **Date**: 2026-09-04

## Decision

`bsf-vscode` registers a webview **custom editor** for `*.bpmn` that
reuses the repo's renderer + engine to provide what the studio's run
console provides: the diagram, presentation playback (play/pause, step,
scrub, speed, lockstep parallel tokens), the beat-grouped steps view and
per-step state diffs, scenario selection, and embedded test results.

Model **editing** in 0.1.0 happens in the XML: the extension contributes
an "Open as XML" action (and VS Code's built-in *Reopen editor with…*
works both ways); the webview re-renders live as the underlying document
changes. The webview does not mutate the model in 0.1.0.

## Why (least surprise)

The canonical precedent is bpmn-io's VS Code extension: a webview canvas
over the file, with the text editor a reopen away. Users expect a `.bpmn`
file to open as a diagram, and expect run/debug affordances in an
editor tab. Shipping one-way rendering first avoids the
webview↔TextDocument two-way sync problem (undo stacks, conflict
resolution) that produces the *most* surprising bugs in custom editors.

## We could, but should we?

We could embed the full studio (palette, inspector mutations) in the
webview. We should not for the RC: mutation without airtight document
sync corrupts user files — the least acceptable surprise of all. The
studio remains the full IDE; the extension is the runner in your editor.

## Consequences

- The extension bundles a webview app built by bun from the same Svelte
  components (`RunPanel`-equivalent console + canvas).
- File watching: webview refreshes on document change; run state resets
  on model change (same rule as the studio).
