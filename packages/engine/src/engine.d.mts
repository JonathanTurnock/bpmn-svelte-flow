/** Hand-written types for the JS engine (engine.mjs). Moddle objects are `any`. */

export interface EngineLogEntry {
  step: number;
  id?: string;
  name: string;
  type?: string;
  action: string;
  detail?: string;
  /** Snapshot of the payload after this step, present when the step changed it. */
  payload?: Record<string, unknown>;
}

export interface EngineResult {
  endId: string;
  name: string;
  payload: Record<string, unknown>;
}

export interface EngineState {
  visited: Set<string>;
  traversedEdges: Set<string>;
  /** Every edge traversal in order, repeats included. */
  edgeTrail: string[];
  log: EngineLogEntry[];
  results: EngineResult[];
  errors: string[];
  finished: boolean;
  steps: number;
}

export interface EngineToken {
  id: string;
  at: any;
  payload: Record<string, unknown>;
  status: string;
}

export interface Scenario {
  name: string;
  description: string;
  payload: Record<string, unknown>;
}

export interface EmbeddedTest {
  name: string;
  payload: Record<string, unknown>;
  body: string;
}

export interface TestResult {
  name: string;
  ok: boolean;
  error?: string;
}

export interface Issue {
  severity: 'warning' | 'info';
  elementId: string;
  message: string;
}

export class BsfEngine {
  constructor(definitions: any, processBo?: any, options?: { maxSteps?: number });
  state: EngineState;
  started: boolean;
  reset(): void;
  start(payload?: Record<string, unknown>): EngineState;
  step(): boolean;
  /** Advances every queued token one hop — parallel branches move in lockstep. */
  stepRound(): boolean;
  runToEnd(payload?: Record<string, unknown>): EngineState;
  liveTokens(): EngineToken[];
  publicState(): Pick<EngineState, 'visited' | 'traversedEdges' | 'log' | 'results' | 'finished'>;
}

export function processesOf(definitions: any): any[];
export function extensions(element: any, name: string): any[];
export function extensionBody(element: any, name: string): string | undefined;
export function collectScenarios(definitions: any, processBo: any): Scenario[];
export function collectTests(definitions: any, processBo: any): EmbeddedTest[];
export function runTests(definitions: any, processBo?: any, tests?: EmbeddedTest[]): TestResult[];
export function validate(definitions: any): Issue[];
