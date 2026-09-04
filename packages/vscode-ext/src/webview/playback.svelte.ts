/**
 * The webview's document + playback store — the studio's playback controller
 * (studio/src/lib/studio.svelte.ts) reduced to what the runner needs: parse a
 * document, list its scenarios, build a run timeline of engine rounds, and
 * scrub/play it. No mutation: the text editor owns the model (ADR-0005).
 */
// @ts-expect-error - bpmn-moddle ships no bundled type declarations
import { BpmnModdle } from 'bpmn-moddle';
// @ts-expect-error - the engine is plain ESM with hand-written .d.mts
import bsfSchema from '@bsf/engine/moddle';
import {
  BsfEngine,
  collectScenarios,
  collectTests,
  processesOf,
  runTests
  // @ts-expect-error - the engine is plain ESM with hand-written .d.mts
} from '@bsf/engine';
import { bpmnToFlow } from '$bsf/parser/transform.js';
import type { BpmnFlowGraph } from '$bsf/types.js';

/** One beat of a run's playback timeline (the state after an engine round). */
export interface RunFrame {
  visited: Set<string>;
  traversed: Set<string>;
  active: string[];
  /** Edges crossed entering this frame: edge id -> unique replay seq. */
  crossed: Record<string, number>;
  /** Trace entries produced up to and including this frame. */
  logIndex: number;
}

export interface Scenario {
  name: string;
  description: string;
  payload: Record<string, unknown>;
}

export interface TestResult {
  name: string;
  ok: boolean;
  error?: string;
}

export interface RunState {
  scenario: string;
  finished: boolean;
  steps: number;
  results: Array<{ endId: string; name?: string; payload: unknown }>;
  errors: string[];
  trace: Array<{
    id?: string;
    name?: string;
    action: string;
    detail?: string;
    payload?: Record<string, unknown>;
  }>;
}

class RunnerStore {
  graph = $state.raw<BpmnFlowGraph | null>(null);
  docName = $state('untitled');
  error = $state('');
  selectedId = $state<string | null>(null);
  /** Bumped when a different document text is adopted — the canvas remounts. */
  docVersion = $state(0);
  modelVersion = $state(0);
  runVersion = $state(0);

  playing = $state(false);
  frames = $state.raw<RunFrame[]>([]);
  frameIndex = $state(0);
  /** Playback speed multiplier (1 = one round every 900ms). */
  speed = $state(1);
  /** Edges a token crossed entering the current frame: edge id -> replay seq. */
  tokenEdges: Record<string, number> = {};

  definitions: any = null;
  engine: any = null;
  runScenarioName = '';
  private playTimer: ReturnType<typeof setInterval> | null = null;
  private moddle = new BpmnModdle({ bsf: bsfSchema });

  get process(): any {
    if (!this.definitions) return null;
    const procs = processesOf(this.definitions);
    return procs.find((p: any) => p.isExecutable) || procs[0] || null;
  }

  /** Adopt document text. Resets any run, exactly as a model change does. */
  async load(text: string, name?: string): Promise<void> {
    try {
      const { rootElement } = await this.moddle.fromXML(text);
      this.definitions = rootElement;
      this.resetRun();
      this.graph = bpmnToFlow(this.definitions);
      this.error = '';
      if (name) this.docName = name;
      this.modelVersion += 1;
      this.docVersion += 1;
    } catch (err: any) {
      this.definitions = null;
      this.graph = null;
      this.error = err?.message ?? String(err);
      this.resetRun();
      this.docVersion += 1;
    }
  }

  scenarios(): Scenario[] {
    if (!this.definitions) return [];
    return collectScenarios(this.definitions, this.process);
  }

  tests() {
    if (!this.definitions) return [];
    return collectTests(this.definitions, this.process);
  }

  runAllTests(): TestResult[] {
    if (!this.definitions) return [];
    return runTests(this.definitions, this.process);
  }

  private scenarioPayload(name?: string): Record<string, unknown> {
    if (!name) return this.scenarios()[0]?.payload ?? {};
    const s = this.scenarios().find((sc) => sc.name === name);
    if (!s) throw new Error(`no scenario named "${name}"`);
    return s.payload;
  }

