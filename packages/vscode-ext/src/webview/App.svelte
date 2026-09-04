<script lang="ts">
  import { Background, BackgroundVariant, Controls, SvelteFlow } from '@xyflow/svelte';
  import { bpmnNodeTypes, bpmnEdgeTypes } from '$bsf/components/registry.js';
  import type { BpmnFlowEdge, BpmnFlowNode } from '$bsf/types.js';
  import { runner } from './playback.svelte.js';
  import StateDiff from './StateDiff.svelte';

  let { onOpenAsXml = () => {} }: { onOpenAsXml?: () => void } = $props();

  const FIXED = new Set(['bpmn:Participant', 'bpmn:Lane']);
  const SPEEDS = [0.5, 1, 1.5, 2];

  let nodes = $state.raw<BpmnFlowNode[]>([]);
  let edges = $state.raw<BpmnFlowEdge[]>([]);
  let scenarioName = $state('');
  let speedStr = $state('1');
  /** Index of the step whose state shows in the detail pane. */
  let focused = $state<number | null>(null);
  let traceEl = $state<HTMLElement | undefined>(undefined);

  // Rebuild the flow graph whenever the model, the run, or selection change.
  $effect(() => {
    void runner.modelVersion;
    void runner.runVersion;
    const selected = runner.selectedId;
    const graph = runner.graph;
    if (!graph) {
      nodes = [];
      edges = [];
      return;
    }
    // During playback the current frame is the source of truth; otherwise the
    // live engine state is.
    const frame = runner.frames.length ? runner.frames[runner.frameIndex] : null;
    const engine = runner.engine;
    const visited: Set<string> = frame?.visited ?? engine?.state.visited ?? new Set<string>();
    const traversed: Set<string> =
      frame?.traversed ?? engine?.state.traversedEdges ?? new Set<string>();
    const active = new Set<string>(
      frame?.active ?? (engine?.liveTokens() ?? []).map((t: any) => t.at.id)
    );
    nodes = graph.nodes.map((n) => ({
      ...n,
      draggable: !FIXED.has(n.data.element),
      class: [
        visited.has(n.id) ? 'bsf-visited' : '',
        active.has(n.id) ? 'bsf-active' : '',
        selected === n.id ? 'bsf-selected' : ''
      ]
        .filter(Boolean)
        .join(' ')
    }));
    const tokens = runner.tokenEdges;
    // Token travel time tracks the playback pace (900ms per beat at 1x).
    const tokenDur = Math.min(1.2, Math.max(0.2, 0.5 / runner.speed));
    edges = graph.edges.map((e) => ({
      ...e,
      class: traversed.has(e.id) ? 'bsf-traversed' : '',
      data: { ...e.data!, token: tokens[e.id], tokenDur }
    }));
  });

  const scenarios = $derived.by(() => {
    void runner.modelVersion;
    return runner.graph ? runner.scenarios() : [];
  });

  const testResults = $derived.by(() => {
    void runner.modelVersion;
    if (!runner.graph || !runner.tests().length) return [];
    try {
      return runner.runAllTests();
    } catch {
      return [];
    }
  });

  const run = $derived.by(() => {
    void runner.runVersion;
    return runner.runState();
  });

  const lastFrame = $derived(Math.max(0, runner.frames.length - 1));
  const atEnd = $derived(runner.frames.length > 0 && runner.frameIndex >= lastFrame);
  /** Mid-timeline: the outcome is not revealed yet. */
  const presenting = $derived(runner.frames.length > 0 && !atEnd);

  $effect(() => {
    if (scenarios.length && !scenarios.some((s) => s.name === scenarioName)) {
      scenarioName = scenarios[0].name;
    }
  });

  // A new run resets the detail pane, and playback keeps newest steps in view.
  $effect(() => {
    void runner.runVersion;
    focused = null;
    if (traceEl && runner.frames.length) traceEl.scrollTo({ top: traceEl.scrollHeight });
  });

  interface TraceStep {
    index: number;
    id?: string;
    name: string;
    action: string;
    caption: string;
    before: Record<string, unknown> | null;
    after: Record<string, unknown>;
    added: number;
    changed: number;
    removed: number;
  }

  const str = (v: unknown) => JSON.stringify(v) ?? 'undefined';

  /**
   * The run as readable steps: bare "completed" echoes fold away, and every
   * step carries the full payload state at that point — plus, for
   * data-changing steps, the state before it, for the diff pane.
   */
  const steps = $derived.by(() => {
    if (!run) return [] as TraceStep[];
    let previous: Record<string, unknown> = {};
    const out: TraceStep[] = [];
    for (let index = 0; index < run.trace.length; index++) {
      const entry = run.trace[index];
      const last = out[out.length - 1];
      if (
        (entry.action === 'completed' || entry.action === 'passed') &&
        !entry.payload &&
        last &&
        last.id === entry.id
      ) {
        continue;
      }
      let added = 0;
      let changed = 0;
      let removed = 0;
      let before: Record<string, unknown> | null = null;
      let after = previous;
      if (entry.payload) {
        const current = entry.payload;
        for (const key of Object.keys(current)) {
          if (!(key in previous)) added += 1;
          else if (str(previous[key]) !== str(current[key])) changed += 1;
        }
        for (const key of Object.keys(previous)) {
          if (!(key in current)) removed += 1;
        }
        before = added + changed + removed > 0 ? previous : null;
        after = current;
        previous = current;
      }
      out.push({
        index,
        id: entry.id,
        name: entry.name || entry.id || '—',
        action: entry.action,
        caption: entry.detail ? `${entry.action} — ${entry.detail}` : entry.action,
        before,
        after,
        added,
        changed,
        removed
      });
    }
    return out;
  });

  /** Steps grouped by playback beat (flat when there is no timeline). */
  const groups = $derived.by(() => {
    const limit = runner.frames.length
      ? (runner.frames[runner.frameIndex]?.logIndex ?? Infinity)
      : Infinity;
    const visible = steps.filter((s) => s.index < limit);
    if (!runner.frames.length) return [{ beat: null as number | null, steps: visible }];
    const out: Array<{ beat: number | null; steps: TraceStep[] }> = [];
    for (let beat = 0; beat <= runner.frameIndex && beat < runner.frames.length; beat++) {
      const from = beat === 0 ? 0 : runner.frames[beat - 1].logIndex;
      const inBeat = visible.filter(
        (s) => s.index >= from && s.index < runner.frames[beat].logIndex
      );
      if (inBeat.length) out.push({ beat, steps: inBeat });
    }
    return out;
  });

  const focusedStep = $derived.by(() => {
    if (focused === null) return undefined;
    for (const group of groups) {
      const hit = group.steps.find((s) => s.index === focused);
      if (hit) return hit;
    }
    return undefined;
  });

  const opts = () => (scenarioName ? { scenario: scenarioName } : {});

  function onPlayPause() {
    if (runner.playing) runner.pause();
    else if (!runner.frames.length || scenarioName !== runner.runScenarioName)
      runner.playRun(opts());
    else runner.resume();
  }

  /** Move one beat; builds the timeline (paused at the start) on first use. */
  function stepBy(delta: number) {
    if (!runner.frames.length) {
      runner.buildTimeline(opts());
      runner.gotoFrame(0, false);
      return;
    }
    runner.pause();
    runner.gotoFrame(runner.frameIndex + delta, delta === 1);
  }

  function onKey(e: KeyboardEvent) {
    const target = e.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable], .cm-editor')) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      stepBy(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      stepBy(-1);
    }
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="shell">
  <header class="bar">
    <span class="doc" data-testid="doc-name">{runner.docName}</span>

    <select
      class="ctl"
      bind:value={scenarioName}
      aria-label="Scenario"
      data-testid="scenario-select"
    >
      {#each scenarios as s (s.name)}
        <option value={s.name}>{s.name}</option>
      {:else}
        <option value="">no scenarios in this file</option>
      {/each}
    </select>

    <button class="ctl" onclick={onPlayPause} data-testid="run-button">
      {runner.playing ? 'Pause' : runner.frames.length ? 'Play' : 'Run'}
    </button>
    <button
      class="ctl"
      onclick={() => stepBy(-1)}
      disabled={!runner.frames.length || runner.frameIndex === 0}
      title="Back one beat"
      data-testid="step-back">‹</button
    >
    <button class="ctl" onclick={() => stepBy(1)} disabled={atEnd} title="Forward one beat" data-testid="step-forward">›</button>
    <button class="ctl" onclick={() => runner.finishRun()} title="Jump to the end" data-testid="finish">»</button>
    <button class="ctl" onclick={() => runner.resetRun()} title="Reset the run" data-testid="reset">⟲</button>

    <input
      type="range"
      class="slider"
      min="0"
      max={lastFrame}
      step="1"
      value={runner.frameIndex}
      disabled={!runner.frames.length}
      oninput={(e) => {
        runner.pause();
        runner.gotoFrame(Number(e.currentTarget.value));
      }}
      aria-label="Playback position"
      data-testid="run-slider"
    />
    <span class="muted num">{runner.frameIndex}/{lastFrame}</span>

    <select
      class="ctl"
      bind:value={speedStr}
      onchange={() => runner.setSpeed(parseFloat(speedStr))}
      aria-label="Playback speed"
      data-testid="speed-select"
    >
      {#each SPEEDS as s (s)}
        <option value={String(s)}>{s}×</option>
      {/each}
    </select>

    {#if run}
      <span class="badge" data-testid="run-status">
        {#if presenting}{runner.playing ? 'playing' : 'paused'}
        {:else if run.finished}{run.errors.length ? 'failed' : 'completed'}
        {:else}running{/if}
      </span>
      <span class="muted">{run.steps} steps</span>
    {/if}

    {#if testResults.length}
      <span
        class="badge"
        class:bad={testResults.some((t) => !t.ok)}
        data-testid="test-results"
        title={testResults.map((t) => `${t.ok ? 'PASS' : 'FAIL'} ${t.name}`).join('\n')}
      >
        tests {testResults.filter((t) => t.ok).length}/{testResults.length}
      </span>
    {/if}

    <button class="ctl push" onclick={onOpenAsXml} data-testid="open-xml">Open as XML</button>
  </header>

  <div class="canvas" data-testid="canvas">
    {#if runner.error}
      <p class="error">{runner.error}</p>
    {:else}
      {#key runner.docVersion}
        <SvelteFlow
          bind:nodes
          bind:edges
          nodeTypes={bpmnNodeTypes}
          edgeTypes={bpmnEdgeTypes}
          fitView
          fitViewOptions={{ padding: 0.12 }}
          minZoom={0.1}
          nodesDraggable={false}
          nodesConnectable={false}
          zoomOnDoubleClick={false}
          proOptions={{ hideAttribution: true }}
          onnodeclick={({ node }) => (runner.selectedId = node.id)}
          onedgeclick={({ edge }) => (runner.selectedId = edge.id)}
          onpaneclick={() => (runner.selectedId = null)}
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
          <Controls showLock={false} />
        </SvelteFlow>
      {/key}
    {/if}
  </div>

  <div class="strip">
    <div bind:this={traceEl} class="trace" data-testid="trace">
      {#each groups as group (group.beat ?? -1)}
        {#if group.beat !== null}
          <button
            type="button"
            class="beat"
            class:now={group.beat === runner.frameIndex}
            onclick={() => {
              runner.pause();
              runner.gotoFrame(group.beat!);
            }}
            title="Jump the playback to this beat">beat {group.beat}</button
          >
        {/if}
        {#each group.steps as s (s.index)}
          <button
            type="button"
            class="step"
            class:focused={focused === s.index}
            data-testid="trace-step"
            onclick={() => {
              runner.selectedId = s.id ?? null;
              focused = focused === s.index ? null : s.index;
            }}
          >
            <span class="step-text">
              <span class="step-name">{s.name}</span>
              <span class="step-caption">{s.caption}</span>
            </span>
            {#if s.added}<span class="chip add">+{s.added}</span>{/if}
            {#if s.changed}<span class="chip chg">~{s.changed}</span>{/if}
            {#if s.removed}<span class="chip del">−{s.removed}</span>{/if}
          </button>
        {/each}
      {/each}
      {#if !groups.some((g) => g.steps.length)}
        <p class="muted pad">Run or step the flow to trace it here.</p>
      {/if}
    </div>

    <div class="detail" data-testid="run-detail">
      {#if focusedStep}
        <div class="detail-head">
          <span class="step-name">{focusedStep.name}</span>
          <span class="muted">{focusedStep.caption}</span>
        </div>
        <StateDiff before={focusedStep.before} after={focusedStep.after} />
      {:else if run && !presenting && run.results.length}
        {#each run.results as r, i (i)}
          <div class="detail-head">
            <span class="step-name">{r.name || r.endId}</span>
            <span class="muted">end-event payload</span>
          </div>
          <StateDiff after={r.payload as Record<string, unknown>} />
        {/each}
      {:else}
        <p class="muted pad">Click a step to see the state before and after it.</p>
      {/if}
    </div>
  </div>
</div>

<style>
  .shell {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    color: var(--vscode-foreground, #222);
    background: var(--vscode-editor-background, #fff);
  }

  .bar {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    padding: 5px 8px;
    border-bottom: 1px solid var(--vscode-panel-border, #ddd);
  }
  .doc {
    font-weight: 600;
    margin-right: 4px;
  }
  .push {
    margin-left: auto;
  }

  .ctl {
    font: inherit;
    font-size: 12px;
    color: var(--vscode-foreground, #222);
    background: var(--vscode-editor-background, #fff);
    border: 1px solid var(--vscode-panel-border, #ccc);
    border-radius: 3px;
    padding: 2px 7px;
    cursor: pointer;
  }
  button.ctl:hover:not(:disabled) {
    background: var(--vscode-button-background, #e6e6e6);
  }
  .ctl:disabled {
    opacity: 0.45;
    cursor: default;
  }

  .slider {
    flex: 1 1 90px;
    min-width: 80px;
    max-width: 260px;
  }

  .muted {
    font-size: 11px;
    opacity: 0.7;
  }
  .num {
    font-family: var(--vscode-editor-font-family, ui-monospace, monospace);
  }
  .pad {
    padding: 8px 10px;
  }

  .badge {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 1px 6px;
    border-radius: 8px;
    border: 1px solid var(--vscode-panel-border, #ccc);
  }
  .badge.bad {
    color: #b91c1c;
    border-color: #b91c1c;
  }

  .canvas {
    flex: 1 1 auto;
    min-height: 0;
    position: relative;
  }
  .error {
    padding: 10px;
    color: #b91c1c;
    font-family: var(--vscode-editor-font-family, ui-monospace, monospace);
    font-size: 12px;
  }

  .strip {
    display: flex;
    height: 200px;
    min-height: 200px;
    border-top: 1px solid var(--vscode-panel-border, #ddd);
  }
  .trace {
    flex: 1 1 auto;
    min-width: 0;
    overflow-y: auto;
    border-right: 1px solid var(--vscode-panel-border, #ddd);
  }
  .detail {
    width: 380px;
    flex: 0 0 380px;
    overflow-y: auto;
    padding: 8px;
  }
  .detail-head {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-bottom: 4px;
  }

  .beat {
    display: block;
    width: 100%;
    text-align: left;
    background: none;
    border: 0;
    border-top: 1px solid var(--vscode-panel-border, #eee);
    padding: 5px 10px 2px;
    font: inherit;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.6;
    cursor: pointer;
    color: inherit;
  }
  .beat.now {
    opacity: 1;
    font-weight: 700;
  }

  .step {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    text-align: left;
    background: none;
    border: 0;
    padding: 3px 10px;
    font: inherit;
    color: inherit;
    cursor: pointer;
  }
  .step:hover,
  .step.focused {
    background: var(--vscode-list-hoverBackground, rgba(127, 127, 127, 0.15));
  }
  .step-text {
    min-width: 0;
    flex: 1;
  }
  .step-name {
    display: block;
    font-size: 12px;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
  }
  .step-caption {
    display: block;
    font-size: 10.5px;
    line-height: 1.25;
    opacity: 0.7;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .chip {
    font-size: 10px;
    font-weight: 700;
  }
  .chip.add {
    color: #15803d;
  }
  .chip.chg {
    color: #b45309;
  }
  .chip.del {
    color: #b91c1c;
  }
</style>
