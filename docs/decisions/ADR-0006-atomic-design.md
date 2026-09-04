# ADR-0006 — Atomic design mapping for UI code

**Status**: accepted · **Date**: 2026-09-04

## Decision

UI code is organized by atomic-design level, mapped onto what already
exists rather than renamed wholesale:

| Level     | Location                                        | Examples                                     |
| --------- | ----------------------------------------------- | -------------------------------------------- |
| Atoms     | `studio/src/lib/components/ui/*` (shadcn-svelte, CLI-managed) | Button, Badge, Dialog, Tabs        |
| Molecules | `studio/src/lib/components/*` single-purpose composites | CodeEditor, StateDiff                 |
| Organisms | `studio/src/lib/components/panels/*`            | RunPanel, InspectorPanel, LeftPanel, TestsPanel, IssuesPanel, XmlPanel |
| Templates/pages | `studio/src/App.svelte`                   | the IDE layout                               |
| (Domain atoms) | root `src/lib/components/*`                | BPMN nodes/edges — the renderer's own system |

Rules: atoms never import molecules; organisms own studio-store access;
molecules stay store-free (props in, events out); the renderer package
knows nothing of the studio.

## Why (least surprise)

shadcn's `ui/` directory *is* the community's atoms convention — renaming
it would fight the CLI that manages it. Grouping panels makes the
organism layer visible without inventing new vocabulary in imports.

## Consequences

- Panels move to `components/panels/`; CodeEditor/StateDiff stay put as
  molecules. StateDiff drops its store import if one ever creeps in.