  startRun(opts: { scenario?: string; payload?: Record<string, unknown> } = {}) {
    this.pause();
    this.frames = [];
    this.frameIndex = 0;
    this.tokenEdges = {};
    const initial = opts.payload !== undefined ? opts.payload : this.scenarioPayload(opts.scenario);
    this.engine = new BsfEngine(this.definitions, this.process);
    this.engine.start(JSON.parse(JSON.stringify(initial)));
    this.runScenarioName = opts.scenario || this.scenarios()[0]?.name || 'ad-hoc';
    this.runVersion += 1;
    return this.engine.state;
  }

  /**
   * Presentation playback: executes the whole run up-front in engine rounds
   * (parallel tokens move in lockstep) and captures a frame per round, then
   * plays the timeline. Frames can be scrubbed in both directions, paced by
   * `speed`, and stepped one beat at a time.
   */
  playRun(opts: { scenario?: string; payload?: Record<string, unknown> } = {}) {
    this.buildTimeline(opts);
    this.gotoFrame(0, false);
    this.resume();
    return this.engine.state;
  }

  buildTimeline(opts: { scenario?: string; payload?: Record<string, unknown> } = {}) {
    this.startRun(opts);
    const engine = this.engine;
    let seq = 0;
    const capture = (crossed: Record<string, number>): RunFrame => ({
      visited: new Set<string>(engine.state.visited),
      traversed: new Set<string>(engine.state.traversedEdges),
      active: engine.liveTokens().map((t: any) => t.at.id as string),
      crossed,
      logIndex: engine.state.log.length
    });
    const frames: RunFrame[] = [capture({})];
    while (!engine.state.finished && frames.length < 5000) {
      const beforeLength = engine.state.edgeTrail.length;
      engine.stepRound();
      const crossed: Record<string, number> = {};
      for (const id of engine.state.edgeTrail.slice(beforeLength)) crossed[id as string] = ++seq;
      frames.push(capture(crossed));
    }
    this.frames = frames;
    this.frameIndex = 0;
    this.runVersion += 1;
  }

  /** Jumps the playback to a frame; `animate` sends token dots along the
   *  edges crossed entering that frame (used when advancing one beat). */
  gotoFrame(index: number, animate = false) {
    if (!this.frames.length) return;
    const clamped = Math.max(0, Math.min(index, this.frames.length - 1));
    const oneForward = clamped === this.frameIndex + 1;
    this.frameIndex = clamped;
    this.tokenEdges = animate && oneForward ? this.frames[clamped].crossed : {};
    if (this.playing && clamped === this.frames.length - 1) this.pause();
    this.runVersion += 1;
  }

  /** Starts (or restarts) the playback timer at the current speed. */
  resume() {
    this.pause();
    if (!this.frames.length) return;
    if (this.frameIndex >= this.frames.length - 1) this.gotoFrame(0, false);
    this.playing = true;
    this.playTimer = setInterval(
      () => this.gotoFrame(this.frameIndex + 1, true),
      Math.round(900 / this.speed)
    );
  }

  pause() {
    if (this.playTimer) clearInterval(this.playTimer);
    this.playTimer = null;
    this.playing = false;
  }

  setSpeed(speed: number) {
    this.speed = speed;
    if (this.playing) this.resume();
  }

  /** Jump the playback straight to the final state. */
  finishRun() {
    if (this.frames.length) {
      this.pause();
      this.gotoFrame(this.frames.length - 1, false);
    } else if (this.engine && !this.engine.state.finished) {
      this.engine.runToEnd();
      this.runVersion += 1;
    }
    return this.engine?.state ?? null;
  }

  resetRun() {
    this.pause();
    this.frames = [];
    this.frameIndex = 0;
    this.tokenEdges = {};
    this.engine = null;
    this.runScenarioName = '';
    this.runVersion += 1;
  }

  runState(): RunState | null {
    if (!this.engine) return null;
    const s = this.engine.state;
    return {
      scenario: this.runScenarioName,
      finished: s.finished,
      steps: s.steps,
      results: s.results,
      errors: s.errors,
      trace: s.log
    };
  }
}

export const runner = new RunnerStore();
