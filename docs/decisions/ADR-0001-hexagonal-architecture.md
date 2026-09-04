# ADR-0001 — Hexagonal architecture: the engine is the domain core

**Status**: accepted · **Date**: 2026-09-04

## Decision

`@bsf/engine` is the pure domain core. It knows BPMN semantics and nothing
else: no filesystem, no network, no DOM, no environment access. Everything
that touches the outside world is an **adapter** speaking to the core
through explicit **ports**:

| Port (into/out of the core)         | Contract                                                | Adapters                                   |
| ----------------------------------- | ------------------------------------------------------- | ------------------------------------------ |
| Model in                            | a parsed `bpmn:Definitions` moddle tree                 | studio (browser parse), agent-cli (fs), VS Code ext (document text) |
| Script execution                    | `text/javascript` bodies run in-process, isolated in `runScript` | —                                    |
| Agent work (driven port)            | `onAgentTask(task) → result \| undefined`, `pendingAgentTasks()`, `completeAgentTask()` | agent-cli (JSON-RPC + replay), future webhooks |
| Observation out                     | `state` (log, visited, edgeTrail, results), frames derived by callers | studio playback, CLI `trace`      |
| Durability                          | **event-sourced replay** — the core stays memory-only; adapters persist inputs + completions and replay | agent-cli (`.bsf-runs/*.json`) |

## Why (least surprise)

This is how comparable engines behave: Camunda/Zeebe engines never execute
worker code — external task workers poll and complete over an API; bpmn-io
keeps the model library DOM-free. A user coming from those ecosystems
expects the engine to be embeddable anywhere and the CLI/UI to be shells
around it. Durable state by replay (not by serializing the live run)
mirrors event-sourced workflow engines and avoids the closure-serialization
trap entirely.

## Consequences

- `@bsf/engine` has **zero runtime dependencies** (bpmn-moddle lives with
  the adapters that parse XML).
- The CLI, studio, and VS Code extension may not import each other — only
  the core (and the renderer, for UIs).
- Determinism is a contract: replay assumes scripts/mocks are
  deterministic; the docs say so.
