/**
 * The WebMCP tool surface (see PRODUCT_BRIEF.md): semantic, not spatial;
 * every write returns { ok, issues } plus a compact summary so the agent
 * stays grounded in the live model; every mutation lands on the same undo
 * stack the human uses.
 */
import { studio } from './studio.svelte.js';

export interface StudioTool {
  name: string;
  description: string;
  input: Record<string, unknown>;
  required?: string[];
  run: (args: any) => unknown | Promise<unknown>;
}

function str(description: string) {
  return { type: 'string', description };
}

function num(description: string) {
  return { type: 'number', description };
}

function writeResult(extra: Record<string, unknown> = {}) {
  const summary = studio.modelSummary() as any;
  return {
    ok: true,
    ...extra,
    elements: summary.elements.length,
    flows: summary.flows.length,
    issues: studio.issues
  };
}

export const tools: StudioTool[] = [
  // -- read -----------------------------------------------------------------
  {
    name: 'get_model',
    description:
      'The whole model: elements (with doc/script/mock/binding flags), flows (with conditions and default markers), lanes, scenarios, tests, plus current validation issues.',
    input: {},
    run: () => ({ ...studio.modelSummary(), issues: studio.issues })
  },
  {
    name: 'get_element',
    description:
      'Full detail for one element: documentation, script or mock source, binding, condition, incoming/outgoing flows.',
    input: { id: str('element id') },
    required: ['id'],
    run: ({ id }: { id: string }) => studio.elementDetail(id)
  },
  {
    name: 'get_issues',
    description: 'Validation and portability findings for the current model.',
    input: {},
    run: () => ({ issues: studio.issues })
  },

  // -- build ----------------------------------------------------------------
  {
    name: 'add_element',
    description:
      'Add a flow node. type: task, userTask, serviceTask, scriptTask, sendTask, receiveTask, businessRuleTask, manualTask, callActivity, subProcess, exclusiveGateway, parallelGateway, inclusiveGateway, eventBasedGateway, startEvent, endEvent, intermediateCatchEvent, intermediateThrowEvent, boundaryEvent, textAnnotation. Pass afterElementId to auto-place it to the right and auto-connect with a sequence flow; attachToId attaches a boundaryEvent to an activity. eventDefinition (message|timer|error|signal|escalation|terminate|conditional|compensation) decorates events.',
    input: {
      type: str('element type'),
      name: str('display name'),
      afterElementId: str('place after and connect from this element'),
      attachToId: str('boundaryEvent host activity'),
      eventDefinition: str('event definition for event types'),
      x: num('explicit x (centre)'),
      y: num('explicit y (centre)')
    },
    required: ['type'],
    run: (args) => studio.mutate(() => studio.addElement(args)).then(writeResult)
  },
  {
    name: 'connect',
    description:
      'Connect two elements with a sequence flow (or a message flow across pools). Optional label names the flow.',
    input: {
      sourceId: str('source element id'),
      targetId: str('target element id'),
      label: str('flow label')
    },
    required: ['sourceId', 'targetId'],
    run: (args) => studio.mutate(() => studio.connect(args)).then(writeResult)
  },
  {
    name: 'update_element',
    description: 'Rename an element.',
    input: { id: str('element id'), name: str('new display name') },
    required: ['id'],
    run: (args) => studio.mutate(() => studio.updateElement(args)).then(() => writeResult())
  },
  {
    name: 'delete_element',
    description: 'Delete an element (its connections go with it). Undoable.',
    input: { id: str('element id') },
    required: ['id'],
    run: (args) => studio.mutate(() => studio.deleteElement(args)).then(() => writeResult())
  },
  {
    name: 'move_element',
    description: 'Move a shape to an absolute diagram position (top-left corner).',
    input: { id: str('element id'), x: num('x'), y: num('y') },
    required: ['id', 'x', 'y'],
    run: ({ id, x, y }) => studio.mutate(() => studio.moveShape(id, x, y)).then(() => writeResult())
  },
  {
    name: 'add_lane',
    description: 'Add a lane. Wraps the process in a pool (participant) first when none exists.',
    input: { name: str('lane name') },
    run: (args) => studio.mutate(() => studio.addLane(args)).then(writeResult)
  },
  {
    name: 'move_to_lane',
    description: 'Assign an element to a lane and move it into the lane band.',
    input: { id: str('element id'), laneId: str('target lane id') },
    required: ['id', 'laneId'],
    run: (args) => studio.mutate(() => studio.moveToLane(args)).then(() => writeResult())
  },
  {
    name: 'auto_layout',
    description:
      'Re-place the top-level flow nodes left-to-right by graph depth and re-route their connections.',
    input: {},
    run: () => studio.mutate(() => studio.autoLayout()).then(writeResult)
  },

  // -- logic & docs ---------------------------------------------------------
  {
    name: 'set_condition',
    description:
      'Set (or clear, with empty expression) the JavaScript conditionExpression on a sequence flow. The expression reads `payload`, e.g. payload.amount > 1000.',
    input: {
      flowId: str('sequence flow id'),
      expression: str('JavaScript boolean expression over payload')
    },
    required: ['flowId'],
    run: (args) => studio.mutate(() => studio.setCondition(args)).then(() => writeResult())
  },
  {
    name: 'set_default_flow',
    description: 'Mark one outgoing flow as the gateway default (taken when no condition matches).',
    input: { gatewayId: str('gateway id'), flowId: str('outgoing flow id; omit to clear') },
    required: ['gatewayId'],
    run: (args) => studio.mutate(() => studio.setDefaultFlow(args)).then(() => writeResult())
  },
  {
    name: 'set_script',
    description:
      'Set the JavaScript body of a bpmn:ScriptTask (scriptFormat text/javascript). The script mutates `payload`.',
    input: { scriptTaskId: str('script task id'), code: str('JavaScript body') },
    required: ['scriptTaskId', 'code'],
    run: (args) => studio.mutate(() => studio.setScript(args)).then(() => writeResult())
  },
  {
    name: 'set_mock',
    description:
      'Set (or clear, with empty code) the lunatic:mock browser stand-in on a service/send/user/rule task. The mock mutates `payload`; throw to exercise error boundaries.',
    input: { taskId: str('task id'), code: str('JavaScript body') },
    required: ['taskId'],
    run: (args) => studio.mutate(() => studio.setMock(args)).then(() => writeResult())
  },
  {
    name: 'set_binding',
    description:
      'Declare the real-world implementation intent (lunatic:binding) for a task: a type (http, kafka-producer, queue, decision, stream-consumer, manual, custom) plus name/value properties. Descriptive — feeds the binding inventory and per-engine export.',
    input: {
      taskId: str('task id'),
      type: str('binding type; omit to clear'),
      properties: {
        type: 'array',
        description: 'name/value pairs',
        items: {
          type: 'object',
          properties: { name: { type: 'string' }, value: { type: 'string' } },
          required: ['name', 'value']
        }
      }
    },
    required: ['taskId'],
    run: (args) => studio.mutate(() => studio.setBinding(args)).then(() => writeResult())
  },
  {
    name: 'set_documentation',
    description:
      'Set the bpmn:documentation text on any element — the human-readable business logic.',
    input: { id: str('element id'), text: str('documentation text') },
    required: ['id', 'text'],
    run: (args) => studio.mutate(() => studio.setDocumentation(args)).then(() => writeResult())
  },

  // -- execute & verify -----------------------------------------------------
  {
    name: 'define_scenario',
    description:
      'Add or replace a named lunatic:scenario (a JSON payload the process can be run with).',
    input: {
      name: str('scenario name'),
      payload: str('JSON payload'),
      description: str('what this scenario shows')
    },
    required: ['name', 'payload'],
    run: (args) => studio.mutate(() => studio.defineScenario(args)).then(() => writeResult())
  },
  {
    name: 'run_scenario',
    description:
      'Run a scenario (by name, or the first one; or pass an ad-hoc JSON payload) to completion in the browser engine. Returns the full trace, end-event results, and errors. The canvas shows the covered path.',
    input: { scenario: str('scenario name'), payload: str('ad-hoc JSON payload instead') },
    run: ({ scenario, payload }: { scenario?: string; payload?: string }) => {
      studio.runToEnd({ scenario, payload: payload ? JSON.parse(payload) : undefined });
      return { ok: true, ...studio.runState() };
    }
  },
  {
    name: 'step_scenario',
    description:
      'Advance the visible token one step (starts a run with the named scenario if none is active). Returns the run state after the step.',
    input: { scenario: str('scenario name for a fresh run') },
    run: ({ scenario }: { scenario?: string }) => {
      if (!studio.engine && scenario) studio.startRun({ scenario });
      else studio.stepRun();
      return { ok: true, ...studio.runState() };
    }
  },
  {
    name: 'reset_run',
    description: 'Clear the active run and its canvas highlighting.',
    input: {},
    run: () => {
      studio.resetRun();
      return { ok: true };
    }
  },
  {
    name: 'add_test',
    description:
      'Add or replace a lunatic:test: a JSON payload plus a JavaScript assertion body run after a fresh simulation, with `state` (visited/traversedEdges Sets, log, finished), `payloads` (end-event payloads), `payload` (= payloads[0]) and `assert`/`assert.equal`.',
    input: {
      name: str('test name'),
      payload: str('JSON payload'),
      script: str('JavaScript assertion body')
    },
    required: ['name', 'payload', 'script'],
    run: (args) => studio.mutate(() => studio.addTest(args)).then(() => writeResult())
  },
  {
    name: 'run_tests',
    description: 'Run every embedded lunatic:test (fresh engine per test). Returns per-test pass/fail.',
    input: {},
    run: () => {
      const results = studio.runAllTests();
      return { ok: results.every((r) => r.ok), results, issues: studio.issues };
    }
  },

  // -- workspace ------------------------------------------------------------
  {
    name: 'new_document',
    description: 'Start a fresh document (one start event) in the workspace.',
    input: { name: str('document name') },
    run: async ({ name }: { name?: string }) => {
      await studio.newDocument(name);
      return writeResult();
    }
  },
  {
    name: 'load_document',
    description: 'Load a complete BPMN 2.0 XML document into the canvas.',
    input: { xml: str('BPMN 2.0 XML'), name: str('document name') },
    required: ['xml'],
    run: async ({ xml, name }: { xml: string; name?: string }) => {
      const warnings = await studio.importXml(xml, name);
      return writeResult({ warnings });
    }
  },
  {
    name: 'export_document',
    description: 'The current model as standards-compliant BPMN 2.0 XML — the single artifact.',
    input: {},
    run: () => ({ ok: true, name: studio.docName, xml: studio.xml })
  },
  {
    name: 'list_documents',
    description: 'Documents saved in this browser workspace.',
    input: {},
    run: () => ({ documents: studio.listDocuments(), current: studio.docName })
  },
  {
    name: 'save_document',
    description: 'Save the current model into the browser workspace under a name.',
    input: { name: str('document name (default: current)') },
    run: ({ name }: { name?: string }) => ({ ok: true, saved: studio.saveDocument(name) })
  },
  {
    name: 'open_document',
    description: 'Open a document from the browser workspace.',
    input: { name: str('document name') },
    required: ['name'],
    run: async ({ name }: { name: string }) => {
      const warnings = await studio.openDocument(name);
      return writeResult({ warnings });
    }
  },
  {
    name: 'delete_document',
    description: 'Delete a document from the browser workspace.',
    input: { name: str('document name') },
    required: ['name'],
    run: ({ name }: { name: string }) => {
      studio.deleteDocument(name);
      return { ok: true, documents: studio.listDocuments() };
    }
  },
  {
    name: 'undo',
    description: 'Undo the last model mutation (shared human/agent undo stack).',
    input: {},
    run: async () => {
      await studio.undo();
      return writeResult();
    }
  }
];
