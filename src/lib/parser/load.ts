import type { BpmnFlowGraph } from '../types.js';
import { jsonToFlow, type BpmnJsonDocument } from './json.js';
import { parseBpmn } from './parse.js';
import { bpmnToFlow } from './transform.js';

/**
 * Loads a diagram definition in either supported format:
 *  - a BPMN 2.0 XML document (string starting with `<`), parsed via bpmn-moddle
 *  - a JSON diagram document (string starting with `{`, or the object itself)
 *
 * Both produce the same {@link BpmnFlowGraph}, so rendering and simulation
 * are format-agnostic.
 */
export async function loadDefinition(
  input: string | BpmnJsonDocument,
  options: { diagramId?: string } = {}
): Promise<BpmnFlowGraph> {
  if (typeof input !== 'string') {
    return jsonToFlow(input);
  }
  const trimmed = input.trimStart();
  if (trimmed.startsWith('{')) {
    return jsonToFlow(JSON.parse(input) as BpmnJsonDocument);
  }
  const { definitions, warnings } = await parseBpmn(input);
  const graph = bpmnToFlow(definitions, options);
  return { ...graph, warnings: [...warnings, ...graph.warnings] };
}
