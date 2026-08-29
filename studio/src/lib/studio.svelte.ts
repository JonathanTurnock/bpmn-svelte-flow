/**
 * The studio document store. One moddle definitions tree is the source of
 * truth; every mutation edits the tree (semantic + DI together), then
 * re-derives the Svelte Flow graph via the repo's own renderer transform,
 * re-validates, autosaves, and records an undo snapshot. The UI panels and
 * the WebMCP tools drive the same store, so agent and human share one model
 * and one undo stack.
 */
// @ts-expect-error - bpmn-moddle ships no bundled type declarations
import { BpmnModdle } from 'bpmn-moddle';
import { bpmnToFlow } from '$bsf/parser/transform.js';
import type { BpmnFlowGraph } from '$bsf/types.js';
import bsfSchema from './engine/bsf-moddle.js';
import {
  BsfEngine,
  collectScenarios,
  collectTests,
  runTests,
  validate,
  extensions,
  extensionBody,
  processesOf,
  type EngineState,
  type Issue,
  type Scenario,
  type TestResult
} from './engine/engine.mjs';
import { makeId } from './utils.js';

const WORKSPACE_KEY = 'bsf.workspace.v1';
const AUTOSAVE_KEY = 'bsf.autosave.v1';

const EVENT_DEFINITIONS: Record<string, string> = {
  message: 'bpmn:MessageEventDefinition',
  timer: 'bpmn:TimerEventDefinition',
  error: 'bpmn:ErrorEventDefinition',
  signal: 'bpmn:SignalEventDefinition',
  escalation: 'bpmn:EscalationEventDefinition',
  terminate: 'bpmn:TerminateEventDefinition',
  conditional: 'bpmn:ConditionalEventDefinition',
  compensation: 'bpmn:CompensateEventDefinition'
};

/** Default DI sizes per element family. */
function sizeOf(type: string): { width: number; height: number } {
  if (/Event$/.test(type)) return { width: 36, height: 36 };
  if (/Gateway$/.test(type)) return { width: 50, height: 50 };
  if (type === 'bpmn:SubProcess' || type === 'bpmn:Transaction') return { width: 350, height: 200 };
  if (type === 'bpmn:TextAnnotation') return { width: 120, height: 40 };
  if (type === 'bpmn:DataObjectReference') return { width: 36, height: 50 };
  if (type === 'bpmn:DataStoreReference') return { width: 50, height: 50 };
  return { width: 100, height: 80 };
}

function localName(type: string): string {
  const i = (type || '').indexOf(':');
  return i >= 0 ? type.slice(i + 1) : type || '';
}

function normaliseType(type: string): string {
  if (type.includes(':')) return type;
  return 'bpmn:' + type.charAt(0).toUpperCase() + type.slice(1);
}

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function centre(b: Bounds) {
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

function borderPoint(b: Bounds, toward: { x: number; y: number }) {
  const c = centre(b);
  const dx = toward.x - c.x;
  const dy = toward.y - c.y;
  if (!dx && !dy) return c;
  const sx = dx ? b.width / 2 / Math.abs(dx) : Infinity;
  const sy = dy ? b.height / 2 / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy);
  return { x: Math.round(c.x + dx * s), y: Math.round(c.y + dy * s) };
}

export interface RunState {
  scenario: string;
  finished: boolean;
  steps: number;
  activeElements: string[];
  results: EngineState['results'];
  errors: string[];
  trace: EngineState['log'];
}

class StudioStore {
  // reactive surface
  graph = $state.raw<BpmnFlowGraph | null>(null);
  xml = $state('');
  issues = $state.raw<Issue[]>([]);
  docName = $state('untitled');
  selectedId = $state<string | null>(null);
  runVersion = $state(0);
  modelVersion = $state(0);
  canUndo = $state(false);
  canRedo = $state(false);
  workspaceVersion = $state(0);

  // non-reactive internals
  definitions: any = null;
  engine: BsfEngine | null = null;
  runScenarioName = '';
  private moddle = new BpmnModdle({ bsf: bsfSchema });
  private undoStack: string[] = [];
  private redoStack: string[] = [];

  // -- lifecycle ------------------------------------------------------------

  async boot() {
    const saved = this.restoreAutosave();
    if (saved?.xml) {
      await this.importXml(saved.xml, saved.name || 'untitled');
      return;
    }
    const res = await fetch(`${import.meta.env.BASE_URL}samples/messaging-flow.bpmn`);
    await this.importXml(await res.text(), 'messaging-flow');
  }

  /** Parse + adopt a document. Returns import warnings. */
  async importXml(xml: string, name?: string): Promise<string[]> {
    const { rootElement, warnings = [] } = await this.moddle.fromXML(xml);
    this.definitions = rootElement;
    this.undoStack = [];
    this.redoStack = [];
    this.resetRun();
    if (name) this.docName = name;
    await this.refresh();
    return warnings.map((w: any) => w?.message ?? String(w));
  }

