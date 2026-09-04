# BPMN Runner (BSF)

Open `.bpmn` files as a live diagram you can **run**, powered by
[bpmn-svelte-flow](https://github.com/JonathanTurnock/bpmn-svelte-flow) and the
BSF browser engine.

## Features

- `.bpmn` files open as a rendered BPMN 2.0 diagram (full-spec notation).
- Presentation playback: play/pause, step a beat at a time, scrub the
  timeline, change speed — parallel tokens move in lockstep.
- Scenario picker: run the document's `bsf:scenario` payloads.
- Beat-grouped step list with per-step state diffs (added / changed / removed).
- Embedded `bsf:test` results shown as a pass/fail count in the header.
- The diagram is read-only; **Open as XML** switches to the text editor, and
  the diagram re-renders live as you edit (see ADR-0005).

## Install

From a packaged VSIX:

```sh
code --install-extension bsf-vscode-0.1.0.vsix
```

Or build it from the repo root:

```sh
bun install
bun run build-vscode
bun run --cwd packages/vscode-ext package:vsix
```

## Usage

Open any `.bpmn` file — it opens in the runner by default. Use
**BPMN: Open as XML** to edit the source, and **BPMN: Open with BPMN Runner**
to come back. `←` / `→` step through the run while presenting.
