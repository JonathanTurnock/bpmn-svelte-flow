# ADR-0004 — Releases: tagged GitHub Releases built by a dispatchable workflow

**Status**: accepted · **Date**: 2026-09-04

## Decision

Releases are cut by a `workflow_dispatch` GitHub Actions workflow
(`release.yml`) that takes a version input, verifies the full test chain,
builds the artifacts, creates the `v<version>` tag, and publishes a GitHub
Release carrying:

- `bsf-agent` **standalone binaries** compiled with `bun build --compile`
  for linux x64/arm64, macOS x64/arm64, and Windows x64 — no runtime
  needed on the target machine;
- the VS Code extension as an installable **`.vsix`**;
- the auto-generated source archives.

Version `0.1.0` is synchronized across every workspace package. The
website IDE releases continuously via the existing Pages deploy — it is
not versioned per release beyond the commit that built it.

## Why (least surprise)

CLI users expect a Releases page with a binary per platform (gh, bun,
ripgrep all work this way); agents can fetch the latest release by URL. A
dispatchable workflow (rather than tag-push-triggered) matches how this
repo is operated — pushes come through a proxy that only permits the
default branch, and a releases page built by CI is auditable either way.

## We could, but should we?

- npm publish: not yet — GitHub install is the documented path and needs
  no tokens. Revisit when there are external consumers.
- VS Code Marketplace: needs a publisher account/token; the `.vsix` on the
  release installs with one click (`Install from VSIX…`). Defer.