  /** Replace the model from edited XML, keeping the undo history. */
  async applyXml(xml: string): Promise<string[]> {
    const before = this.xml;
    const { rootElement, warnings = [] } = await this.moddle.fromXML(xml);
    this.definitions = rootElement;
    this.undoStack.push(before);
    this.redoStack = [];
    this.resetRun();
    await this.refresh();
    return warnings.map((w: any) => w?.message ?? String(w));
  }

  async newDocument(name = 'untitled') {
    const id = 'P_' + Math.random().toString(36).slice(2, 8);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
    xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
    xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
    xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
    xmlns:bsf="http://bpmn-svelte-flow/schema/1.0"
    id="Defs_${id}" targetNamespace="http://bpmn-svelte-flow/poc"
    expressionLanguage="text/javascript">
  <bpmn:process id="${id}" isExecutable="true">
    <bpmn:startEvent id="Start_1" name="Start"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_1">
    <bpmndi:BPMNPlane id="Plane_1" bpmnElement="${id}">
      <bpmndi:BPMNShape id="Start_1_di" bpmnElement="Start_1">
        <dc:Bounds x="180" y="180" width="36" height="36"/>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
    await this.importXml(xml, name);
    return id;
  }

  /** Re-derive everything from the (mutated) moddle tree. */
  private async refresh() {
    const { xml } = await this.moddle.toXML(this.definitions, { format: true });
    this.xml = xml;
    this.graph = bpmnToFlow(this.definitions);
    this.issues = validate(this.definitions);
    this.modelVersion += 1;
    this.canUndo = this.undoStack.length > 0;
    this.canRedo = this.redoStack.length > 0;
    this.autosave();
  }

  /** Wrap a mutation of the moddle tree: undo snapshot + refresh. */
  async mutate<T>(fn: () => T): Promise<T> {
    const before = this.xml;
    const result = fn();
    this.undoStack.push(before);
    if (this.undoStack.length > 100) this.undoStack.shift();
    this.redoStack = [];
    await this.refresh();
    return result;
  }

  async undo() {
    const xml = this.undoStack.pop();
    if (!xml) return;
    this.redoStack.push(this.xml);
    const { rootElement } = await this.moddle.fromXML(xml);
    this.definitions = rootElement;
    this.resetRun();
    await this.refresh();
  }

  async redo() {
    const xml = this.redoStack.pop();
    if (!xml) return;
    this.undoStack.push(this.xml);
    const { rootElement } = await this.moddle.fromXML(xml);
    this.definitions = rootElement;
    this.resetRun();
    await this.refresh();
  }

  // -- workspace (localStorage) ---------------------------------------------

  private workspace(): { docs: Record<string, { xml: string; savedAt: string }> } {
    try {
      return JSON.parse(localStorage.getItem(WORKSPACE_KEY) || '') || { docs: {} };
    } catch {
      return { docs: {} };
    }
  }

  private writeWorkspace(ws: ReturnType<StudioStore['workspace']>) {
    try {
      localStorage.setItem(WORKSPACE_KEY, JSON.stringify(ws));
    } catch {
      /* storage unavailable */
    }
    this.workspaceVersion += 1;
  }

  listDocuments() {
    const ws = this.workspace();
    return Object.keys(ws.docs)
      .sort()
      .map((name) => ({
        name,
        savedAt: ws.docs[name].savedAt,
        current: name === this.docName
      }));
  }

  saveDocument(name?: string): string {
    const docName = name || this.docName || 'untitled';
    const ws = this.workspace();
    ws.docs[docName] = { xml: this.xml, savedAt: new Date().toISOString() };
    this.writeWorkspace(ws);
    this.docName = docName;
    return docName;
  }

  async openDocument(name: string) {
    const doc = this.workspace().docs[name];
    if (!doc) throw new Error(`no saved document named "${name}"`);
    return this.importXml(doc.xml, name);
  }

  deleteDocument(name: string) {
    const ws = this.workspace();
    if (!ws.docs[name]) throw new Error(`no saved document named "${name}"`);
    delete ws.docs[name];
    this.writeWorkspace(ws);
  }

