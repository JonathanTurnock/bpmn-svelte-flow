# ADR-0002 — Bun workspace layout; the renderer stays at the repo root

**Status**: accepted · **Date**: 2026-09-04

## Decision

The repo is a bun workspace (bun is the package manager, runner, bundler
and compiler everywhere):

```
/                      bpmn-svelte-flow — the Svelte Flow BPMN renderer (published lib)
packages/engine        @bsf/engine — domain core (zero deps)
packages/agent-cli     @bsf/agent-cli — bsf-agent JSON-RPC adapter + binary
packages/vscode-ext    bsf-vscode — VS Code custom editor adapter
studio/                bsf-studio — the website IDE (deployed to GitHub Pages)
```

The renderer **stays at the repo root** rather than moving under
`packages/`.

## Why (least surprise)

Consumers already install it with `npm install
github:JonathanTurnock/bpmn-svelte-flow`; GitHub installs resolve the
repository root's package.json, and the `prepare` script builds `dist/` on
install with any package manager. Moving the lib into `packages/` would
silently break every existing install line — the highest-surprise change
available to us — for aesthetic gain only. Monorepos with a "main" package
at the root (with satellites in `packages/`) are a recognized pattern.

## We could, but should we?

We could publish each package to npm and restructure freely. Until there's
an npm presence, the GitHub-install contract is the public API of this
repo, and we keep it.

## Consequences

- Reusable components each live in exactly one package: rendering (root),
  semantics (engine), agent protocol (agent-cli), editor host (vscode-ext).
- Apps (`studio/`, `packages/vscode-ext`) depend on packages, never the
  reverse.
