# Road to 0.1.0 (release candidate)

Working method: **doers and thinkers**. The tech lead (this session) does
all thinking, makes every design decision (recorded in
`docs/decisions/`), and integrates; doer agents (Opus for complex
builds, Sonnet for mechanical work) execute tightly-specified work items
with no design latitude, and a design-lead reviewer (Fable) audits the
release candidate — its findings are ratified or rejected by the tech
lead. Work is tracked as session task items mirrored here.

## Sprint 0 — Decisions on paper
- ADR-0001..0006 written. ✅ gates all work.

## Sprint 1 ✅ — Architecture to match the decisions
- Extract `packages/agent-cli` (adapter) from `@bsf/engine`; engine back
  to zero dependencies (ADR-0001/0002).
- `bsf:code language="…"` agent-executed snippets (ADR-0003); sample and
  docs updated.
- Studio panels into `components/panels/` (ADR-0006).

## Sprint 2 ✅ — VS Code extension
- `packages/vscode-ext`: custom webview editor for `*.bpmn` — render +
  presentation playback + steps/state console; "Open as XML" for editing
  (ADR-0005). Builds to a `.vsix` with bun + vsce.

## Sprint 3 ✅ — Release pipeline
- `release.yml` (workflow_dispatch): full test chain → bun-compiled
  `bsf-agent` binaries (5 targets) + `.vsix` → tag `v0.1.0` → GitHub
  Release (ADR-0004). All package versions synchronized at 0.1.0.

## Sprint 4 — Improvement sprint, then cut the RC
- Design-lead (Fable) audit of the whole surface (defects, least
  surprise, architecture conformance, docs, release pipeline); accepted
  findings fixed.
- Full verification: unit + conformance + reference suites, browser e2e,
  live Pages site.
- Dispatch the release; verify the tag, release notes and artifacts.

## Definition of done for 0.1.0
1. Website IDE published (GitHub Pages) and green in e2e.
2. VS Code extension `.vsix` on the release, opening `.bpmn` files with
   run/playback.
3. `bsf-agent` binaries on the release; JSON-RPC loop proven by the
   agent-cli test suite (fresh process per request = durable resume).
4. Decision record and sprint docs in-repo and current.

## Deferred beyond 0.1.0 (ratified in the Sprint 4 audit)
- Extract the duplicated playback timeline controller (studio ↔ VS Code
  webview) into a shared `@bsf/playback` module before a third consumer
  appears; until then the webview smoke suite guards behavior drift.
- Code-split the webview bundle (CodeMirror merge view dominates the
  641 KB chunk); acceptable resident cost for now.
- npm + VS Code Marketplace publishing (need tokens; the GitHub Release
  artifacts are the supported install paths).
