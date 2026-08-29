// @ts-expect-error - bpmn-moddle ships no type declarations
import BpmnModdle from 'bpmn-moddle';
const moddle = new BpmnModdle();
/**
 * Parses a BPMN 2.0 XML document into a bpmn-moddle definitions tree.
 * Supports the full BPMN 2.0 schema (semantic + DI).
 */
export async function parseBpmn(xml) {
    const { rootElement, warnings = [] } = await moddle.fromXML(xml);
    return {
        definitions: rootElement,
        warnings: warnings.map((w) => (typeof w === 'string' ? w : (w?.message ?? String(w))))
    };
}