  private autosave() {
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ xml: this.xml, name: this.docName }));
    } catch {
      /* storage unavailable */
    }
  }

  private restoreAutosave(): { xml: string; name: string } | null {
    try {
      return JSON.parse(localStorage.getItem(AUTOSAVE_KEY) || '');
    } catch {
      return null;
    }
  }

  // -- semantic lookups ------------------------------------------------------

  get process(): any {
    const procs = processesOf(this.definitions);
    return procs.find((p: any) => p.isExecutable) || procs[0] || null;
  }

  get collaboration(): any {
    return (this.definitions?.rootElements || []).find(
      (r: any) => r.$type === 'bpmn:Collaboration'
    );
  }

  private allBos(): any[] {
    const out: any[] = [];
    const walkContainer = (container: any) => {
      for (const el of container.flowElements || []) {
        out.push(el);
        if (el.flowElements) walkContainer(el);
      }
      for (const a of container.artifacts || []) out.push(a);
      for (const ls of container.laneSets || []) for (const l of ls.lanes || []) out.push(l);
    };
    for (const root of this.definitions?.rootElements || []) {
      out.push(root);
      if (root.$type === 'bpmn:Process') walkContainer(root);
      if (root.$type === 'bpmn:Collaboration') {
        for (const p of root.participants || []) out.push(p);
        for (const mf of root.messageFlows || []) out.push(mf);
      }
    }
    return out;
  }

  findBo(id: string): any {
    const bo = this.allBos().find((el) => el.id === id);
    if (!bo) throw new Error(`no element with id "${id}"`);
    return bo;
  }

  private takenId(id: string): boolean {
    return this.allBos().some((el) => el.id === id);
  }

  newId(prefix: string): string {
    return makeId(prefix, (id) => this.takenId(id));
  }

  /** The container (process or sub-process) whose flowElements hold this element. */
  private containerOf(bo: any): any {
    let p = bo.$parent;
    while (p && !p.flowElements) p = p.$parent;
    return p || this.process;
  }

  private processOf(bo: any): any {
    let p = bo;
    while (p && p.$type !== 'bpmn:Process') p = p.$parent;
    return p;
  }

  // -- DI helpers ------------------------------------------------------------

  get plane(): any {
    return this.definitions?.diagrams?.[0]?.plane;
  }

  diShape(id: string): any {
    return (this.plane?.planeElement || []).find(
      (pe: any) => pe.$type === 'bpmndi:BPMNShape' && pe.bpmnElement?.id === id
    );
  }

  diEdge(id: string): any {
    return (this.plane?.planeElement || []).find(
      (pe: any) => pe.$type === 'bpmndi:BPMNEdge' && pe.bpmnElement?.id === id
    );
  }

  private addDiShape(bo: any, bounds: Bounds, extra: Record<string, unknown> = {}) {
    const shape = this.moddle.create('bpmndi:BPMNShape', {
      id: `${bo.id}_di`,
      bpmnElement: bo,
      bounds: this.moddle.create('dc:Bounds', bounds),
      ...extra
    });
    shape.bounds.$parent = shape;
    shape.$parent = this.plane;
    this.plane.get('planeElement').push(shape);
    return shape;
  }

  private addDiEdge(bo: any, waypoints: Array<{ x: number; y: number }>) {
    const edge = this.moddle.create('bpmndi:BPMNEdge', {
      id: `${bo.id}_di`,
      bpmnElement: bo,
      waypoint: waypoints.map((p) => this.moddle.create('dc:Point', p))
    });
    for (const w of edge.waypoint) w.$parent = edge;
    edge.$parent = this.plane;
    this.plane.get('planeElement').push(edge);
    return edge;
  }

  private removeDi(id: string) {
    const plane = this.plane;
    if (!plane) return;
    const list = plane.get('planeElement');
    for (let i = list.length - 1; i >= 0; i -= 1) {
      if (list[i].bpmnElement?.id === id) list.splice(i, 1);
    }
  }

  private overlapsExisting(b: Bounds): boolean {
    for (const pe of this.plane?.planeElement || []) {
      if (pe.$type !== 'bpmndi:BPMNShape' || !pe.bounds) continue;
      if (['bpmn:Participant', 'bpmn:Lane'].includes(pe.bpmnElement?.$type)) continue;
      const o = pe.bounds;
      if (b.x < o.x + o.width + 20 && o.x < b.x + b.width + 20 && b.y < o.y + o.height + 20 && o.y < b.y + b.height + 20) {
        return true;
      }
    }
    return false;
  }

  private boundsOf(id: string): Bounds {
    const shape = this.diShape(id);
    if (!shape) throw new Error(`no DI shape for "${id}"`);
    const b = shape.bounds;
    return { x: b.x, y: b.y, width: b.width, height: b.height };
  }

  /** Straight border-to-border waypoints between two shapes. */
  private routeBetween(sourceId: string, targetId: string) {
    const s = this.boundsOf(sourceId);
    const t = this.boundsOf(targetId);
    return [borderPoint(s, centre(t)), borderPoint(t, centre(s))];
  }

  private reroute(flowBo: any) {
    const di = this.diEdge(flowBo.id);
    if (!di) return;
    const src = flowBo.sourceRef?.id;
    const tgt = flowBo.targetRef?.id;
    if (!src || !tgt || !this.diShape(src) || !this.diShape(tgt)) return;
    const points = this.routeBetween(src, tgt);
    di.waypoint = points.map((p: any) => {
      const pt = this.moddle.create('dc:Point', p);
      pt.$parent = di;
      return pt;
    });
  }

  /** Re-route every flow touching this element id. */
  private rerouteAround(id: string) {
    for (const pe of this.plane?.planeElement || []) {
      if (pe.$type !== 'bpmndi:BPMNEdge') continue;
      const bo = pe.bpmnElement;
      if (bo?.sourceRef?.id === id || bo?.targetRef?.id === id) this.reroute(bo);
    }
  }

  // -- structural mutations --------------------------------------------------

  addElement(args: {
    type: string;
    name?: string;
    afterElementId?: string;
    attachToId?: string;
    eventDefinition?: string;
    x?: number;
    y?: number;
  }) {
    const type = normaliseType(args.type);
    const size = sizeOf(type);
    const id = this.newId(localName(type));
    const props: Record<string, unknown> = { id };
    if (args.name) props.name = args.name;

    let container = this.process;
    if (!container) throw new Error('no process in the document');

    let bounds: Bounds;
    let after: any = null;
    if (args.attachToId) {
      if (type !== 'bpmn:BoundaryEvent') throw new Error('attachToId is for boundaryEvent');
      const host = this.findBo(args.attachToId);
      props.attachedToRef = host;
      container = this.containerOf(host);
      const hb = this.boundsOf(host.id);
      bounds = {
        x: hb.x + hb.width / 2 - size.width / 2,
        y: hb.y + hb.height - size.height / 2,
        width: size.width,
        height: size.height
      };
    } else if (args.afterElementId) {
      after = this.findBo(args.afterElementId);
      container = this.containerOf(after);
      const ab = this.boundsOf(after.id);
      bounds = {
        x: ab.x + ab.width + 90,
        y: ab.y + ab.height / 2 - size.height / 2,
        width: size.width,
        height: size.height
      };
      // successive additions after the same element stack downward, not on top
      while (this.overlapsExisting(bounds)) bounds.y += 110;
    } else if (args.x !== undefined && args.y !== undefined) {
      bounds = {
        x: args.x - size.width / 2,
        y: args.y - size.height / 2,
        width: size.width,
        height: size.height
      };
    } else {
      let maxX = 140;
      let midY = 200;
      for (const pe of this.plane?.planeElement || []) {
        if (pe.$type !== 'bpmndi:BPMNShape' || !pe.bounds) continue;
        if (['bpmn:Participant', 'bpmn:Lane'].includes(pe.bpmnElement?.$type)) continue;
        if (pe.bounds.x + pe.bounds.width > maxX) {
          maxX = pe.bounds.x + pe.bounds.width;
          midY = pe.bounds.y + pe.bounds.height / 2;
        }
      }
      bounds = { x: maxX + 90, y: midY - size.height / 2, width: size.width, height: size.height };
    }

    const bo = this.moddle.create(type, props);
    bo.$parent = container;
    container.get('flowElements').push(bo);

    if (args.eventDefinition) {
      const edType = EVENT_DEFINITIONS[args.eventDefinition];
      if (!edType) throw new Error(`unknown eventDefinition "${args.eventDefinition}"`);
      const ed = this.moddle.create(edType, { id: this.newId('EvDef') });
      ed.$parent = bo;
      bo.eventDefinitions = [ed];
    }

    const extra: Record<string, unknown> = {};
    if (type === 'bpmn:SubProcess' || type === 'bpmn:Transaction') extra.isExpanded = true;
    this.addDiShape(bo, bounds, extra);

    let connectedVia: string | undefined;
    if (after) connectedVia = this.connectBos(after, bo).id;
    return { id, ...(connectedVia ? { connectedVia } : {}) };
  }

  private connectBos(source: any, target: any, label?: string): any {
    const sourceProcess = this.processOf(source);
    const targetProcess = this.processOf(target);
    const crossPool =
      source.$type === 'bpmn:Participant' ||
      target.$type === 'bpmn:Participant' ||
      (sourceProcess && targetProcess && sourceProcess !== targetProcess);

    let flow: any;
    if (crossPool) {
      const collab = this.collaboration;
      if (!collab) throw new Error('message flows need a collaboration (add a pool first)');
      flow = this.moddle.create('bpmn:MessageFlow', {
        id: this.newId('MessageFlow'),
        sourceRef: source,
        targetRef: target,
        ...(label ? { name: label } : {})
      });
      flow.$parent = collab;
      collab.get('messageFlows').push(flow);
    } else {
      const container = this.containerOf(source);
      flow = this.moddle.create('bpmn:SequenceFlow', {
        id: this.newId('Flow'),
        sourceRef: source,
        targetRef: target,
        ...(label ? { name: label } : {})
      });
      flow.$parent = container;
      container.get('flowElements').push(flow);
      source.get('outgoing').push(flow);
      target.get('incoming').push(flow);
    }
    this.addDiEdge(flow, this.routeBetween(source.id, target.id));
    return flow;
  }

  connect(args: { sourceId: string; targetId: string; label?: string }) {
    const source = this.findBo(args.sourceId);
    const target = this.findBo(args.targetId);
    const flow = this.connectBos(source, target, args.label);
    return { id: flow.id, type: localName(flow.$type) };
  }

  updateElement(args: { id: string; name?: string }) {
    const bo = this.findBo(args.id);
    if (args.name !== undefined) bo.name = args.name;
  }

  deleteElement(args: { id: string }) {
    const bo = this.findBo(args.id);
    if (bo.$type === 'bpmn:SequenceFlow' || bo.$type === 'bpmn:MessageFlow') {
      this.deleteFlow(bo);
      return;
    }
    // connected flows first
    for (const f of [...(bo.incoming || []), ...(bo.outgoing || [])]) this.deleteFlow(f);
    // boundary events attached to it
    const container = this.containerOf(bo);
    for (const el of [...(container.flowElements || [])]) {
      if (el.attachedToRef === bo) this.deleteElement({ id: el.id });
    }
    // sub-process: remove descendants' DI
    const removeDescendants = (c: any) => {
      for (const el of c.flowElements || []) {
        this.removeDi(el.id);
        if (el.flowElements) removeDescendants(el);
      }
    };
    if (bo.flowElements) removeDescendants(bo);
    // lane references
    for (const p of processesOf(this.definitions)) {
      for (const ls of p.laneSets || []) {
        for (const lane of ls.lanes || []) {
          const refs = lane.flowNodeRefs || [];
          const i = refs.indexOf(bo);
          if (i >= 0) refs.splice(i, 1);
        }
      }
    }
    const list = container.get('flowElements');
    const idx = list.indexOf(bo);
    if (idx >= 0) list.splice(idx, 1);
    this.removeDi(bo.id);
    if (this.selectedId === bo.id) this.selectedId = null;
  }

  private deleteFlow(flow: any) {
    const src = flow.sourceRef;
    const tgt = flow.targetRef;
    for (const [owner, key] of [
      [src, 'outgoing'],
      [tgt, 'incoming']
    ] as const) {
      const list = owner?.[key];
      const i = list ? list.indexOf(flow) : -1;
      if (i >= 0) list.splice(i, 1);
    }
    if (src?.default === flow) src.default = undefined;
    const parentList =
      flow.$type === 'bpmn:MessageFlow'
        ? flow.$parent?.get('messageFlows')
        : flow.$parent?.get('flowElements');
    const i = parentList ? parentList.indexOf(flow) : -1;
    if (i >= 0) parentList.splice(i, 1);
    this.removeDi(flow.id);
  }

  /** Drag support + agent moves: set a shape's absolute DI position. */
  moveShape(id: string, x: number, y: number) {
    const shape = this.diShape(id);
    if (!shape) throw new Error(`no DI shape for "${id}"`);
    const dx = x - shape.bounds.x;
    const dy = y - shape.bounds.y;
    if (!dx && !dy) return;
    const bo = shape.bpmnElement;
    const shift = (targetId: string) => {
      const s = this.diShape(targetId);
      if (s) {
        s.bounds.x += dx;
        s.bounds.y += dy;
      }
    };
    shape.bounds.x = x;
    shape.bounds.y = y;
    // containers carry their contents (and attached boundary events) with them
    const moveChildren = (container: any) => {
      for (const el of container.flowElements || []) {
        if (el.$type === 'bpmn:SequenceFlow') {
          const di = this.diEdge(el.id);
          if (di) for (const w of di.waypoint || []) (w.x += dx), (w.y += dy);
          continue;
        }
        shift(el.id);
        if (el.flowElements) moveChildren(el);
      }
    };
    if (bo.flowElements) moveChildren(bo);
    const container = this.containerOf(bo);
    for (const el of container?.flowElements || []) {
      if (el.attachedToRef === bo) shift(el.id);
    }
    this.rerouteAround(id);
  }

  // -- lanes -----------------------------------------------------------------

  addLane(args: { name?: string }) {
    const proc = this.process;
    if (!proc) throw new Error('no process in the document');
    let collab = this.collaboration;
    let participant = collab?.participants?.find((p: any) => p.processRef === proc);

    if (!participant) {
      // wrap the process in a pool sized to its content
      if (!collab) {
        collab = this.moddle.create('bpmn:Collaboration', { id: this.newId('Collab') });
        collab.$parent = this.definitions;
        this.definitions.get('rootElements').unshift(collab);
      }
      participant = this.moddle.create('bpmn:Participant', {
        id: this.newId('Participant'),
        name: this.docName,
        processRef: proc
      });
      participant.$parent = collab;
      collab.get('participants').push(participant);
      this.plane.bpmnElement = collab;
      const shapes = (this.plane.planeElement || []).filter(
        (pe: any) => pe.$type === 'bpmndi:BPMNShape' && pe.bounds
      );
      const minX = Math.min(...shapes.map((s: any) => s.bounds.x), 160);
      const minY = Math.min(...shapes.map((s: any) => s.bounds.y), 120);
      const maxX = Math.max(...shapes.map((s: any) => s.bounds.x + s.bounds.width), 560);
      const maxY = Math.max(...shapes.map((s: any) => s.bounds.y + s.bounds.height), 320);
      this.addDiShape(
        participant,
        {
          x: minX - 60,
          y: minY - 40,
          width: maxX - minX + 120,
          height: maxY - minY + 80
        },
        { isHorizontal: true }
      );
    }

    let laneSet = proc.laneSets?.[0];
    if (!laneSet) {
      laneSet = this.moddle.create('bpmn:LaneSet', { id: this.newId('LaneSet') });
      laneSet.$parent = proc;
      proc.get('laneSets').push(laneSet);
    }
    const lane = this.moddle.create('bpmn:Lane', {
      id: this.newId('Lane'),
      ...(args.name ? { name: args.name } : {})
    });
    lane.$parent = laneSet;
    laneSet.get('lanes').push(lane);

    const pb = this.boundsOf(participant.id);
    const existing = (laneSet.lanes || []).filter((l: any) => l !== lane && this.diShape(l.id));
    if (!existing.length) {
      // first lane fills the pool body
      this.addDiShape(
        lane,
        { x: pb.x + 30, y: pb.y, width: pb.width - 30, height: pb.height },
        { isHorizontal: true }
      );
    } else {
      // new band below; the pool grows
      const laneHeight = 160;
      const pShape = this.diShape(participant.id);
      pShape.bounds.height += laneHeight;
      this.addDiShape(
        lane,
        {
          x: pb.x + 30,
          y: pb.y + pb.height,
          width: pb.width - 30,
          height: laneHeight
        },
        { isHorizontal: true }
      );
    }
    return { id: lane.id };
  }

  moveToLane(args: { id: string; laneId: string }) {
    const bo = this.findBo(args.id);
    const lane = this.findBo(args.laneId);
    if (lane.$type !== 'bpmn:Lane') throw new Error(`${args.laneId} is not a lane`);
    for (const ls of this.process?.laneSets || []) {
      for (const l of ls.lanes || []) {
        const refs = l.flowNodeRefs || [];
        const i = refs.indexOf(bo);
        if (i >= 0) refs.splice(i, 1);
      }
    }
    lane.get('flowNodeRefs').push(bo);
    const lb = this.boundsOf(lane.id);
    const sb = this.boundsOf(bo.id);
    this.moveShape(bo.id, sb.x, Math.round(lb.y + lb.height / 2 - sb.height / 2));
  }

  autoLayout() {
    const proc = this.process;
    if (!proc) return { moved: 0 };
    const nodes = (proc.flowElements || []).filter(
      (el: any) => el.$type !== 'bpmn:SequenceFlow' && !el.attachedToRef
    );
    const hasLanes = (proc.laneSets || []).some((ls: any) => (ls.lanes || []).length);
    const depth = new Map<string, number>();
    const queue: Array<[any, number]> = nodes
      .filter((n: any) => !(n.incoming || []).length)
      .map((n: any) => [n, 0]);
    while (queue.length) {
      const [bo, d] = queue.shift()!;
      if (depth.has(bo.id) && depth.get(bo.id)! >= d) continue;
      if (d > nodes.length) continue;
      depth.set(bo.id, d);
      for (const f of bo.outgoing || []) queue.push([f.targetRef, d + 1]);
    }
    const participant = this.collaboration?.participants?.find((p: any) => p.processRef === proc);
    const baseX = participant ? this.boundsOf(participant.id).x + 70 : 140;
    const baseY = participant ? this.boundsOf(participant.id).y + 60 : 120;
    const rows = new Map<number, number>();
    let moved = 0;
    for (const bo of nodes) {
      const shape = this.diShape(bo.id);
      if (!shape) continue;
      const d = depth.get(bo.id) ?? 0;
      const row = rows.get(d) ?? 0;
      rows.set(d, row + 1);
      const targetX = baseX + d * 180;
      const targetY = hasLanes ? shape.bounds.y : baseY + row * 140;
      if (shape.bounds.x !== targetX || shape.bounds.y !== targetY) {
        this.moveShape(bo.id, targetX, targetY);
        moved += 1;
      }
    }
    for (const el of proc.flowElements || []) {
      if (el.$type === 'bpmn:SequenceFlow') this.reroute(el);
    }
    return { moved };
  }

  // -- logic & docs ----------------------------------------------------------

  setCondition(args: { flowId: string; expression?: string }) {
    const flow = this.findBo(args.flowId);
    if (flow.$type !== 'bpmn:SequenceFlow') throw new Error(`${args.flowId} is not a sequence flow`);
    if (args.expression) {
      const expr = this.moddle.create('bpmn:FormalExpression', {
        body: args.expression,
        language: 'text/javascript'
      });
      expr.$parent = flow;
      flow.conditionExpression = expr;
    } else {
      flow.conditionExpression = undefined;
    }
  }

  setDefaultFlow(args: { gatewayId: string; flowId?: string }) {
    const gateway = this.findBo(args.gatewayId);
    if (!args.flowId) {
      gateway.default = undefined;
      return;
    }
    const flow = this.findBo(args.flowId);
    if (flow.sourceRef !== gateway) throw new Error(`${args.flowId} does not leave ${args.gatewayId}`);
    gateway.default = flow;
  }

  setScript(args: { scriptTaskId: string; code: string }) {
    const bo = this.findBo(args.scriptTaskId);
    if (bo.$type !== 'bpmn:ScriptTask') throw new Error(`${args.scriptTaskId} is not a bpmn:ScriptTask`);
    bo.script = args.code;
    bo.scriptFormat = 'text/javascript';
  }

  setDocumentation(args: { id: string; text: string }) {
    const bo = this.findBo(args.id);
    if (args.text) {
      const doc = this.moddle.create('bpmn:Documentation', { text: args.text });
      doc.$parent = bo;
      bo.documentation = [doc];
    } else {
      bo.documentation = [];
    }
  }

  private setExtension(bo: any, name: string, make: ((m: any) => any) | null) {
    const keep = (bo.extensionElements?.values || []).filter(
      (v: any) => localName(v.$type).toLowerCase() !== name
    );
    const values = make ? [...keep, make(this.moddle)] : keep;
    if (!values.length) {
      bo.extensionElements = undefined;
      return;
    }
    const ext = this.moddle.create('bpmn:ExtensionElements', { values });
    ext.$parent = bo;
    for (const v of values) v.$parent = ext;
    bo.extensionElements = ext;
  }

  setMock(args: { taskId: string; code?: string }) {
    const bo = this.findBo(args.taskId);
    this.setExtension(bo, 'mock', args.code ? (m) => m.create('bsf:Mock', { body: args.code }) : null);
  }

  setBinding(args: { taskId: string; type?: string; properties?: Array<{ name: string; value: string }> }) {
    const bo = this.findBo(args.taskId);
    this.setExtension(
      bo,
      'binding',
      args.type
        ? (m) => {
            const props = (args.properties || []).map((p) => m.create('bsf:Property', p));
            const binding = m.create('bsf:Binding', { type: args.type, properties: props });
            for (const p of props) p.$parent = binding;
            return binding;
          }
        : null
    );
  }

  /** Scenarios/tests accumulate on the process; same-name entries are replaced. */
  private addProcessExtension(kind: 'scenario' | 'test', props: Record<string, unknown>) {
    const proc = this.process;
    if (!proc) throw new Error('no process in the document');
    const values = (proc.extensionElements?.values || []).filter(
      (v: any) => !(localName(v.$type).toLowerCase() === kind && v.name === props.name)
    );
    const created = this.moddle.create(kind === 'test' ? 'bsf:Test' : 'bsf:Scenario', props);
    values.push(created);
    const ext = this.moddle.create('bpmn:ExtensionElements', { values });
    ext.$parent = proc;
    for (const v of values) v.$parent = ext;
    proc.extensionElements = ext;
  }

  defineScenario(args: { name: string; payload: string | object; description?: string }) {
    const payload = typeof args.payload === 'string' ? args.payload : JSON.stringify(args.payload);
    JSON.parse(payload);
    this.addProcessExtension('scenario', {
      name: args.name,
      payload,
      ...(args.description ? { description: args.description } : {})
    });
  }

  addTest(args: { name: string; payload: string | object; script: string }) {
    const payload = typeof args.payload === 'string' ? args.payload : JSON.stringify(args.payload);
    JSON.parse(payload);
    this.addProcessExtension('test', { name: args.name, payload, body: args.script });
  }

  // -- model reading ---------------------------------------------------------

  private elementSummary(bo: any) {
    const summary: Record<string, unknown> = {
      id: bo.id,
      type: localName(bo.$type),
      name: bo.name || ''
    };
    if (bo.documentation?.length) summary.hasDocumentation = true;
    if (bo.script) summary.hasScript = true;
    if (extensionBody(bo, 'mock') !== undefined) summary.hasMock = true;
    const binding = extensions(bo, 'binding')[0];
    if (binding) summary.binding = binding.type;
    if (bo.default) summary.defaultFlow = bo.default.id;
    if (bo.loopCharacteristics) summary.multiInstance = true;
    if (bo.eventDefinitions?.length) {
      summary.eventDefinition = localName(bo.eventDefinitions[0].$type).replace('EventDefinition', '');
    }
    if (bo.attachedToRef) summary.attachedTo = bo.attachedToRef.id;
    return summary;
  }

  modelSummary() {
    const proc = this.process;
    if (!proc) return { processId: null, elements: [], flows: [], lanes: [], scenarios: [], tests: [] };
    const elements: unknown[] = [];
    const flows: unknown[] = [];
    const walk = (container: any, parentId: string | null) => {
      for (const el of container.flowElements || []) {
        if (el.$type === 'bpmn:SequenceFlow') {
          flows.push({
            id: el.id,
            name: el.name || '',
            source: el.sourceRef?.id,
            target: el.targetRef?.id,
            ...(el.conditionExpression?.body
              ? { condition: el.conditionExpression.body.trim() }
              : {}),
            ...(el.sourceRef?.default === el ? { default: true } : {})
          });
        } else {
          elements.push({ ...this.elementSummary(el), ...(parentId ? { parent: parentId } : {}) });
          if (el.flowElements) walk(el, el.id);
        }
      }
    };
    walk(proc, null);
    const lanes = (proc.laneSets || [])
      .flatMap((ls: any) => ls.lanes || [])
      .map((l: any) => ({
        id: l.id,
        name: l.name || '',
        elements: (l.flowNodeRefs || []).map((r: any) => r.id)
      }));
    return {
      processId: proc.id,
      name: this.docName,
      elements,
      flows,
      lanes,
      scenarios: this.scenarios().map((s) => s.name),
      tests: this.tests().map((t) => t.name)
    };
  }

  elementDetail(id: string) {
    const bo = this.findBo(id);
    const detail: Record<string, unknown> = this.elementSummary(bo);
    detail.documentation = (bo.documentation || []).map((d: any) => d.text).join('\n');
    if (bo.$type === 'bpmn:ScriptTask') {
      detail.script = typeof bo.script === 'string' ? bo.script : (bo.script?.body ?? '');
      detail.scriptFormat = bo.scriptFormat || '';
    }
    const mock = extensionBody(bo, 'mock');
    if (mock !== undefined) detail.mock = mock;
    const binding = extensions(bo, 'binding')[0];
    if (binding) {
      detail.binding = {
        type: binding.type,
        properties: (binding.properties || []).map((p: any) => ({ name: p.name, value: p.value }))
      };
    }
    if (bo.incoming?.length) detail.incoming = bo.incoming.map((f: any) => f.id);
    if (bo.outgoing?.length) detail.outgoing = bo.outgoing.map((f: any) => f.id);
    if (bo.conditionExpression?.body) detail.condition = bo.conditionExpression.body.trim();
    return detail;
  }

  // -- execution -------------------------------------------------------------

  scenarios(): Scenario[] {
    return collectScenarios(this.definitions, this.process);
  }

  tests() {
    return collectTests(this.definitions, this.process);
  }

  private scenarioPayload(name?: string): Record<string, unknown> {
    if (!name) return this.scenarios()[0]?.payload ?? {};
    const s = this.scenarios().find((sc) => sc.name === name);
    if (!s) throw new Error(`no scenario named "${name}"`);
    return s.payload;
  }

  startRun(opts: { scenario?: string; payload?: Record<string, unknown> } = {}) {
    const initial = opts.payload !== undefined ? opts.payload : this.scenarioPayload(opts.scenario);
    this.engine = new BsfEngine(this.definitions, this.process);
    this.engine.start(JSON.parse(JSON.stringify(initial)));
    this.runScenarioName = opts.scenario || this.scenarios()[0]?.name || 'ad-hoc';
    this.runVersion += 1;
    return this.engine.state;
  }

  stepRun() {
    if (!this.engine?.started) this.startRun();
    else this.engine.step();
    this.runVersion += 1;
    return this.engine!.state;
  }

  runToEnd(opts: { scenario?: string; payload?: Record<string, unknown> } = {}) {
    this.startRun(opts);
    this.engine!.runToEnd();
    this.runVersion += 1;
    return this.engine!.state;
  }

  resetRun() {
    this.engine = null;
    this.runScenarioName = '';
    this.runVersion += 1;
  }

  runAllTests(): TestResult[] {
    return runTests(this.definitions, this.process);
  }

  runState(): RunState | null {
    if (!this.engine) return null;
    const s = this.engine.state;
    return {
      scenario: this.runScenarioName,
      finished: s.finished,
      steps: s.steps,
      activeElements: this.engine.liveTokens().map((t) => t.at.id),
      results: s.results,
      errors: s.errors,
      trace: s.log
    };
  }
}

export const studio = new StudioStore();
