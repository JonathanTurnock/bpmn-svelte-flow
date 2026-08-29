---
name: clean-code-review
description: Multi-agent clean code audit — each principle gets its own agent
---

## Proportionality gate

Check diff size first:
- **> 50 lines changed OR > 3 files touched** → full sub-agent audit below.
- **Otherwise** → self-scan inline. One pass, same principles, no sub-agents. Tag violations you find.

## Repo shape (scope for every agent)

Audit `src/lib` (the published library), `src/stories/helpers`, `scripts/`,
`.storybook/`, and `tests/`. Story files (`src/stories/*.stories.ts`) and
`.bpmn` fixtures are data-heavy by design: BPMN XML literals and DI coordinate
tables are fixture data, not logic — only flag real logic duplicated there.
Never audit `node_modules/`, `dist/`, or `storybook-static/`.

## Agents (full audit only)

Launch parallel sub-agents, each scanning files touched by the current change + immediate surroundings.

1. **SRP** — functions doing two jobs, components mixing parsing/layout/interaction concerns, modules with multiple reasons to change, mixed I/O and logic.
2. **DRY** — copy-pasted blocks, duplicated constants, near-identical functions or Svelte markup/styles, repeated conditionals.
3. **Naming** — unclear/misleading names, generic names (manager/handler/processor/data/util), no intent revealed.
4. **Coupling** — concrete deps constructed inline where they should be injected, shared mutable state, components reaching into another module's internals.
5. **Dead code** — unused functions/exports, unreachable branches, commented-out code, stale imports, props nothing passes.
6. **KISS** — unnecessary complexity, over-engineered abstractions, premature generalisation. 5-whys each finding. Can't justify it → violation.
7. **BOUNDARY** — contract-not-implementation coupling across module/system seams.
    - A consumer imports from another module's internals instead of its published
      face (for this library: `src/lib/index.ts` is the public contract; deep
      imports across sibling subsystems — e.g. components reading parser internals
      beyond the exported functions/types — are seams to check).
    - Signatures or wiring name a concrete impl where the published contract
      belongs — so swapping the impl forces edits in the consumer.
    - Third-party surface (`@xyflow/svelte`, `bpmn-moddle`) leaking raw through the
      library's public API where a translation type exists (missing ACL) — but the
      deliberate re-export of Svelte Flow node/edge types IS the contract here.
    - Dependency points toward the more-volatile side (stable code depending on volatile concretes).
8. **PANIC** (crash-safety, adapted for TypeScript) — library paths that throw or crash on reachable input.
    - Non-null assertions (`!`), unchecked `array[i]` / `.find(...)` results, or
      `as` casts that defeat checks, on values reachable from real input
      (user-supplied BPMN XML, DI geometry, user script text, JSON payloads).
    - `JSON.parse`, `new Function(...)` construction/execution, or moddle access
      without a guard on a live path — user XML and user scripts are hostile input;
      a malformed file must degrade to a warning or error state, never an
      unhandled exception that blanks the canvas.
    - Unhandled promise rejections in effects; infinite loops on cyclic graphs
      (simulation must stay step-bounded).
    - Every error path handled: return a warning, fall back to a safe value, or
      guard the precondition. Blast radius scales severity — a throw in
      transform/parse kills the whole diagram; in one node component, one shape.

## BOUNDARY gate (inverse of KISS)
Fire ONLY where a real seam exists: a cross-system or cross-context call, a trust/security
perimeter, or a swap that is actual or credibly imminent. Each finding must name the decision
the boundary lets change independently. Can't name one → don't flag — and flagging it anyway
is itself a KISS violation.

## PANIC gate
Fire ONLY when the throw/crash is REACHABLE from real input. An assertion that is provably
safe by an invariant established just above it (a length check, a `has()` just performed, a
compile-time constant) is NOT a violation — but the invariant should be named in a comment.
Test code (`tests/`, fixtures, story files, verification scripts) is EXEMPT: bare access
there is idiomatic and documents the test's assumptions. Name the reachable input that
triggers each flagged crash; can't name one → it's safe, don't flag.

## Each agent

- Reports: file, line range, description, severity (0–1).
- Ignores: test boilerplate, framework-mandated patterns (Svelte 5 runes idioms,
  Storybook CSF shape, moddle's untyped `any` surface), pre-existing issues outside the diff.

## Consolidation

For each violation scoring **> 0.5**:

```
// TODO: clean-code - <0-1 score> - <SRP|DRY|NAMING|COUPLING|DEAD|KISS|BOUNDARY|PANIC>: <description>
```

Add at the violation site. Violations you introduced this session scoring > 0.5 → fix immediately.
