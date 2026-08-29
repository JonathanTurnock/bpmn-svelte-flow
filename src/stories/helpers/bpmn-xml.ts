/**
 * Helpers for building compact BPMN 2.0 XML documents in stories.
 */

/**
 * Wraps process/collaboration markup and DI markup into a complete
 * bpmn:Definitions document with all commonly used namespaces declared.
 */
export function bpmnDefinitions(semantic: string, di: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions
    xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
    xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
    xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
    xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:bsf="http://bpmn-svelte-flow/schema/1.0"
    id="Definitions_1"
    targetNamespace="http://bpmn.io/schema/bpmn">
${semantic}
  <bpmndi:BPMNDiagram id="Diagram_1">
    <bpmndi:BPMNPlane id="Plane_1" bpmnElement="${extractPlaneElement(semantic)}">
${di}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
}

/** Finds the id of the root process/collaboration/choreography for the plane. */
function extractPlaneElement(semantic: string): string {
  const match = semantic.match(
    /<bpmn:(?:collaboration|choreography|process)[^>]*\bid="([^"]+)"/
  );
  return match?.[1] ?? 'Process_1';
}

/** Shorthand for a BPMNShape DI entry. */
export function shape(
  element: string,
  x: number,
  y: number,
  width: number,
  height: number,
  extra: { expanded?: boolean; horizontal?: boolean; label?: [number, number, number, number] } = {}
): string {
  const attrs: string[] = [];
  if (extra.expanded !== undefined) attrs.push(`isExpanded="${extra.expanded}"`);
  if (extra.horizontal !== undefined) attrs.push(`isHorizontal="${extra.horizontal}"`);
  const label = extra.label
    ? `\n        <bpmndi:BPMNLabel><dc:Bounds x="${extra.label[0]}" y="${extra.label[1]}" width="${extra.label[2]}" height="${extra.label[3]}"/></bpmndi:BPMNLabel>`
    : '';
  return `      <bpmndi:BPMNShape id="${element}_di" bpmnElement="${element}" ${attrs.join(' ')}>
        <dc:Bounds x="${x}" y="${y}" width="${width}" height="${height}"/>${label}
      </bpmndi:BPMNShape>`;
}

/** Shorthand for a BPMNEdge DI entry. */
export function edge(
  element: string,
  waypoints: Array<[number, number]>,
  extra: { label?: [number, number, number, number] } = {}
): string {
  const points = waypoints
    .map(([x, y]) => `        <di:waypoint x="${x}" y="${y}"/>`)
    .join('\n');
  const label = extra.label
    ? `\n        <bpmndi:BPMNLabel><dc:Bounds x="${extra.label[0]}" y="${extra.label[1]}" width="${extra.label[2]}" height="${extra.label[3]}"/></bpmndi:BPMNLabel>`
    : '';
  return `      <bpmndi:BPMNEdge id="${element}_di" bpmnElement="${element}">
${points}${label}
      </bpmndi:BPMNEdge>`;
}
