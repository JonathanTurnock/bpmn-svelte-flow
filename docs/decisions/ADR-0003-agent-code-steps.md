# ADR-0003 — bsf:instructions is prose; bsf:code delegates snippets to the agent

**Status**: accepted · **Date**: 2026-09-04

## Decision

Agent tasks are described by two extension elements:

- `bsf:instructions` — natural-language work item (what to do, which
  payload fields to set). Required for a task to be agent-driven.
- `bsf:code language="python|shell|sql|javascript|…"` — optional snippet
  the **agent executes itself** as part of the step, in whatever runtime
  it has. The engine passes it through verbatim in `pendingAgentTasks()`
  and the CLI's `next` (`task.code = { language, body }`).

The engine executes **only `text/javascript`** (scripts, mocks,
conditions), in-process. It never spawns interpreters for other languages
— Python, shell, etc. are the agent's job.

## Why (least surprise)

Precedents: Zeebe/Camunda engines never run worker code — workers fetch a
job (with its payload/headers) and complete it; GitHub Actions attaches
`run:` snippets that the *runner*, not the orchestrator, executes with a
declared `shell:`. An LLM agent with a sandbox is exactly such a worker.
Users would be surprised if a browser-embeddable BPMN engine silently
executed Python; nobody is surprised that a work item can carry a script
for the worker.

## We could, but should we?

We could ship a Python-in-WASM runtime (Pyodide) and execute
`bsf:code` in-engine. We should not for 0.1.0: it multiplies bundle size
and the security surface, and it changes the engine's promise ("JS only,
in-process") — revisit if simulation of non-JS steps becomes a real need.

## Consequences

- The simulator keeps using `bsf:mock` (JS) as the stand-in for the whole
  agent step, including its snippet's effect.
- `bsf:code` on a task without `bsf:instructions` is surfaced by the
  validator as advisory (code with no worker to run it).
